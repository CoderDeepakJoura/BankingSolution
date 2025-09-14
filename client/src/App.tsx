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
import VillageMaster from "./pages/location/village/village-master";
import VillageOperations from "./pages/location/village/village-operations";
import VillageData from "./pages/location/village/village-data";
import AccountHeadTypeMaster from "./pages/accounthead/accountheadtype/accountheadtype-master";
import AccountHeadTypeOperations from "./pages/accounthead/accountheadtype/accountheadtype-operations";
import AccountHeadTypeData from "./pages/accounthead/accountheadtype/accountheadtype-data";
import WorkingDateMaster from "./pages/WorkingDate/WorkingDate";
import AccountHeadMaster from "./pages/accounthead/accounthead/accounthead-master";
import AccountHeadOperations from "./pages/accounthead/accounthead/accounthead-operations";
import AccountHeadData from "./pages/accounthead/accounthead/accounthead-data";
import MemberMaster from "./pages/member/member-master";
import RelationOperations from "./pages/Miscalleneous/relation/relation-operations";
import RelationData from "./pages/Miscalleneous/relation/relation-data";
import RelationMaster from "./pages/Miscalleneous/relation/relation-master";



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
        <Route path="/village-operations" element={<VillageOperations />} />
        <Route path="/village" element={<VillageMaster />} />
        <Route path="/village-info" element={<VillageData />} />
        <Route path="/accountheadtype-operations" element={<AccountHeadTypeOperations />} />
        <Route path="/accountheadtype" element={<AccountHeadTypeMaster />} />
        <Route path="/accountheadtype-info" element={<AccountHeadTypeData />} />
        <Route path="/workingdate" element={<WorkingDateMaster />} />
        <Route path="/accounthead-operations" element={<AccountHeadOperations />} />
        <Route path="/accounthead" element={<AccountHeadMaster />} />
        <Route path="/accounthead-info" element={<AccountHeadData />} />
        <Route path="/member" element={<MemberMaster />} />
        <Route path="/relation-operations" element={<RelationOperations />} />
        <Route path="/relation-info" element={<RelationData />} />
        <Route path="/relation" element={<RelationMaster />} />
      </Routes>
    </BrowserRouter>
  );
}
