export { APP_VERSION } from "../constants/config";

export type ChangeType = "new" | "fix" | "improvement";

export interface ChangeEntry {
  type: ChangeType;
  text: string;
}

export interface VersionEntry {
  version: string;
  date: string;
  changes: ChangeEntry[];
}

export const changelog: VersionEntry[] = [
  {
    version: "1.3.2",
    date: "2026-07-25",
    changes: [
      { type: "new",         text: "Favourites: pin any screen to a personal quick-access bar from the header" },
      { type: "improvement", text: "Header search bar now finds screens instantly with live filtering" },
      { type: "new",         text: "Dashboard redesigned with gradient hero card, branch info chips, and 6 quick-access tiles" },
      { type: "new",         text: "Inter-Branch voucher detail view: full step-by-step status and audit trail visible per voucher" },
      { type: "improvement", text: "General Ledger & Head Ledger: balance now shows Dr/Cr suffix (e.g. 820 Cr) instead of raw negative numbers" },
      { type: "improvement", text: "Debit amounts highlighted in red, credit amounts in green across all ledger reports" },
      { type: "fix",         text: "Head Ledger opening balance now correctly includes Loan OB and FD per-detail OB" },
      { type: "fix",         text: "Head Ledger now filters only verified and approved vouchers (status V/A)" },
    ],
  },
  {
    version: "1.3.1",
    date: "2026-07-14",
    changes: [
      { type: "new",         text: "IB Saving Withdrawal: source branch can now initiate inter-branch withdrawal" },
      { type: "new",         text: "IB Saving Withdrawal voucher ledger view added" },
      { type: "improvement", text: "IB Incoming & Pending voucher screens handle both deposit and withdrawal with correct Dr/Cr labels" },
      { type: "fix",         text: "Removed stray console.log statements from production build" },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-06-14",
    changes: [
      { type: "new",         text: "Bank FD TDS Slab master screen added" },
      { type: "new",         text: "Bank FD TDS Setting screen added" },
      { type: "new",         text: "New Bank FD account screen added" },
      { type: "fix",         text: "Fixed Balance Sheet report calculation issues" },
      { type: "fix",         text: "Fixed Trial Balance report calculation issues" },
      { type: "fix",         text: "Fixed RD Account Master modify mode not loading correctly" },
      { type: "fix",         text: "Fixed interest calculation bug in Loan Recovery voucher" },
      { type: "new",         text: "What's New changelog modal introduced" },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-06-14",
    changes: [
      { type: "fix",         text: "Fixed RD Account Master modify mode not loading slab name" },
      { type: "fix",         text: "Fixed compounding interval showing blank in edit mode" },
      { type: "new",         text: "Default cash account now auto-fills in RD Account Master" },
      { type: "improvement", text: "Added cursor pointer to all dropdown selects" },
      { type: "new",         text: "What's New changelog modal on every new update" },
    ],
  },
];
