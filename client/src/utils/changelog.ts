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
    version: "1.3.11",
    date: "2026-08-01",
    changes: [
      { type: "improvement", text: "Dashboard loads faster — hero, chips and quick-access render immediately; favourites section has its own mini skeleton" },
    ],
  },
  {
    version: "1.3.10",
    date: "2026-08-01",
    changes: [
      { type: "improvement", text: "Rewrite changelog entries in plain user-friendly language" },
    ],
  },
  {
    version: "1.3.9",
    date: "2026-08-01",
    changes: [
      { type: "new",         text: "Members with existing account entries or transactions are now protected from accidental deletion" },
      { type: "new",         text: "Membership type (Nominal / Permanent) is locked in edit mode once the member has any transactions — prevents accidental changes" },
      { type: "improvement", text: "Search in all master screens now filters results live as you type — no need to press Enter" },
      { type: "improvement", text: "Voucher Operations is now a direct link in the sidebar menu" },
    ],
  },
  {
    version: "1.3.8",
    date: "2026-08-01",
    changes: [
      { type: "improvement", text: "Internal improvements — no user-facing changes" },
    ],
  },
  {
    version: "1.3.7",
    date: "2026-08-01",
    changes: [
      { type: "fix", text: "Account Head Type screen was not loading correctly for some users — resolved" },
    ],
  },
  {
    version: "1.3.6",
    date: "2026-08-01",
    changes: [
      { type: "new", text: "Masters like Caste, Zone, Village, etc. are now protected from deletion when they are referenced in member or account records — the app shows which screens are using the record" },
    ],
  },
  {
    version: "1.3.5",
    date: "2026-07-28",
    changes: [
      { type: "improvement", text: "Last assigned membership numbers (Permanent and Nominal) are now shown in Member Master to help pick the next number in sequence" },
    ],
  },
  {
    version: "1.3.4",
    date: "2026-07-28",
    changes: [
      { type: "fix",         text: "Saving account withdrawal now shows the correct available balance including any opening balance entries" },
      { type: "new",         text: "RD Account Master: Daily kist interval is now supported — enter a period in days instead of months" },
      { type: "fix",         text: "RD maturity amount calculation corrected — now uses the proper compound interest annuity formula as configured per product" },
      { type: "improvement", text: "FD Interest Slab dropdown now filters to show only slabs matching the selected FD product" },
    ],
  },
  {
    version: "1.3.3",
    date: "2026-07-28",
    changes: [
      { type: "improvement", text: "Interest amounts are now editable in all interest posting vouchers (Saving, FD, RD, Loan)" },
      { type: "improvement", text: "GST settings and IB voucher screens now respect superuser visibility settings" },
      { type: "fix",         text: "Member Master: opening entry logic corrected — opening amount field shown only when joining date is before the first session date" },
      { type: "fix",         text: "Village Master: multiple villages can now share the same pincode" },
      { type: "fix",         text: "Loan interest calculation now uses the working date instead of the server date" },
      { type: "new",         text: "New Superuser Settings screen for managing top-level application settings" },
    ],
  },
];
