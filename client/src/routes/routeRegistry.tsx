import React from "react";
import { Dashboard } from "../pages";
import AccountsModule from "../components/AccountMasters/AccountsOperations";
import ZoneOperations from "../pages/location/zone/zone-operations";
import ZoneMaster from "../pages/location/zone/zone-master";
import ZoneData from "../pages/location/zone/zone-data";
import ThanaOperations from "../pages/location/thana/thana-operations";
import ThanaMaster from "../pages/location/thana/thana-master";
import ThanaData from "../pages/location/thana/thana-data";
import TehsilOperations from "../pages/location/tehsil/tehsil-operations";
import TehsilMaster from "../pages/location/tehsil/tehsil-master";
import TehsilData from "../pages/location/tehsil/tehsil-data";
import PostOfficeOperations from "../pages/location/postOffice/postOffice-operations";
import PostOfficeMaster from "../pages/location/postOffice/postOffice-master";
import PostOfficeData from "../pages/location/postOffice/postOffice-data";
import CategoryOperations from "../pages/location/category/category-operations";
import CategoryMaster from "../pages/location/category/category-master";
import CategoryData from "../pages/location/category/category-data";
import VillageOperations from "../pages/location/village/village-operations";
import VillageMaster from "../pages/location/village/village-master";
import VillageData from "../pages/location/village/village-data";
import StateOperations from "../pages/location/state/state-operations";
import StateMaster from "../pages/location/state/state-master";
import StateData from "../pages/location/state/state-data";
import PatwarOperations from "../pages/location/patwar/patwar-operations";
import PatwarMaster from "../pages/location/patwar/patwar-master";
import PatwarData from "../pages/location/patwar/patwar-data";
import AccountHeadTypeOperations from "../pages/accounthead/accountheadtype/accountheadtype-operations";
import AccountHeadTypeMaster from "../pages/accounthead/accountheadtype/accountheadtype-master";
import AccountHeadTypeData from "../pages/accounthead/accountheadtype/accountheadtype-data";
import AccountHeadOperations from "../pages/accounthead/accounthead/accounthead-operations";
import AccountHeadMaster from "../pages/accounthead/accounthead/accounthead-master";
import AccountHeadData from "../pages/accounthead/accounthead/accounthead-data";
import MemberOperations from "../pages/member/member-operations";
import MemberMaster from "../pages/member/member-master";
import MemberData from "../pages/member/member-data";
import RelationOperations from "../pages/Miscalleneous/relation/relation-operations";
import RelationMaster from "../pages/Miscalleneous/relation/relation-master";
import RelationData from "../pages/Miscalleneous/relation/relation-data";
import CasteOperations from "../pages/Miscalleneous/caste/caste-operations";
import CasteMaster from "../pages/Miscalleneous/caste/caste-master";
import CasteData from "../pages/Miscalleneous/caste/caste-data";
import OccupationOperations from "../pages/Miscalleneous/occupation/occupation-operations";
import OccupationMaster from "../pages/Miscalleneous/occupation/occupation-master";
import OccupationData from "../pages/Miscalleneous/occupation/occupation-data";
import UserMasterData from "../pages/Miscalleneous/User/user-data";
import ChangeSessionPage from "../pages/Miscalleneous/ChangeSession";
import BranchMasterOperations from "../pages/branchmaster/branchmaster-operations";
import BranchMaster from "../pages/branchmaster/branchmaster";
import BranchMasterData from "../pages/branchmaster/branchmaster-data";
import SettingsMaster from "../pages/settings/settings-master";
import WorkingDateMaster from "../pages/WorkingDate/WorkingDate";
import GeneralAccMaster from "../pages/accountMasters/generalAccountMaster/generalAccount-master";
import GeneralAccMasterData from "../pages/accountMasters/generalAccountMaster/generalAccount-data";
import SavingAccOperations from "../pages/accountMasters/Saving/saving-operations";
import SavingAccMaster from "../pages/accountMasters/Saving/saving-master";
import SavingAccData from "../pages/accountMasters/Saving/saving-data";
import CloseSavingAccount from "../pages/accountMasters/Saving/close-saving-account";
import SavingInterestPosting from "../pages/accountMasters/Saving/SavingInterestPosting";
import FDAccOperations from "../pages/accountMasters/FD/fd-operations";
import FDAccMaster from "../pages/accountMasters/FD/fd-master";
import FDAccData from "../pages/accountMasters/FD/fd-data";
import FDInterestPosting from "../pages/accountMasters/FD/FDInterestPosting";
import RDAccOperations from "../pages/accountMasters/RD/rd-operations";
import RDAccountMaster from "../pages/accountMasters/RD/rd-master";
import RDAccData from "../pages/accountMasters/RD/rd-data";
import RDInterestPosting from "../pages/accountMasters/RD/RDInterestPosting";
import LoanAccOperations from "../pages/accountMasters/Loan/loan-operations";
import LoanAccMaster from "../pages/accountMasters/Loan/loan-master";
import LoanAccData from "../pages/accountMasters/Loan/loan-data";
import ProductsModule from "../components/ProductMasters/ProductOperations";
import FDProductOperations from "../pages/products/FD/fdproduct-operations";
import FDProduct from "../pages/products/FD/fdproduct-master";
import FDProductData from "../pages/products/FD/fdproduct-data";
import SavingProductOperations from "../pages/products/Saving/savingproduct-operations";
import SavingProduct from "../pages/products/Saving/savingproduct-master";
import SavingProductData from "../pages/products/Saving/savingproduct-data";
import RDProductOperations from "../pages/products/RD/rdproduct-operations";
import RDProduct from "../pages/products/RD/rdproduct-master";
import RDProductData from "../pages/products/RD/rdproduct-data";
import LoanProductOperations from "../pages/products/Loan/loanproduct-operations";
import LoanProduct from "../pages/products/Loan/loanproduct-master";
import LoanProductData from "../pages/products/Loan/loanproduct-data";
import SlabModule from "../components/InterestSlabs/SlabOperations";
import SavingSlabOperations from "../pages/InterestSlabs/Saving/slab-operations";
import SavingProductInterestSlab from "../pages/InterestSlabs/Saving/savinginterestslab";
import SavingSlabData from "../pages/InterestSlabs/Saving/slab-data";
import FDInterestSlabOperations from "../pages/InterestSlabs/FD/slab-operations";
import FDProductInterestSlab from "../pages/InterestSlabs/FD/fdinterestslab";
import FDInterestSlabData from "../pages/InterestSlabs/FD/slab-data";
import SlabOperationsRD from "../pages/InterestSlabs/RD/slab-operations";
import RDProductInterestSlab from "../pages/InterestSlabs/RD/rdslab";
import RDSlabData from "../pages/InterestSlabs/RD/slab-data";
import LoanSlabModule from "../pages/InterestSlabs/Loan/loanslab-operations";
import LoanInterestSlab from "../pages/InterestSlabs/Loan/loanslab";
import LoanSlabData from "../pages/InterestSlabs/Loan/loanslab-data";
import FDProductSlabOperations from "../components/Slabs/SlabOperations";
import SlabOperationsFD from "../pages/Slabs/FD/slab-operations";
import FDSlab from "../pages/Slabs/FD/fdslab";
import FDSlabData from "../pages/Slabs/FD/slab-data";
import SavingProductBranchWiseRule from "../pages/branchwiserule/Saving/branchwiserule";
import FDProductBranchWiseRule from "../pages/branchwiserule/FD/branchwiserule";
import RDProductBranchwiserule from "../pages/branchwiserule/RD/branchwiserule";
import LoanProductBranchWiseRule from "../pages/branchwiserule/Loan/branchwiserule";
import SavingDepositVoucher from "../pages/vouchers/saving/savingdeposit";
import SavingWithdrawalVoucher from "../pages/vouchers/saving/savingwithdrawal";
import VoucherModule from "../components/Vouchers/VoucherOperations";
import VoucherSearch from "../pages/vouchers/VoucherSearch";
import RDKistVoucher from "../pages/vouchers/RD/rdkist";
import RDMultipleKistVoucher from "../pages/vouchers/RD/rdmultiplekist";
import CashPaymentReceiptVoucher from "../pages/vouchers/Cash/cashvoucher";
import JournalTransferVoucher from "../pages/vouchers/Journal/jvoucher";
import LoanAdvancementVoucher from "../pages/vouchers/Loan/loanadvancement";
import LoanRecovery from "../pages/vouchers/Loan/loanrecovery";
import LoanInterestPostingVoucher from "../pages/vouchers/Loan/loaninterestposting";
import LoanExpensePage from "../pages/vouchers/LoanExpense/loanexpense";
import MatureFDPage from "../pages/FixedDeposit/MatureFD/mature-fd";
import PreMatureFDPage from "../pages/FixedDeposit/PreMatureFD/pre-mature";
import UnpledgeFDPage from "../pages/FixedDeposit/UnpledgeFD/unpledge-fd";
import MatureRDPage from "../pages/RecurringDeposit/mature-rd";
import PrematureRDPage from "../pages/RecurringDeposit/premature-rd";
import UnpledgeRDPage from "../pages/RecurringDeposit/UnpledgeRD/unpledge-rd";
import NPAPlanMasterOperations from "../pages/npa/npaplanmaster/npaplanmaster-operations";
import NPAPlanMasterPage from "../pages/npa/npaplanmaster/npaplanmaster-master";
import NPAPlanMasterCRUD from "../pages/npa/npaplanmaster/npaplanmaster-data";
import NPAPlanCategoryOperations from "../pages/npa/npaplancategory/npaplancategory-operations";
import NPAPlanCategoryPage from "../pages/npa/npaplancategory/npaplancategory-master";
import NPAPlanCategoryCRUD from "../pages/npa/npaplancategory/npaplancategory-data";
import ExpenseCategoryOperations from "../pages/loan/expensecategory/expensecategory-operations";
import ExpenseCategoryMaster from "../pages/loan/expensecategory/expensecategory-master";
import ExpenseCategoryData from "../pages/loan/expensecategory/expensecategory-data";
import TaxTypeOperations from "../pages/gst/taxtype/taxtype-operations";
import TaxTypeMaster from "../pages/gst/taxtype/taxtype-master";
import TaxTypeData from "../pages/gst/taxtype/taxtype-data";
import TaxGroupOperations from "../pages/gst/taxgroup/taxgroup-operations";
import TaxGroupMaster from "../pages/gst/taxgroup/taxgroup-master";
import TaxGroupData from "../pages/gst/taxgroup/taxgroup-data";
import TaxOperations from "../pages/gst/tax/tax-operations";
import TaxMaster from "../pages/gst/tax/tax-master";
import TaxData from "../pages/gst/tax/tax-data";
import BillBookOperations from "../pages/gst/billbook/billbook-operations";
import BillBookMaster from "../pages/gst/billbook/billbook-master";
import BillBookData from "../pages/gst/billbook/billbook-data";
import GSTSettings from "../pages/gst/gstsetting/gstsetting";
import ServiceOperations from "../pages/services/service/service-operations";
import ServiceMaster from "../pages/services/service/service-master";
import ServiceData from "../pages/services/service/service-data";
import AccService from "../pages/services/accservice/accservice";
import BFDTDSSetting from "../pages/BankFD/BFDTDSSetting";
import FDTDSSlabList from "../pages/BankFD/FDTDSSlabList";
import FDTDSSlabForm from "../pages/BankFD/FDTDSSlabForm";
import BankFDAccountTable from "../pages/BankFD/BankFDAccountTable";
import BankFDAccountForm from "../pages/BankFD/BankFDAccountForm";
import CRUDDashboard from "../components/Location/CRUDDashboard";
import OtherBranchAccounts from "../pages/interbranch/OtherBranchAccounts";
import IBPendingVouchers from "../pages/interbranch/IBPendingVouchers";
import IBIncomingVouchers from "../pages/interbranch/IBIncomingVouchers";
import DayBookPage from "../pages/reports/DayBook";
import CashBookPage from "../pages/reports/CashBook";
import SavingLedgerPage from "../pages/reports/SavingLedger";
import RDLedgerPage from "../pages/reports/RDLedger";
import LoanLedgerPage from "../pages/reports/LoanLedger";
import FDLedgerPage from "../pages/reports/FDLedger";
import ShareMoneyLedgerPage from "../pages/reports/ShareMoneyLedger";
import GeneralLedgerPage from "../pages/reports/GeneralLedger";
import BalanceSheetPage from "../pages/reports/BalanceSheet";
import ProfitLossPage from "../pages/reports/ProfitLoss";
import TrialBalancePage from "../pages/reports/TrialBalance";
import JournalBookPage from "../pages/reports/JournalBook";
import LoanNPAPage from "../pages/reports/LoanNPA";
import NpaLedgerPage from "../pages/reports/NpaLedger";
import LoanAdvancementReportPage from "../pages/reports/LoanAdvancement";
import LoanRecoveryReportPage from "../pages/reports/LoanRecovery";
import LoanDemandPage from "../pages/reports/LoanDemand";
import OdReservePage from "../pages/reports/OdReserve";
import LoanIntCertPage from "../pages/reports/LoanIntCert";
import FDMaturityPage from "../pages/reports/FDMaturity";
import FDOpeningPage from "../pages/reports/FDOpening";
import RDMaturityPage from "../pages/reports/RDMaturity";
import RDKistReceivePage from "../pages/reports/RDKistReceive";
import MemberReportPage from "../pages/reports/MemberReport";
import MemberAccountsPage from "../pages/reports/MemberAccounts";
import MemberIntCertPage from "../pages/reports/MemberIntCert";
import SeleniumAutomation from "../pages/seleniumautomation/automation";

