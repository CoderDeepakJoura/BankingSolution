import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "./redux";
import commonservice from "./services/common/commonservice";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Login } from "./pages";
import SessionExpired from "./pages/session-expired";
import { ROUTES } from "./routes/routeRegistry";

export default function App() {
  const user = useSelector((state: RootState) => state.user);

  // Set working date once when user data is available
  useEffect(() => {
    if (user.workingdate) {
      commonservice.setWorkingDate(user.workingdate);
    }
  }, [user.workingdate]);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/session-expired" element={<SessionExpired />} />
        {ROUTES.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>
    </BrowserRouter>
  );
}
