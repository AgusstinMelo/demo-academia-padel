// Rutas de la app (/app/*). Se cargan aparte de la web pública: quien solo mira la landing
// no descarga ni ejecuta la capa de datos.
import { lazy, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import { AppProvider, useApp } from "../context/AppContext";
import type { Role } from "../data";
import { AppLayout, homeFor } from "./AppLayout";
import { Login } from "./Login";
import { Notifications } from "./shared/Notifications";
import { Settings } from "./shared/Settings";
import { Book } from "./student/Book";
import { MyBookings } from "./student/MyBookings";
import { Packs } from "./student/Packs";
import { StudentHome } from "./student/StudentHome";

// Paneles de profesor y admin: el alumno no los descarga
const CoachAgenda = lazy(() => import("./coach/CoachAgenda"));
const AdminRoutes = lazy(() => import("./admin/AdminRoutes"));

/** Solo deja pasar al rol indicado; si no, lo manda a su inicio */
function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useApp();
  if (session && session.user.role !== role) return <Navigate to={homeFor(session.user.role)} replace />;
  return <>{children}</>;
}

function AppHome() {
  const { session, ready } = useApp();
  if (!ready) return null;
  return <Navigate to={session ? homeFor(session.user.role) : "/app/login"} replace />;
}

export default function AppRoutes() {
  return (
    <AppProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route index element={<AppHome />} />
          <Route path="alumno" element={<RoleGate role="student"><StudentHome /></RoleGate>} />
          <Route path="alumno/reservar" element={<RoleGate role="student"><Book /></RoleGate>} />
          <Route path="alumno/reservas" element={<RoleGate role="student"><MyBookings /></RoleGate>} />
          <Route path="alumno/packs" element={<RoleGate role="student"><Packs /></RoleGate>} />
          <Route path="profesor" element={<RoleGate role="coach"><CoachAgenda /></RoleGate>} />
          <Route path="admin/*" element={<RoleGate role="admin"><AdminRoutes /></RoleGate>} />
          <Route path="notificaciones" element={<Notifications />} />
          <Route path="ajustes" element={<Settings />} />
          <Route path="*" element={<AppHome />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
