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
