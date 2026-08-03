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
