import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Loads data from an async function and reloads whenever `key` changes
// (e.g. the selected date range). While reloading, the previous data stays
// visible (`isRefetching`) so charts keep their frame instead of flashing a skeleton.
export function useAsyncData(fetcher, key) {
  const [state, setState] = useState({ data: null, error: null, isLoading: true });
  const [isRefetching, setIsRefetching] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  // Always call the latest fetcher without making it an effect dependency.
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (!cancelled) setIsRefetching(true);
        return fetcherRef.current();
      })
      .then((data) => {
        if (!cancelled) setState({ data, error: null, isLoading: false });
      })
      .catch((error) => {
        if (!cancelled) setState((previous) => ({ ...previous, error, isLoading: false }));
      })
      .finally(() => {
        if (!cancelled) setIsRefetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { ...state, isRefetching: isRefetching && !state.isLoading, reload };
}
