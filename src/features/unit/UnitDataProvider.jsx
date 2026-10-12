import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useTelemetry } from "@/features/telemetry/telemetry-context";
import { useNow } from "@/hooks/useNow";
import {
  STALE_AFTER_MS,
  genderLabel,
  hasVentilatorData,
  mergeObservations,
  observationTime,
  patientName,
  sortAlerts,
  vitalsFromObservation,
} from "@/lib/clinical";
import { parseHms } from "@/lib/format";
import { vexosApi } from "@/services/vexos-api";
import { UnitDataContext } from "./unit-context";

// The vitals endpoint returns rows inside a look-back window (minutes). The board only
// needs the latest row, so look back far enough to still show last-known state of stale beds.
const BOARD_LOOKBACK_MINUTES = 60 * 24 * 30;
const POLL_MS = 30_000;
const FLUSH_MS = 1_000;
const EWS_REFRESH_MS = 30_000;

const EMPTY_PATIENT = { vitals: [], ventilator: [], anesthesia: [], ews: null, loaded: false };

const initialState = {
  status: "loading", // "loading" | "ready" | "error"
  error: null,
  hospital: null,
  analytics: null,
  beds: [],
  alerts: [],
  patients: {}, // mrn -> { vitals, ventilator, anesthesia, ews, loaded }
  acknowledgedCount: 0,
  lastSyncedAt: null,
};

function withPatient(state, mrn, update) {
  const current = state.patients[mrn] ?? EMPTY_PATIENT;
  return { ...state, patients: { ...state.patients, [mrn]: update(current) } };
}

function reducer(state, action) {
  switch (action.type) {
    case "synced": {
      const next = { ...state, status: "ready", error: null, lastSyncedAt: Date.now() };
      if (action.beds) next.beds = action.beds;
      if (action.alerts) next.alerts = action.alerts.filter((alert) => !alert.acknowledged);
      if (action.hospital) next.hospital = action.hospital;
      if (action.analytics) next.analytics = action.analytics;
      return next;
    }
    case "failed":
      return state.status === "ready" ? state : { ...state, status: "error", error: action.error };
    case "patientData":
      return withPatient(state, action.mrn, (patient) => ({
        ...patient,
        loaded: patient.loaded || action.ews !== undefined,
        vitals: action.vitals ? mergeObservations(patient.vitals, action.vitals) : patient.vitals,
        ventilator: action.ventilator ? mergeObservations(patient.ventilator, action.ventilator) : patient.ventilator,
        anesthesia: action.anesthesia ? mergeObservations(patient.anesthesia, action.anesthesia) : patient.anesthesia,
        ews: action.ews !== undefined ? action.ews : patient.ews,
      }));
    case "telemetry": {
      let next = state;
      const mrnByBed = Object.fromEntries(
        state.beds.filter((bed) => bed.patient?.mrn).map((bed) => [bed.bed_id, bed.patient.mrn])
      );
      for (const event of action.events) {
        if (event.kind === "alert") {
          const alert = event.data;
          const others = next.alerts.filter((item) => item.alert_id !== alert.alert_id);
          next = { ...next, alerts: alert.acknowledged ? others : [...others, alert] };
          continue;
        }
        const mrn = event.mrn ?? mrnByBed[event.bedId];
        if (!mrn) continue;
        const row = event.data.timestamp ? event.data : { ...event.data, timestamp: new Date().toISOString() };
        next = withPatient(next, mrn, (patient) => ({
          ...patient,
          [event.kind]: mergeObservations(patient[event.kind], [row]),
        }));
      }
      return next;
    }
    case "alertAcknowledged":
      return {
        ...state,
        alerts: state.alerts.filter((alert) => alert.alert_id !== action.alertId),
        acknowledgedCount: state.acknowledgedCount + 1,
      };
    default:
      return state;
  }
}

function settledValue(result, fallback = null) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function asRows(value) {
  if (Array.isArray(value)) return value;
  return value && observationTime(value) != null ? [value] : [];
}

