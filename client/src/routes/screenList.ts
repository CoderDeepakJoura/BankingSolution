// Plain data — no React imports. Safe to import from any page without circular deps.
export interface ScreenEntry {
  path: string;
  label: string;
  category: string;
}

export const SEARCHABLE_SCREENS: ScreenEntry[] = [
  // ── Main ──────────────────────────────────────────────────────────────────
  { path: "/dashboard",                       label: "Dashboard",                       category: "Main" },

  // ── Location Masters ──────────────────────────────────────────────────────
  { path: "/zone-operations",                 label: "Zone Master",                     category: "Location Masters" },
  { path: "/thana-operations",                label: "Thana Master",                    category: "Location Masters" },
  { path: "/tehsil-operations",               label: "Tehsil Master",                   category: "Location Masters" },
  { path: "/postOffice-operations",           label: "Post Office Master",              category: "Location Masters" },
  { path: "/category-operations",             label: "Category Master",                 category: "Location Masters" },
  { path: "/village-operations",              label: "Village Master",                  category: "Location Masters" },
  { path: "/state-operations",                label: "State Master",                    category: "Location Masters" },
  { path: "/patwar-operations",               label: "Patwar Master",                   category: "Location Masters" },

  // ── Miscellaneous Masters ─────────────────────────────────────────────────
  { path: "/accountheadtype-operations",      label: "Account Head Type Master",        category: "Miscellaneous Masters" },
  { path: "/accounthead-operations",          label: "Account Head Master",             category: "Miscellaneous Masters" },
  { path: "/branchmaster-operations",         label: "Branch Master",                   category: "Miscellaneous Masters" },
  { path: "/caste-operations",                label: "Caste Master",                    category: "Miscellaneous Masters" },
  { path: "/occupation-operations",           label: "Occupation Master",               category: "Miscellaneous Masters" },
  { path: "/relation-operations",             label: "Relation Master",                 category: "Miscellaneous Masters" },
  { path: "/user-info",                       label: "User Master",                     category: "Miscellaneous Masters" },
  { path: "/change-session",                  label: "Change Session / Working Date",   category: "Miscellaneous Masters" },

  // ── Masters ───────────────────────────────────────────────────────────────
  { path: "/settings",                        label: "Settings Master",                 category: "Masters" },
  { path: "/member-operations",               label: "Member Master",                   category: "Masters" },
  { path: "/account-operations",              label: "Account Masters",                 category: "Masters" },
  { path: "/product-operations",              label: "Product Masters",                 category: "Masters" },
  { path: "/slab-operations",                 label: "Product Interest Slabs",          category: "Masters" },
  { path: "/fd-slab-operations",              label: "Product Slabs",                   category: "Masters" },

  // ── Account Masters ───────────────────────────────────────────────────────
  { path: "/generalacc-master",               label: "General Account Master",          category: "Account Masters" },
  { path: "/saving-acc-operations",           label: "Saving Account Master",           category: "Account Masters" },
  { path: "/saving-acc-master",               label: "New Saving Account",              category: "Account Masters" },
  { path: "/close-saving-account",            label: "Close Saving Account",            category: "Account Masters" },
  { path: "/saving-interest-posting",         label: "Saving Interest Posting",         category: "Account Masters" },
  { path: "/fd-acc-operations",               label: "FD Account Master",               category: "Account Masters" },
  { path: "/fd-acc-master",                   label: "New FD Account",                  category: "Account Masters" },
  { path: "/fd-interest-posting",             label: "FD Interest Posting",             category: "Account Masters" },
  { path: "/mis-interest-posting",            label: "MIS Interest Posting",            category: "Account Masters" },
  { path: "/mature-fd-account",               label: "Mature FD Account",               category: "Account Masters" },
  { path: "/premature-fd-account",            label: "Pre-Mature FD Account",           category: "Account Masters" },
  { path: "/rd-acc-operations",               label: "RD Account Master",               category: "Account Masters" },
  { path: "/rd-acc-master",                   label: "New RD Account",                  category: "Account Masters" },
  { path: "/rd-interest-posting",             label: "RD Interest Posting",             category: "Account Masters" },
  { path: "/mature-rd-account",               label: "Mature RD Account",               category: "Account Masters" },
  { path: "/premature-rd-account",            label: "Pre-Mature RD Account",           category: "Account Masters" },
  { path: "/loan-acc-operations",             label: "Loan Account Master",             category: "Account Masters" },
  { path: "/loan-acc-master",                 label: "New Loan Account",                category: "Account Masters" },

  // ── Product Masters ───────────────────────────────────────────────────────
  { path: "/fdproduct-operations",            label: "FD Product",                      category: "Product Masters" },
  { path: "/fd-product",                      label: "New FD Product",                  category: "Product Masters" },
  { path: "/savingproduct-operations",        label: "Saving Product",                  category: "Product Masters" },
  { path: "/saving-product",                  label: "New Saving Product",              category: "Product Masters" },
  { path: "/rdproduct-operations",            label: "RD Product",                      category: "Product Masters" },
  { path: "/rd-product",                      label: "New RD Product",                  category: "Product Masters" },
  { path: "/loanproduct-operations",          label: "Loan Product",                    category: "Product Masters" },
  { path: "/loan-product",                    label: "New Loan Product",                category: "Product Masters" },
  { path: "/fd-product-slab-operations",      label: "FD Product Slabs",               category: "Product Masters" },
  { path: "/fdproduct-slab",                  label: "New FD Product Slab",            category: "Product Masters" },

  // ── Interest Slabs ────────────────────────────────────────────────────────
  { path: "/saving-slab-operations",          label: "Saving Interest Slabs",           category: "Interest Slabs" },
  { path: "/savingproduct-interest-slab",     label: "New Saving Interest Slab",        category: "Interest Slabs" },
  { path: "/fd-interest-slab-operations",     label: "FD Interest Slabs",               category: "Interest Slabs" },
  { path: "/fdproduct-interest-slab",         label: "New FD Interest Slab",            category: "Interest Slabs" },
  { path: "/rd-slab-operations",              label: "RD Interest Slabs",               category: "Interest Slabs" },
  { path: "/rd-interest-slab",                label: "New RD Interest Slab",            category: "Interest Slabs" },
  { path: "/loan-slab-operations",            label: "Loan Interest Slabs",             category: "Interest Slabs" },
  { path: "/loan-interest-slab",              label: "New Loan Interest Slab",          category: "Interest Slabs" },

  // ── Branch Wise Rules ─────────────────────────────────────────────────────
  { path: "/saving-productbranchwise-rule",   label: "Saving Product BranchWise Rule",  category: "Branch Wise Rules" },
  { path: "/fd-productbranchwise-rule",       label: "FD Product BranchWise Rule",      category: "Branch Wise Rules" },
  { path: "/rd-productbranchwise-rule",       label: "RD Product BranchWise Rule",      category: "Branch Wise Rules" },
  { path: "/loan-productbranchwise-rule",     label: "Loan Product BranchWise Rule",    category: "Branch Wise Rules" },

  // ── Vouchers ──────────────────────────────────────────────────────────────
  { path: "/voucher-operations",              label: "Voucher Operations",              category: "Vouchers" },
  { path: "/voucher-search",                  label: "Voucher Search",                  category: "Vouchers" },
  { path: "/saving-deposit-voucher",          label: "Saving Deposit Voucher",          category: "Vouchers" },
  { path: "/saving-withdrawal-voucher",       label: "Saving Withdrawal Voucher",       category: "Vouchers" },
  { path: "/rd-kist-voucher",                 label: "RD Kist Voucher",                 category: "Vouchers" },
  { path: "/rd-multiple-kist-voucher",        label: "RD Multiple Kist Voucher",        category: "Vouchers" },
  { path: "/cash-payment-receipt-voucher",    label: "Cash Payment/Receipt Voucher",    category: "Vouchers" },
  { path: "/journal-transfer-voucher",        label: "Journal / Transfer Voucher",      category: "Vouchers" },
  { path: "/loan-advancement",                label: "Loan Advancement Voucher",        category: "Vouchers" },
  { path: "/loan-recovery",                   label: "Loan Recovery Voucher",           category: "Vouchers" },
  { path: "/loan-interest-posting",           label: "Loan Interest Posting",           category: "Vouchers" },
  { path: "/loan-expense",                    label: "Loan Expense Voucher",            category: "Vouchers" },

  // ── Loan Masters ──────────────────────────────────────────────────────────
  { path: "/unpledge-fd",                     label: "Unpledge / Unlock FD",            category: "Loan Masters" },
  { path: "/unpledge-rd",                     label: "Unpledge / Unlock RD",            category: "Loan Masters" },
  { path: "/expense-category-operations",     label: "Loan Expense Category",           category: "Loan Masters" },
  { path: "/expense-category",                label: "New Expense Category",            category: "Loan Masters" },

  // ── NPA ───────────────────────────────────────────────────────────────────
  { path: "/npaplanmaster-operations",        label: "NPA Plan Master",                 category: "NPA" },
  { path: "/npaplanmaster",                   label: "New NPA Plan",                    category: "NPA" },
  { path: "/npaplancategory-operations",      label: "NPA Plan Category",               category: "NPA" },
  { path: "/npaplancategory",                 label: "New NPA Category",                category: "NPA" },

  // ── GST Masters ───────────────────────────────────────────────────────────
  { path: "/taxtype-operations",              label: "Tax Type",                        category: "GST Masters" },
  { path: "/taxtype",                         label: "New Tax Type",                    category: "GST Masters" },
  { path: "/taxgroup-operations",             label: "Tax Group",                       category: "GST Masters" },
  { path: "/taxgroup",                        label: "New Tax Group",                   category: "GST Masters" },
  { path: "/tax-operations",                  label: "Tax",                             category: "GST Masters" },
  { path: "/tax",                             label: "New Tax",                         category: "GST Masters" },
  { path: "/billbook-operations",             label: "Bill Book",                       category: "GST Masters" },
  { path: "/billbook",                        label: "New Bill Book",                   category: "GST Masters" },
  { path: "/gst-settings",                    label: "GST Settings",                    category: "GST Masters" },

  // ── Service Masters ───────────────────────────────────────────────────────
  { path: "/service-operations",              label: "Service",                         category: "Service Masters" },
  { path: "/service",                         label: "New Service",                     category: "Service Masters" },
  { path: "/acc-service",                     label: "Update Account Service",          category: "Service Masters" },

  // ── Bank FD ───────────────────────────────────────────────────────────────
  { path: "/bank-fd-tds-setting",             label: "Bank FD TDS Setting",             category: "Bank FD" },
  { path: "/fd-tds-slab",                     label: "FD TDS Slab",                     category: "Bank FD" },
  { path: "/fd-tds-slab/list",                label: "FD TDS Slab List",                category: "Bank FD" },
  { path: "/bank-fd-account",                 label: "Bank FD Account",                 category: "Bank FD" },

  // ── Inter Branch ──────────────────────────────────────────────────────────
  { path: "/other-branch-accounts",           label: "Other Branch Accounts",           category: "Inter Branch" },
  { path: "/ib-pending-vouchers",             label: "IB Pending Vouchers",             category: "Inter Branch" },
  { path: "/ib-incoming-vouchers",            label: "IB Incoming Vouchers",            category: "Inter Branch" },

  // ── Daily Reports ─────────────────────────────────────────────────────────
  { path: "/day-book",                        label: "Day Book",                        category: "Daily Reports" },
  { path: "/cash-book",                       label: "Cash Book",                       category: "Daily Reports" },

  // ── Ledgers ───────────────────────────────────────────────────────────────
  { path: "/saving-ledger",                   label: "Saving Ledger",                   category: "Ledgers" },
  { path: "/rd-ledger",                       label: "RD Ledger",                       category: "Ledgers" },
  { path: "/loan-ledger",                     label: "Loan Ledger",                     category: "Ledgers" },
  { path: "/fd-ledger",                       label: "FD Ledger",                       category: "Ledgers" },
  { path: "/share-money-ledger",              label: "Share Money Ledger",              category: "Ledgers" },
  { path: "/general-ledger",                  label: "General Ledger",                  category: "Ledgers" },

  // ── Financial Reports ─────────────────────────────────────────────────────
  { path: "/balance-sheet",                   label: "Balance Sheet",                   category: "Financial Reports" },
  { path: "/profit-loss",                     label: "Profit & Loss",                   category: "Financial Reports" },
  { path: "/trial-balance",                   label: "Trial Balance",                   category: "Financial Reports" },
  { path: "/journal-book",                    label: "Journal Book",                    category: "Financial Reports" },

  // ── Loan Reports ──────────────────────────────────────────────────────────
  { path: "/loan-npa-report",                 label: "Loan NPA Report",                 category: "Loan Reports" },
  { path: "/npa-ledger",                      label: "NPA Ledger",                      category: "Loan Reports" },
  { path: "/loan-advancement-report",         label: "Loan Advancement Report",         category: "Loan Reports" },
  { path: "/loan-recovery-report",            label: "Loan Recovery Report",            category: "Loan Reports" },
  { path: "/loan-demand-report",              label: "Loan Demand (Kist)",              category: "Loan Reports" },
  { path: "/od-reserve",                      label: "OD Reserve",                      category: "Loan Reports" },
  { path: "/loan-int-cert",                   label: "Loan Interest Certificate",       category: "Loan Reports" },

  // ── FD Reports ────────────────────────────────────────────────────────────
  { path: "/fd-maturity-report",              label: "FD Maturity Report",              category: "FD Reports" },
  { path: "/fd-opening-report",               label: "FD Opening Report",               category: "FD Reports" },

  // ── RD Reports ────────────────────────────────────────────────────────────
  { path: "/rd-maturity-report",              label: "RD Maturity Report",              category: "RD Reports" },
  { path: "/rd-kist-receive-report",          label: "RD Kist Receive",                 category: "RD Reports" },

  // ── Member Reports ────────────────────────────────────────────────────────
  { path: "/member-report",                   label: "Member Report",                   category: "Member Reports" },
  { path: "/member-accounts",                 label: "Accounts Detail",                 category: "Member Reports" },
  { path: "/member-int-cert",                 label: "Interest Certificate",            category: "Member Reports" },
];
