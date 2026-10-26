// Panel de administración (se carga aparte: alumnos y profesores no lo descargan)
import { Route, Routes } from "react-router";
import Announcements from "./Announcements";
import BookingsCalendar from "./BookingsCalendar";
import Dashboard from "./Dashboard";
import Payments from "./Payments";
import Reports from "./Reports";
import Schedule from "./Schedule";
import Users from "./Users";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="pagos" element={<Payments />} />
      <Route path="usuarios" element={<Users />} />
      <Route path="horarios" element={<Schedule />} />
      <Route path="reservas" element={<BookingsCalendar />} />
      <Route path="reportes" element={<Reports />} />
      <Route path="novedades" element={<Announcements />} />
    </Routes>
  );
}
