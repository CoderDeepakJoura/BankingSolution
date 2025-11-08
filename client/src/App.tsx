import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "./redux";
import commonservice from "./services/common/commonservice";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard, Login } from "./pages";
import AccountsModule from "./components/AccountMasters/AccountsOperations";
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
import MemberOperations from "./pages/member/member-operations";
import MemberData from "./pages/member/member-data";
import RelationOperations from "./pages/Miscalleneous/relation/relation-operations";
import RelationData from "./pages/Miscalleneous/relation/relation-data";
import RelationMaster from "./pages/Miscalleneous/relation/relation-master";
import GeneralAccMaster from "./pages/accountMasters/generalAccountMaster/generalAccount-master";
import GeneralAccMasterData from "./pages/accountMasters/generalAccountMaster/generalAccount-data";
import StateMaster from "./pages/location/state/state-master";
import StateOperations from "./pages/location/state/state-operations";
import StateData from "./pages/location/state/state-data";
import CasteMaster from "./pages/Miscalleneous/caste/caste-master";
import CasteOperations from "./pages/Miscalleneous/caste/caste-operations";
import CasteData from "./pages/Miscalleneous/caste/caste-data";
import OccupationMaster from "./pages/Miscalleneous/occupation/occupation-master";
import OccupationOperations from "./pages/Miscalleneous/occupation/occupation-operations";
import OccupationData from "./pages/Miscalleneous/occupation/occupation-data";
import SettingsMaster from "./pages/settings/settings-master";
import PatwarMaster from "./pages/location/patwar/patwar-master";
import PatwarOperations from "./pages/location/patwar/patwar-operations";
import PatwarData from "./pages/location/patwar/patwar-data";
import ProductsModule from "./components/ProductMasters/ProductOperations";
import FDProduct from "./pages/products/FD/fdproduct-master";
import FDProductOperations from "./pages/products/FD/fdproduct-operations";
import FDProductData from "./pages/products/FD/fdproduct-data";
import SavingProduct from "./pages/products/Saving/savingproduct-master";
import SavingProductOperations from "./pages/products/Saving/savingproduct-operations";
import SavingProductData from "./pages/products/Saving/savingproduct-data";
import SavingProductBranchWiseRule from "./pages/branchwiserule/Saving/branchwiserule";
import FDProductBranchWiseRule from "./pages/branchwiserule/FD/branchwiserule";
import SavingProductInterestSlab from "./pages/InterestSlabs/Saving/savinginterestslab";
import SlabModule from "./components/InterestSlabs/SlabOperations";
import SavingSlabOperations from "./pages/InterestSlabs/Saving/slab-operations";
import SavingSlabData from "./pages/InterestSlabs/Saving/slab-data";
import SavingAccMaster from "./pages/accountMasters/Saving/saving-master";
import SavingAccOperations from "./pages/accountMasters/Saving/saving-operations";
import SavingAccData from "./pages/accountMasters/Saving/saving-data";

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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/account-operations" element={<AccountsModule />} />
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
        <Route
          path="/postOffice-operations"
          element={<PostOfficeOperations />}
        />
        <Route path="/postOffice" element={<PostOfficeMaster />} />
        <Route path="/postOffice-info" element={<PostOfficeData />} />
        <Route path="/category-operations" element={<CategoryOperations />} />
        <Route path="/category" element={<CategoryMaster />} />
        <Route path="/category-info" element={<CategoryData />} />
        <Route path="/village-operations" element={<VillageOperations />} />
        <Route path="/village" element={<VillageMaster />} />
        <Route path="/village-info" element={<VillageData />} />
        <Route
          path="/accountheadtype-operations"
          element={<AccountHeadTypeOperations />}
        />
        <Route path="/accountheadtype" element={<AccountHeadTypeMaster />} />
        <Route path="/accountheadtype-info" element={<AccountHeadTypeData />} />
        <Route path="/workingdate" element={<WorkingDateMaster />} />
        <Route
          path="/accounthead-operations"
          element={<AccountHeadOperations />}
        />
        <Route path="/accounthead" element={<AccountHeadMaster />} />
        <Route path="/accounthead-info" element={<AccountHeadData />} />
        <Route path="/member" element={<MemberMaster />} />
        <Route path="/member/:memberId" element={<MemberMaster />} />
        <Route path="/member-operations" element={<MemberOperations />} />
        <Route path="/member-info" element={<MemberData />} />
        <Route path="/relation-operations" element={<RelationOperations />} />
        <Route path="/relation-info" element={<RelationData />} />
        <Route path="/relation" element={<RelationMaster />} />
        <Route path="/generalacc-master" element={<GeneralAccMaster />} />
        <Route
          path="/generalacc-master-info"
          element={<GeneralAccMasterData />}
        />
        <Route path="/state-operations" element={<StateOperations />} />
        <Route path="/state" element={<StateMaster />} />
        <Route path="/state-info" element={<StateData />} />
        <Route path="/caste-operations" element={<CasteOperations />} />
        <Route path="/caste" element={<CasteMaster />} />
        <Route path="/caste-info" element={<CasteData />} />
        <Route
          path="/occupation-operations"
          element={<OccupationOperations />}
        />
        <Route path="/occupation" element={<OccupationMaster />} />
        <Route path="/occupation-info" element={<OccupationData />} />
        <Route path="/settings" element={<SettingsMaster />} />
        <Route path="/patwar-operations" element={<PatwarOperations />} />
        <Route path="/patwar" element={<PatwarMaster />} />
        <Route path="/patwar-info" element={<PatwarData />} />
        <Route path="/product-operations" element={<ProductsModule />} />
        <Route path="/fd-product" element={<FDProduct />} />
        <Route path="/fd-product/:productId" element={<FDProduct />} />
        <Route path="/fdproduct-operations" element={<FDProductOperations />} />
        <Route path="/fdproduct-info" element={<FDProductData />} />
        <Route path="/saving-product" element={<SavingProduct />} />
        <Route path="/saving-product/:productId" element={<SavingProduct />} />
        <Route
          path="/savingproduct-operations"
          element={<SavingProductOperations />}
        />
        <Route path="/savingproduct-info" element={<SavingProductData />} />
        <Route
          path="/saving-productbranchwise-rule"
          element={<SavingProductBranchWiseRule />}
        />
        <Route
          path="/fd-productbranchwise-rule"
          element={<FDProductBranchWiseRule />}
        />
        <Route
          path="/savingproduct-interest-slab"
          element={<SavingProductInterestSlab />}
        />
        <Route path="/slab-operations" element={<SlabModule />} />
        <Route
          path="/savingproduct-interest-slab/:slabId"
          element={<SavingProductInterestSlab />}
        />
        <Route path="/saving-slab-info" element={<SavingSlabData />} />
        <Route
          path="/saving-slab-operations"
          element={<SavingSlabOperations />}
        />
        <Route path="/saving-acc-master" element={<SavingAccMaster />} />
        <Route path="/saving-acc-master/:accountId" element={<SavingAccMaster />} />
        <Route path="/saving-acc-operations" element={<SavingAccOperations />} />
        <Route path="/saving-acc-info" element={<SavingAccData />} />
      </Routes>
      
    </BrowserRouter>
  );
}