// Loads the unit (beds, alerts, per-patient telemetry) once for the clinical shell,
// keeps it fresh by polling, and merges live WebSocket packets as they arrive.
export function UnitDataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const telemetry = useTelemetry();
  const now = useNow(30_000);
  const bufferRef = useRef([]);
  const ewsFetchedAtRef = useRef({});
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // What the board needs per bed. Anaesthesia data is fetched on demand by loadPatientDetail.
  const loadPatient = useCallback(async (mrn) => {
    const [vitals, ventilator, ews] = await Promise.allSettled([
      vexosApi.getPatientVitals(mrn, BOARD_LOOKBACK_MINUTES),
      vexosApi.getPatientVentilator(mrn),
      vexosApi.getPatientEWS(mrn),
    ]);
    ewsFetchedAtRef.current[mrn] = Date.now();
    dispatch({
      type: "patientData",
      mrn,
      vitals: asRows(settledValue(vitals, [])),
      ventilator: asRows(settledValue(ventilator)),
      ews: settledValue(ews),
    });
  }, []);

  const refreshEws = useCallback(async (mrn) => {
    ewsFetchedAtRef.current[mrn] = Date.now();
    try {
      dispatch({ type: "patientData", mrn, ews: await vexosApi.getPatientEWS(mrn) });
    } catch {
      // keep the previous score
    }
  }, []);

  // Beds, alerts and analytics. `withPatients` also reloads every patient's telemetry
  // (first load, and the polling fallback while the live stream is down).
  const sync = useCallback(
    async ({ withPatients = false, includeHospital = false } = {}) => {
      const [beds, alerts, analytics, hospital] = await Promise.allSettled([
        vexosApi.getBeds(),
        vexosApi.getActiveAlerts(),
        vexosApi.getAnalyticsSummary(),
        includeHospital ? vexosApi.getHospitalInfo() : Promise.resolve(null),
      ]);
      if (beds.status === "rejected") {
        dispatch({ type: "failed", error: beds.reason });
        return;
      }
      const bedList = Array.isArray(beds.value) ? beds.value : [];
      dispatch({
        type: "synced",
        beds: bedList,
        alerts: Array.isArray(settledValue(alerts)) ? alerts.value : null,
        analytics: settledValue(analytics),
        hospital: settledValue(hospital),
      });

      const known = stateRef.current.patients;
      const mrns = bedList.filter((bed) => bed.is_occupied && bed.patient?.mrn).map((bed) => bed.patient.mrn);
      await Promise.all(mrns.filter((mrn) => withPatients || !known[mrn]?.loaded).map((mrn) => loadPatient(mrn)));
    },
    [loadPatient]
  );

  useEffect(() => {
    sync({ withPatients: true, includeHospital: true });
  }, [sync]);

  const isLive = telemetry?.isConnected ?? false;
  useEffect(() => {
    const timer = setInterval(() => sync({ withPatients: !isLive }), POLL_MS);
    return () => clearInterval(timer);
  }, [sync, isLive]);

  // Buffer live packets and apply them once per second so a busy feed doesn't re-render per packet.
  useEffect(() => {
    if (!telemetry) return undefined;
    const unsubscribe = telemetry.subscribe((events) => bufferRef.current.push(...events));
    const timer = setInterval(() => {
      if (!bufferRef.current.length) return;
      const events = bufferRef.current;
      bufferRef.current = [];
      dispatch({ type: "telemetry", events });

      const mrnByBed = Object.fromEntries(
        stateRef.current.beds.filter((bed) => bed.patient?.mrn).map((bed) => [bed.bed_id, bed.patient.mrn])
      );
      const updated = new Set(
        events.filter((event) => event.kind === "vitals").map((event) => event.mrn ?? mrnByBed[event.bedId])
      );
      for (const mrn of updated) {
        if (mrn && Date.now() - (ewsFetchedAtRef.current[mrn] ?? 0) > EWS_REFRESH_MS) refreshEws(mrn);
      }
    }, FLUSH_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [telemetry, refreshEws]);

  // Vitals series for a look-back window plus anaesthesia-machine data (flowsheet, trends).
  const loadPatientDetail = useCallback(async (mrn, minutes) => {
    const [vitals, anesthesia] = await Promise.allSettled([
      vexosApi.getPatientVitals(mrn, minutes),
      vexosApi.getPatientAnesthesia(mrn),
    ]);
    dispatch({
      type: "patientData",
      mrn,
      vitals: asRows(settledValue(vitals, [])),
      anesthesia: asRows(settledValue(anesthesia)),
    });
  }, []);

  const acknowledgeAlert = useCallback(async (alertId) => {
    await vexosApi.acknowledgeAlert(alertId);
    dispatch({ type: "alertAcknowledged", alertId });
  }, []);

  const assignBed = useCallback(
    async (bedId, payload) => {
      await vexosApi.assignBed(bedId, payload);
      await sync();
    },
    [sync]
  );

  const unitBeds = useMemo(
    () =>
      state.beds
        .map((bed) => {
          const mrn = bed.is_occupied ? bed.patient?.mrn ?? null : null;
          const patient = (mrn && state.patients[mrn]) || EMPTY_PATIENT;
          const latestVitals = patient.vitals.at(-1);
          const ventilator = patient.ventilator.at(-1) ?? null;
          const lastDataAt = Math.max(
            observationTime(latestVitals) ?? 0,
            observationTime(ventilator) ?? 0,
            observationTime(patient.anesthesia.at(-1)) ?? 0
          ) || null;
          return {
            id: bed.bed_id,
            raw: bed,
            occupied: Boolean(mrn),
            mrn,
            name: patientName(bed.patient),
            gender: genderLabel(bed.patient?.gender),
            admittedAt: bed.admitted_at ?? null,
            lengthOfStayMs: parseHms(bed.length_of_stay),
            deviceVendor: bed.device_vendor ?? null,
            vitals: vitalsFromObservation(latestVitals),
            ventilator,
            onVentilator: hasVentilatorData(ventilator),
            ews: patient.ews?.news2_score ?? null,
            ewsDetail: patient.ews,
            lastDataAt,
            isStale: Boolean(mrn) && (lastDataAt == null || now - lastDataAt > STALE_AFTER_MS),
            isLoading: Boolean(mrn) && !patient.loaded,
            alerts: state.alerts.filter((alert) => alert.bed_id === bed.bed_id),
          };
        })
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
    [state.beds, state.patients, state.alerts, now]
  );

  const value = useMemo(
    () => ({
      status: state.status,
      error: state.error,
      hospital: state.hospital,
      analytics: state.analytics,
      alerts: sortAlerts(state.alerts),
      acknowledgedCount: state.acknowledgedCount,
      lastSyncedAt: state.lastSyncedAt,
      patients: state.patients,
      beds: unitBeds,
      reload: () => sync({ withPatients: true, includeHospital: true }),
      loadPatientDetail,
      acknowledgeAlert,
      assignBed,
    }),
    [state, unitBeds, sync, loadPatientDetail, acknowledgeAlert, assignBed]
  );

  return <UnitDataContext.Provider value={value}>{children}</UnitDataContext.Provider>;
}