export interface RouteEntry {
  path: string;
  element: React.ReactElement;
  /** Human-readable name shown in header search. Omit to hide from search. */
  label?: string;
  /** Search category. Required when label is set. */
  category?: string;
}

// ─── ROUTE REGISTRY ─────────────────────────────────────────────────────────
// Single source of truth for ALL app routes (except / and /session-expired).
// To add a new screen: add one entry here. It is automatically registered in
// the router AND appears in the header search (if label + category are set).
// ─────────────────────────────────────────────────────────────────────────────
export const ROUTES: RouteEntry[] = [

  // ── Main ──────────────────────────────────────────────────────────────────
  { path: "/dashboard",    element: <Dashboard />,    label: "Dashboard",    category: "Main" },
  { path: "/workingdate",  element: <WorkingDateMaster /> },
  { path: "/automate-data", element: <SeleniumAutomation /> },

  // ── Location Masters ──────────────────────────────────────────────────────
  { path: "/zone-operations",      element: <ZoneOperations />,      label: "Zone Master",         category: "Location Masters" },
  { path: "/zone",                 element: <ZoneMaster /> },
  { path: "/zoneinfo",             element: <ZoneData /> },

  { path: "/thana-operations",     element: <ThanaOperations />,     label: "Thana Master",        category: "Location Masters" },
  { path: "/thana",                element: <ThanaMaster /> },
  { path: "/thana-info",           element: <ThanaData /> },

  { path: "/tehsil-operations",    element: <TehsilOperations />,    label: "Tehsil Master",       category: "Location Masters" },
  { path: "/tehsil",               element: <TehsilMaster /> },
  { path: "/tehsil-info",          element: <TehsilData /> },

  { path: "/postOffice-operations", element: <PostOfficeOperations />, label: "Post Office Master", category: "Location Masters" },
  { path: "/postOffice",            element: <PostOfficeMaster /> },
  { path: "/postOffice-info",       element: <PostOfficeData /> },

  { path: "/category-operations",  element: <CategoryOperations />,  label: "Category Master",     category: "Location Masters" },
  { path: "/category",             element: <CategoryMaster /> },
  { path: "/category-info",        element: <CategoryData /> },

  { path: "/village-operations",   element: <VillageOperations />,   label: "Village Master",      category: "Location Masters" },
  { path: "/village",              element: <VillageMaster /> },
  { path: "/village-info",         element: <VillageData /> },

  { path: "/state-operations",     element: <StateOperations />,     label: "State Master",        category: "Location Masters" },
  { path: "/state",                element: <StateMaster /> },
  { path: "/state-info",           element: <StateData /> },

  { path: "/patwar-operations",    element: <PatwarOperations />,    label: "Patwar Master",       category: "Location Masters" },
  { path: "/patwar",               element: <PatwarMaster /> },
  { path: "/patwar-info",          element: <PatwarData /> },

  // ── Miscellaneous Masters ─────────────────────────────────────────────────
  { path: "/accountheadtype-operations", element: <AccountHeadTypeOperations />, label: "Account Head Type Master", category: "Miscellaneous Masters" },
  { path: "/accountheadtype",            element: <AccountHeadTypeMaster /> },
  { path: "/accountheadtype-info",       element: <AccountHeadTypeData /> },

  { path: "/accounthead-operations",     element: <AccountHeadOperations />,     label: "Account Head Master",      category: "Miscellaneous Masters" },
  { path: "/accounthead",                element: <AccountHeadMaster /> },
  { path: "/accounthead-info",           element: <AccountHeadData /> },

  { path: "/branchmaster-operations",    element: <BranchMasterOperations />,    label: "Branch Master",            category: "Miscellaneous Masters" },
  { path: "/branchmaster",               element: <BranchMaster /> },
  { path: "/branchmaster-info",          element: <BranchMasterData /> },

  { path: "/caste-operations",           element: <CasteOperations />,           label: "Caste Master",             category: "Miscellaneous Masters" },
  { path: "/caste",                      element: <CasteMaster /> },
  { path: "/caste-info",                 element: <CasteData /> },

  { path: "/occupation-operations",      element: <OccupationOperations />,      label: "Occupation Master",        category: "Miscellaneous Masters" },
  { path: "/occupation",                 element: <OccupationMaster /> },
  { path: "/occupation-info",            element: <OccupationData /> },

  { path: "/relation-operations",        element: <RelationOperations />,        label: "Relation Master",          category: "Miscellaneous Masters" },
  { path: "/relation",                   element: <RelationMaster /> },
  { path: "/relation-info",              element: <RelationData /> },

  { path: "/user-info",                  element: <UserMasterData />,            label: "User Master",              category: "Miscellaneous Masters" },
  { path: "/change-session",             element: <ChangeSessionPage />,         label: "Change Session / Working Date", category: "Miscellaneous Masters" },
  { path: "/settings",                   element: <SettingsMaster />,            label: "Settings Master",          category: "Masters" },

  // ── Masters (hubs) ────────────────────────────────────────────────────────
  { path: "/member-operations",          element: <MemberOperations />,          label: "Member Master",            category: "Masters" },
  { path: "/member",                     element: <MemberMaster /> },
  { path: "/member/:memberId",           element: <MemberMaster /> },
  { path: "/member-info",                element: <MemberData /> },

  { path: "/account-operations",         element: <AccountsModule />,            label: "Account Masters",          category: "Masters" },
  { path: "/product-operations",         element: <ProductsModule />,            label: "Product Masters",          category: "Masters" },
  { path: "/slab-operations",            element: <SlabModule />,               label: "Product Interest Slabs",   category: "Masters" },
  { path: "/fd-slab-operations",         element: <FDProductSlabOperations />,  label: "Product Slabs",            category: "Masters" },

  // ── Account Masters ───────────────────────────────────────────────────────
  { path: "/generalacc-master",          element: <GeneralAccMaster />,          label: "General Account Master",   category: "Account Masters" },
  { path: "/generalacc-master-info",     element: <GeneralAccMasterData /> },

  { path: "/saving-acc-operations",      element: <SavingAccOperations />,       label: "Saving Account Master",    category: "Account Masters" },
  { path: "/saving-acc-master",          element: <SavingAccMaster />,           label: "New Saving Account",       category: "Account Masters" },
  { path: "/saving-acc-master/:accountId", element: <SavingAccMaster /> },
  { path: "/saving-acc-info",            element: <SavingAccData /> },
  { path: "/close-saving-account",       element: <CloseSavingAccount />,        label: "Close Saving Account",     category: "Account Masters" },
  { path: "/saving-interest-posting",    element: <SavingInterestPosting />,     label: "Saving Interest Posting",  category: "Account Masters" },

  { path: "/fd-acc-operations",          element: <FDAccOperations />,           label: "FD Account Master",        category: "Account Masters" },
  { path: "/fd-acc-master",              element: <FDAccMaster />,               label: "New FD Account",           category: "Account Masters" },
  { path: "/fd-acc-master/:accountId",   element: <FDAccMaster /> },
  { path: "/fd-acc-info",                element: <FDAccData /> },
  { path: "/fd-interest-posting",        element: <FDInterestPosting isMIS={false} />, label: "FD Interest Posting",  category: "Account Masters" },
  { path: "/mis-interest-posting",       element: <FDInterestPosting isMIS={true} />,  label: "MIS Interest Posting", category: "Account Masters" },
  { path: "/mature-fd-account",          element: <MatureFDPage />,              label: "Mature FD Account",        category: "Account Masters" },
  { path: "/premature-fd-account",       element: <PreMatureFDPage />,           label: "Pre-Mature FD Account",    category: "Account Masters" },

  { path: "/rd-acc-operations",          element: <RDAccOperations />,           label: "RD Account Master",        category: "Account Masters" },
  { path: "/rd-acc-master",              element: <RDAccountMaster />,           label: "New RD Account",           category: "Account Masters" },
  { path: "/rd-acc-master/:accountId",   element: <RDAccountMaster /> },
  { path: "/rd-acc-info",                element: <RDAccData /> },
  { path: "/rd-interest-posting",        element: <RDInterestPosting />,         label: "RD Interest Posting",      category: "Account Masters" },
  { path: "/mature-rd-account",          element: <MatureRDPage />,              label: "Mature RD Account",        category: "Account Masters" },
  { path: "/premature-rd-account",       element: <PrematureRDPage />,           label: "Pre-Mature RD Account",    category: "Account Masters" },

  { path: "/loan-acc-operations",        element: <LoanAccOperations />,         label: "Loan Account Master",      category: "Account Masters" },
  { path: "/loan-acc-master",            element: <LoanAccMaster />,             label: "New Loan Account",         category: "Account Masters" },
  { path: "/loan-acc-master/:accountId", element: <LoanAccMaster /> },
  { path: "/loan-acc-info",              element: <LoanAccData /> },

  // ── Product Masters ───────────────────────────────────────────────────────
  { path: "/fdproduct-operations",       element: <FDProductOperations />,       label: "FD Product",               category: "Product Masters" },
  { path: "/fd-product",                 element: <FDProduct />,                 label: "New FD Product",           category: "Product Masters" },
  { path: "/fd-product/:productId",      element: <FDProduct /> },
  { path: "/fdproduct-info",             element: <FDProductData /> },

  { path: "/savingproduct-operations",   element: <SavingProductOperations />,   label: "Saving Product",           category: "Product Masters" },
  { path: "/saving-product",             element: <SavingProduct />,             label: "New Saving Product",       category: "Product Masters" },
  { path: "/saving-product/:productId",  element: <SavingProduct /> },
  { path: "/savingproduct-info",         element: <SavingProductData /> },

  { path: "/rdproduct-operations",       element: <RDProductOperations />,       label: "RD Product",               category: "Product Masters" },
  { path: "/rd-product",                 element: <RDProduct />,                 label: "New RD Product",           category: "Product Masters" },
  { path: "/rd-product/:productId",      element: <RDProduct /> },
  { path: "/rdproduct-info",             element: <RDProductData /> },

  { path: "/loanproduct-operations",     element: <LoanProductOperations />,     label: "Loan Product",             category: "Product Masters" },
  { path: "/loan-product",               element: <LoanProduct />,               label: "New Loan Product",         category: "Product Masters" },
  { path: "/loan-product/:productId",    element: <LoanProduct /> },
  { path: "/loanproduct-info",           element: <LoanProductData /> },

  // ── Interest Slabs ────────────────────────────────────────────────────────
  { path: "/saving-slab-operations",          element: <SavingSlabOperations />,      label: "Saving Interest Slabs",    category: "Interest Slabs" },
  { path: "/savingproduct-interest-slab",     element: <SavingProductInterestSlab />, label: "New Saving Interest Slab", category: "Interest Slabs" },
  { path: "/savingproduct-interest-slab/:slabId", element: <SavingProductInterestSlab /> },
  { path: "/saving-slab-info",                element: <SavingSlabData /> },

  { path: "/fd-interest-slab-operations",     element: <FDInterestSlabOperations />,  label: "FD Interest Slabs",        category: "Interest Slabs" },
  { path: "/fdproduct-interest-slab",         element: <FDProductInterestSlab />,     label: "New FD Interest Slab",     category: "Interest Slabs" },
  { path: "/fdproduct-interest-slab/:slabId", element: <FDProductInterestSlab /> },
  { path: "/fd-interest-slab-info",           element: <FDInterestSlabData /> },

  { path: "/rd-slab-operations",              element: <SlabOperationsRD />,          label: "RD Interest Slabs",        category: "Interest Slabs" },
  { path: "/rd-interest-slab",                element: <RDProductInterestSlab />,     label: "New RD Interest Slab",     category: "Interest Slabs" },
  { path: "/rd-interest-slab/:slabId",        element: <RDProductInterestSlab /> },
  { path: "/rd-slab-info",                    element: <RDSlabData /> },

  { path: "/loan-slab-operations",            element: <LoanSlabModule />,            label: "Loan Interest Slabs",      category: "Interest Slabs" },
  { path: "/loan-interest-slab",              element: <LoanInterestSlab />,          label: "New Loan Interest Slab",   category: "Interest Slabs" },
  { path: "/loan-interest-slab/:slabId",      element: <LoanInterestSlab /> },
  { path: "/loan-slab-info",                  element: <LoanSlabData /> },

  // ── Product Slabs (FD) ────────────────────────────────────────────────────
  { path: "/fd-product-slab-operations",      element: <SlabOperationsFD />,          label: "FD Product Slabs",         category: "Product Masters" },
  { path: "/fdproduct-slab",                  element: <FDSlab />,                    label: "New FD Product Slab",      category: "Product Masters" },
  { path: "/fdproduct-slab/:slabId",          element: <FDSlab /> },
  { path: "/fd-slab-info",                    element: <FDSlabData /> },

  // ── Branch Wise Rules ─────────────────────────────────────────────────────
  { path: "/saving-productbranchwise-rule",   element: <SavingProductBranchWiseRule />, label: "Saving Product BranchWise Rule", category: "Branch Wise Rules" },
  { path: "/fd-productbranchwise-rule",       element: <FDProductBranchWiseRule />,     label: "FD Product BranchWise Rule",     category: "Branch Wise Rules" },
  { path: "/rd-productbranchwise-rule",       element: <RDProductBranchwiserule />,     label: "RD Product BranchWise Rule",     category: "Branch Wise Rules" },
  { path: "/loan-productbranchwise-rule",     element: <LoanProductBranchWiseRule />,   label: "Loan Product BranchWise Rule",   category: "Branch Wise Rules" },

  // ── Vouchers ──────────────────────────────────────────────────────────────
  { path: "/voucher-operations",              element: <VoucherModule />,               label: "Voucher Operations",       category: "Vouchers" },
  { path: "/voucher-search",                  element: <VoucherSearch />,               label: "Voucher Search",           category: "Vouchers" },
  { path: "/saving-deposit-voucher",          element: <SavingDepositVoucher />,        label: "Saving Deposit Voucher",   category: "Vouchers" },
  { path: "/saving-withdrawal-voucher",       element: <SavingWithdrawalVoucher />,     label: "Saving Withdrawal Voucher", category: "Vouchers" },
  { path: "/rd-kist-voucher",                 element: <RDKistVoucher />,               label: "RD Kist Voucher",          category: "Vouchers" },
  { path: "/rd-multiple-kist-voucher",        element: <RDMultipleKistVoucher />,       label: "RD Multiple Kist Voucher", category: "Vouchers" },
  { path: "/cash-payment-receipt-voucher",    element: <CashPaymentReceiptVoucher />,   label: "Cash Payment/Receipt Voucher", category: "Vouchers" },
  { path: "/journal-transfer-voucher",        element: <JournalTransferVoucher />,      label: "Journal / Transfer Voucher",   category: "Vouchers" },
  { path: "/loan-advancement",                element: <LoanAdvancementVoucher />,      label: "Loan Advancement Voucher", category: "Vouchers" },
  { path: "/loan-recovery",                   element: <LoanRecovery />,                label: "Loan Recovery Voucher",    category: "Vouchers" },
  { path: "/loan-interest-posting",           element: <LoanInterestPostingVoucher />,  label: "Loan Interest Posting",    category: "Vouchers" },
  { path: "/loan-expense",                    element: <LoanExpensePage />,             label: "Loan Expense Voucher",     category: "Vouchers" },

  // ── Loan Masters ──────────────────────────────────────────────────────────
  { path: "/unpledge-fd",                     element: <UnpledgeFDPage />,              label: "Unpledge / Unlock FD",     category: "Loan Masters" },
  { path: "/unpledge-rd",                     element: <UnpledgeRDPage />,              label: "Unpledge / Unlock RD",     category: "Loan Masters" },
  { path: "/expense-category-operations",     element: <ExpenseCategoryOperations />,   label: "Loan Expense Category",    category: "Loan Masters" },
  { path: "/expense-category",                element: <ExpenseCategoryMaster />,       label: "New Expense Category",     category: "Loan Masters" },
  { path: "/expense-category/:categoryId",    element: <ExpenseCategoryMaster /> },
  { path: "/expense-category-info",           element: <ExpenseCategoryData /> },

  // ── NPA ───────────────────────────────────────────────────────────────────
  { path: "/npaplanmaster-operations",        element: <NPAPlanMasterOperations />,     label: "NPA Plan Master",          category: "NPA" },
  { path: "/npaplanmaster",                   element: <NPAPlanMasterPage />,           label: "New NPA Plan",             category: "NPA" },
  { path: "/npaplanmaster/:planId",           element: <NPAPlanMasterPage /> },
  { path: "/npaplanmaster-info",              element: <NPAPlanMasterCRUD /> },
  { path: "/npaplancategory-operations",      element: <NPAPlanCategoryOperations />,   label: "NPA Plan Category",        category: "NPA" },
  { path: "/npaplancategory",                 element: <NPAPlanCategoryPage />,         label: "New NPA Category",         category: "NPA" },
  { path: "/npaplancategory/:categoryId",     element: <NPAPlanCategoryPage /> },
  { path: "/npaplancategory-info",            element: <NPAPlanCategoryCRUD /> },

  // ── GST Masters ───────────────────────────────────────────────────────────
  { path: "/taxtype-operations",              element: <TaxTypeOperations />,           label: "Tax Type",                 category: "GST Masters" },
  { path: "/taxtype",                         element: <TaxTypeMaster />,               label: "New Tax Type",             category: "GST Masters" },
  { path: "/taxtype/:taxTypeId",              element: <TaxTypeMaster /> },
  { path: "/taxtype-info",                    element: <TaxTypeData /> },

  { path: "/taxgroup-operations",             element: <TaxGroupOperations />,          label: "Tax Group",                category: "GST Masters" },
  { path: "/taxgroup",                        element: <TaxGroupMaster />,              label: "New Tax Group",            category: "GST Masters" },
  { path: "/taxgroup/:taxGroupId",            element: <TaxGroupMaster /> },
  { path: "/taxgroup-info",                   element: <TaxGroupData /> },

  { path: "/tax-operations",                  element: <TaxOperations />,               label: "Tax",                      category: "GST Masters" },
  { path: "/tax",                             element: <TaxMaster />,                   label: "New Tax",                  category: "GST Masters" },
  { path: "/tax/:taxId",                      element: <TaxMaster /> },
  { path: "/tax-info",                        element: <TaxData /> },

  { path: "/billbook-operations",             element: <BillBookOperations />,          label: "Bill Book",                category: "GST Masters" },
  { path: "/billbook",                        element: <BillBookMaster />,              label: "New Bill Book",            category: "GST Masters" },
  { path: "/billbook/:billBookId",            element: <BillBookMaster /> },
  { path: "/billbook-info",                   element: <BillBookData /> },

  { path: "/gst-settings",                    element: <GSTSettings />,                 label: "GST Settings",             category: "GST Masters" },

  // ── Service Masters ───────────────────────────────────────────────────────
  { path: "/service-operations",              element: <ServiceOperations />,           label: "Service",                  category: "Service Masters" },
  { path: "/service",                         element: <ServiceMaster />,               label: "New Service",              category: "Service Masters" },
  { path: "/service/:serviceId",              element: <ServiceMaster /> },
  { path: "/service-info",                    element: <ServiceData /> },
  { path: "/acc-service",                     element: <AccService />,                  label: "Update Account Service",   category: "Service Masters" },

  // ── Bank FD ───────────────────────────────────────────────────────────────
  { path: "/bank-fd-tds-setting",             element: <BFDTDSSetting />,               label: "Bank FD TDS Setting",      category: "Bank FD" },
  { path: "/fd-tds-slab",                     element: <CRUDDashboard title="FD TDS Slab" addPath="/fd-tds-slab/create" modifyPath="/fd-tds-slab/list" />, label: "FD TDS Slab", category: "Bank FD" },
  { path: "/fd-tds-slab/list",                element: <FDTDSSlabList />,               label: "FD TDS Slab List",         category: "Bank FD" },
  { path: "/fd-tds-slab/create",              element: <FDTDSSlabForm /> },
  { path: "/fd-tds-slab/edit/:slabId",        element: <FDTDSSlabForm /> },
  { path: "/bank-fd-account",                 element: <BankFDAccountTable />,          label: "Bank FD Account",          category: "Bank FD" },
  { path: "/bank-fd-account/create",          element: <BankFDAccountForm /> },
  { path: "/bank-fd-account/edit/:accountId", element: <BankFDAccountForm /> },

  // ── Inter Branch ──────────────────────────────────────────────────────────
  { path: "/other-branch-accounts",           element: <OtherBranchAccounts />,         label: "Other Branch Accounts",    category: "Inter Branch" },
  { path: "/ib-pending-vouchers",             element: <IBPendingVouchers />,           label: "IB Pending Vouchers",      category: "Inter Branch" },
  { path: "/ib-incoming-vouchers",            element: <IBIncomingVouchers />,          label: "IB Incoming Vouchers",     category: "Inter Branch" },

  // ── Daily Reports ─────────────────────────────────────────────────────────
  { path: "/day-book",                        element: <DayBookPage />,                 label: "Day Book",                 category: "Daily Reports" },
  { path: "/cash-book",                       element: <CashBookPage />,                label: "Cash Book",                category: "Daily Reports" },

  // ── Ledgers ───────────────────────────────────────────────────────────────
  { path: "/saving-ledger",                   element: <SavingLedgerPage />,            label: "Saving Ledger",            category: "Ledgers" },
  { path: "/rd-ledger",                       element: <RDLedgerPage />,                label: "RD Ledger",                category: "Ledgers" },
  { path: "/loan-ledger",                     element: <LoanLedgerPage />,              label: "Loan Ledger",              category: "Ledgers" },
  { path: "/fd-ledger",                       element: <FDLedgerPage />,                label: "FD Ledger",                category: "Ledgers" },
  { path: "/share-money-ledger",              element: <ShareMoneyLedgerPage />,        label: "Share Money Ledger",       category: "Ledgers" },
  { path: "/general-ledger",                  element: <GeneralLedgerPage />,           label: "General Ledger",           category: "Ledgers" },

  // ── Financial Reports ─────────────────────────────────────────────────────
  { path: "/balance-sheet",                   element: <BalanceSheetPage />,            label: "Balance Sheet",            category: "Financial Reports" },
  { path: "/profit-loss",                     element: <ProfitLossPage />,              label: "Profit & Loss",            category: "Financial Reports" },
  { path: "/trial-balance",                   element: <TrialBalancePage />,            label: "Trial Balance",            category: "Financial Reports" },
  { path: "/journal-book",                    element: <JournalBookPage />,             label: "Journal Book",             category: "Financial Reports" },

  // ── Loan Reports ──────────────────────────────────────────────────────────
  { path: "/loan-npa-report",                 element: <LoanNPAPage />,                 label: "Loan NPA Report",          category: "Loan Reports" },
  { path: "/npa-ledger",                      element: <NpaLedgerPage />,               label: "NPA Ledger",               category: "Loan Reports" },
  { path: "/loan-advancement-report",         element: <LoanAdvancementReportPage />,   label: "Loan Advancement Report",  category: "Loan Reports" },
  { path: "/loan-recovery-report",            element: <LoanRecoveryReportPage />,      label: "Loan Recovery Report",     category: "Loan Reports" },
  { path: "/loan-demand-report",              element: <LoanDemandPage />,              label: "Loan Demand (Kist)",       category: "Loan Reports" },
  { path: "/od-reserve",                      element: <OdReservePage />,               label: "OD Reserve",               category: "Loan Reports" },
  { path: "/loan-int-cert",                   element: <LoanIntCertPage />,             label: "Loan Interest Certificate", category: "Loan Reports" },

  // ── FD Reports ────────────────────────────────────────────────────────────
  { path: "/fd-maturity-report",              element: <FDMaturityPage />,              label: "FD Maturity Report",       category: "FD Reports" },
  { path: "/fd-opening-report",               element: <FDOpeningPage />,               label: "FD Opening Report",        category: "FD Reports" },

  // ── RD Reports ────────────────────────────────────────────────────────────
  { path: "/rd-maturity-report",              element: <RDMaturityPage />,              label: "RD Maturity Report",       category: "RD Reports" },
  { path: "/rd-kist-receive-report",          element: <RDKistReceivePage />,           label: "RD Kist Receive",          category: "RD Reports" },

  // ── Member Reports ────────────────────────────────────────────────────────
  { path: "/member-report",                   element: <MemberReportPage />,            label: "Member Report",            category: "Member Reports" },
  { path: "/member-accounts",                 element: <MemberAccountsPage />,          label: "Accounts Detail",          category: "Member Reports" },
  { path: "/member-int-cert",                 element: <MemberIntCertPage />,           label: "Interest Certificate",     category: "Member Reports" },
];

/** All searchable screens for the header search bar. Imported from screenList to avoid circular deps. */
export { SEARCHABLE_SCREENS } from "./screenList";
