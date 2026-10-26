// Consultas con refresco automático (+ reexporta toasts y formato para las pantallas de la app).
import { useCallback, useEffect, useRef, useState } from "react";
import { onDataChange } from "../data";

export { cop, dismissToast, toast, useToasts, type Toast, type ToastTone } from "./toast";

// ── Consultas ────────────────────────────────────────────────
/**
 * Pide datos y los vuelve a pedir cuando algo cambia (data.* avisa) o cada `pollMs`.
 * Mantiene los datos anteriores mientras recarga, así no parpadean los skeletons.
 */
export function useQuery<T>(key: string, load: () => Promise<T>, opts: { pollMs?: number } = {}) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(() => {
    let alive = true;
    loadRef.current().then(
      (d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      },
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setData(undefined);
    const cancel = run();
    const off = onDataChange(run);
    const poll = opts.pollMs ? setInterval(run, opts.pollMs) : undefined;
    return () => {
      cancel();
      off();
      clearInterval(poll);
    };
  }, [key, run, opts.pollMs]);

  return { data, error, loading: data === undefined && !error, reload: run };
}
