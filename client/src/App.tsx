import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "./redux";
import commonservice from "./services/common/commonservice";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages";
import SessionExpired from "./pages/session-expired";
import { ROUTES } from "./routes/routeRegistry";
import { Monitor } from "lucide-react";

function DesktopOnly() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-6 text-center">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-10 max-w-sm w-full shadow-2xl border border-white/20">
        <div className="flex justify-center mb-5">
          <span className="bg-blue-500/20 rounded-full p-4">
            <Monitor className="w-10 h-10 text-blue-300" />
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Desktop Only</h1>
        <p className="text-blue-200 text-sm leading-relaxed">
          This application is designed for desktop use only. Please open it on a
          laptop or desktop computer for the best experience.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const user = useSelector((state: RootState) => state.user);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (user.workingdate) {
      commonservice.setWorkingDate(user.workingdate);
    }
  }, [user.workingdate]);

  if (isMobile) return <DesktopOnly />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/session-expired" element={<SessionExpired />} />
        {ROUTES.map((r) => (
          <Route
            key={r.path}
            path={r.path}
            element={r.suOnly && !user.isSu ? <Navigate to="/dashboard" replace /> : r.element}
          />
        ))}
      </Routes>
    </BrowserRouter>
  );
}
