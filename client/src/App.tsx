import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard, Login } from './pages';
import AccountsModule from "./pages/AccountsOperations";
import ZoneMaster from "./pages/location/zone/zone-master";
import ZoneData from "./pages/location/zone/zone-data"; 
import SessionExpired from "./pages/session-expired";
import ZoneOperations from "./pages/location/zone/zone-operations"; // Assuming this is the correct import path for ZoneOperations
import ThanaMaster from "./pages/location/thana/thana-master";
import ThanaOperations from "./pages/location/thana/thana-operations";
import ThanaData from "./pages/location/thana/thana-data";
import TehsilMaster from "./pages/location/tehsil/tehsil-master";
import TehsilOperations from "./pages/location/tehsil/tehsil-operations";
import TehsilData from "./pages/location/tehsil/tehsil-data";
import PostOfficeMaster from "./pages/location/postOffice/postOffice-master";
import PostOfficeOperations from "./pages/location/postOffice/postOffice-operations";
import PostOfficeData from "./pages/location/postOffice/postOffice-data";
import CategoryMaster from "./pages/location/category/category-master";
import CategoryOperations from "./pages/location/category/category-operations";
import CategoryData from "./pages/location/category/category-data";




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
        <Route path="/thana-operations" element={<ThanaOperations />} />
        <Route path="/thana" element={<ThanaMaster />} />
        <Route path="/thana-info" element={<ThanaData />} />
        <Route path="/tehsil-operations" element={<TehsilOperations />} />
        <Route path="/tehsil" element={<TehsilMaster />} />
        <Route path="/tehsil-info" element={<TehsilData />} />
        <Route path="/postOffice-operations" element={<PostOfficeOperations />} />
        <Route path="/postOffice" element={<PostOfficeMaster />} />
        <Route path="/postOffice-info" element={<PostOfficeData />} />
        <Route path="/category-operations" element={<CategoryOperations />} />
        <Route path="/category" element={<CategoryMaster />} />
        <Route path="/category-info" element={<CategoryData />} />
      </Routes>
    </BrowserRouter>
  );
}
