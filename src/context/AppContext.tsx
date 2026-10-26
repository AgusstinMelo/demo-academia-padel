// Sesión, sede activa, reloj de la demo y tema de la app.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { data, onDataChange, type Role, type Session } from "../data";

type Theme = "dark" | "light";

interface AppValue {
  session: Session | null;
  ready: boolean;
  /** Hora actual de la demo (puede estar adelantada con «Simular paso del tiempo») */
  now: Date;
  signInAs: (role: Role) => Promise<Session>;
  signOut: () => Promise<void>;
  setClub: (id: string) => Promise<void>;
  theme: Theme;
  toggleTheme: () => void;
}

const Ctx = createContext<AppValue | null>(null);

const readTheme = (): Theme => {
  try {
    return localStorage.getItem("elite-padel:theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [theme, setTheme] = useState<Theme>(readTheme);

  const refresh = useCallback(async () => {
    const [s, n] = await Promise.all([data.getSession(), data.getNow()]);
    setSession(s);
    setNow(n);
  }, []);

  useEffect(() => {
    refresh().finally(() => setReady(true));
    const off = onDataChange(() => void refresh());
    const t = setInterval(() => void data.getNow().then(setNow), 30000);
    return () => {
      off();
      clearInterval(t);
    };
  }, [refresh]);

  const signInAs = useCallback(async (role: Role) => {
    const s = await data.signInAs(role);
    setSession(s);
    return s;
  }, []);
  const signOut = useCallback(async () => {
    await data.signOut();
    setSession(null);
  }, []);
  const setClub = useCallback(async (id: string) => {
    await data.setClub(id);
  }, []);
  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("elite-padel:theme", next);
      } catch {
        /* sin almacenamiento */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ session, ready, now, signInAs, signOut, setClub, theme, toggleTheme }), [session, ready, now, signInAs, signOut, setClub, theme, toggleTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp debe usarse dentro de <AppProvider>");
  return v;
}

/** Usuario de la sesión (las pantallas de la app solo se montan con sesión) */
export const useUser = () => useApp().session!.user;
