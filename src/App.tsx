import { LazyMotion, MotionConfig } from "motion/react";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Logo, Toasts } from "./components/ui";
import Landing from "./public/Landing";

// La portada va en el bundle inicial (sin un segundo viaje de red). Compatibilidad y app se cargan aparte.
const Compatibility = lazy(() => import("./public/Compatibility"));
const AppRoutes = lazy(() => import("./app/AppRoutes"));

const loadMotion = () => import("./lib/motionFeatures").then((r) => r.default);

const Fallback = () => (
  <div className="grid min-h-dvh place-items-center" aria-busy="true">
    <Logo />
  </div>
);

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotion} strict>
        <BrowserRouter>
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route index element={<Landing />} />
              <Route path="compatibilidad" element={<Compatibility />} />
              <Route path="app/*" element={<AppRoutes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Toasts />
        </BrowserRouter>
      </LazyMotion>
    </MotionConfig>
  );
}
