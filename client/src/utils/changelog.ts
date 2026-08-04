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
    version: "1.0.5",
    date: "2026-08-04",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
  {
    version: "1.0.4",
    date: "2026-08-04",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
  {
    version: "1.0.3",
    date: "2026-08-04",
    changes: [
      { type: "new",         text: "Loan Recovery: new Ledger tab shows the full transaction history of the loan account" },
      { type: "new",         text: "Loan Advancement: account information panel now shows the current principal balance" },
      { type: "new",         text: "Loan Interest Posting: all accounts are now shown with a reason when no interest is postable — making it easier to spot missing disbursements or wrong product setup" },
      { type: "new",         text: "RD Account Master: interest rate field is now editable — changing it recalculates the maturity amount instantly" },
      { type: "improvement", text: "RD Account Master: first kist date now defaults to the account opening date" },
      { type: "improvement", text: "FD Interest Slab: slab name uniqueness is now enforced per-product, so different products can share slab names" },
      { type: "fix",         text: "Transfer voucher was showing insufficient balance even when the account had enough funds — fixed by including opening balance in the check" },
      { type: "fix",         text: "Bank FD: Account Head field added to the account form" },
      { type: "fix",         text: "RD Slab: Daily kist option now available in the compounding interval dropdown" },
      { type: "fix",         text: "Loan Master: guarantors and witnesses can no longer be added as their own guarantor/witness" },
    ],
  },
  {
    version: "1.0.2",
    date: "2026-08-03",
    changes: [
      { type: "improvement", text: "Nominee age now recalculated from DOB when loading in edit mode" },
    ],
  },
  {
    version: "1.0.1",
    date: "2026-08-01",
    changes: [
      { type: "new",         text: "Members with existing account entries or transactions are now protected from accidental deletion" },
      { type: "new",         text: "Membership type (Nominal / Permanent) is locked in edit mode once the member has any transactions — prevents accidental changes" },
      { type: "new",         text: "Masters like Caste, Zone, Village, etc. are now protected from deletion when referenced in member or account records — the app shows which screens are using the record" },
      { type: "improvement", text: "Search in all master screens now filters results live as you type — no need to press Enter" },
      { type: "improvement", text: "Voucher Operations is now a direct link in the sidebar menu" },
      { type: "improvement", text: "Dashboard now loads significantly faster" },
      { type: "fix",         text: "Account Head Type screen was not loading correctly for some users — resolved" },
    ],
  },
];
