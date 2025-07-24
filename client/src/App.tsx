import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard, Login } from './pages';
import AccountsModule from "./pages/AccountsOperations";
import ZoneMaster from "./pages/location/zone/zone";
import ZoneData from "./pages/location/zone/zone-data"; 
import SessionExpired from "./pages/session-expired";
import ZoneOperations from "./pages/ZoneOperations"; // Assuming this is the correct import path for ZoneOperations


export default function App() {
 return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/accountsoperations" element={<AccountsModule />} />
        <Route path="/zone" element={<ZoneMaster />} />
        <Route path="/session-expired" element={<SessionExpired />} />
        <Route path="/zone-operations" element={<ZoneOperations />} />
        <Route path="/zoneinfo" element={<ZoneData />} />
      </Routes>
    </BrowserRouter>
  );
}
