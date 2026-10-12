import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Panel, PanelHeader } from "@/components/common/Panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { vexosApi } from "@/services/vexos-api";
import { SOURCE_FIELDS, SOURCE_TYPES } from "../lib/hl7";

function SecretInput({ id, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        className="pr-9 font-mono text-xs"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Hide value" : "Show value"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

// Where the server pulls HL7 messages from. Saving switches the live source (POST /hl7/source-config).
export function SourceConfigCard({ config, loading, onSaved }) {
  return (
    <Panel>
      <PanelHeader title="Source configuration" />
      {loading || !config ? (
        <div className="grid gap-3 p-4">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ) : (
        <SourceConfigForm key={JSON.stringify(config)} config={config} onSaved={onSaved} />
      )}
    </Panel>
  );
}

function SourceConfigForm({ config, onSaved }) {
  const [form, setForm] = useState(config);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const fields = SOURCE_FIELDS[form.type] ?? [];
  const changed = JSON.stringify(form) !== JSON.stringify(config);
  const incomplete = fields.some((field) => !String(form[field.key] ?? "").trim());

  const save = async () => {
    setSaving(true);
    try {
      const payload = { type: form.type, ...Object.fromEntries(fields.map((field) => [field.key, String(form[field.key]).trim()])) };
      await vexosApi.setHl7SourceConfig(payload);
      toast.success("HL7 source updated");
      setConfirming(false);
      onSaved?.();
    } catch (error) {
      toast.error(error.message || "Could not update the HL7 source");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="grid gap-3.5 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setConfirming(true);
      }}
    >
      <div className="grid gap-1.5">
        <Label>Source type</Label>
        <Select items={SOURCE_TYPES} value={form.type} onValueChange={(type) => setForm({ type })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {fields.map((field) => (
        <div key={field.key} className="grid gap-1.5">
          <Label htmlFor={`hl7-${field.key}`}>{field.label}</Label>
          {field.secret ? (
            <SecretInput
              id={`hl7-${field.key}`}
              value={form[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
            />
          ) : (
            <Input
              id={`hl7-${field.key}`}
              value={form[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
              className="font-mono text-xs"
            />
          )}
        </div>
      ))}

      {form.type === "local_file" && (
        <p className="text-xs text-muted-foreground">Reads the queue folder mounted on the server. No settings needed.</p>
      )}
      {(form.type === "sqs" || form.type === "rabbitmq") && (
        <p className="text-xs text-muted-foreground">
          The {form.type === "sqs" ? "SQS" : "RabbitMQ"} consumer starts when the server boots. Switching to it here takes
          effect after the next restart.
        </p>
      )}

      <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/85" disabled={!changed || incomplete}>
        Save configuration
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch the HL7 source?</AlertDialogTitle>
            <AlertDialogDescription>
              Live telemetry for every bed will come from the new source. The server checks that it is reachable before
              switching.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={save} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Switch source
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
