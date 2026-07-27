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
