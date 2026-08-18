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
    version: "1.0.23",
    date: "2026-08-13",
    changes: [
      { type: "fix", text: "Loan Interest Posting now rounds posted interest amounts to whole numbers (no paisa); display values in the batch screen also show whole numbers" },
    ],
  },
  {
    version: "1.0.22",
    date: "2026-08-13",
    changes: [
      { type: "fix", text: "FD, RD, and Saving interest posting now rounds the posted interest amount to the nearest whole number (no paisa)" },
    ],
  },
  {
    version: "1.0.21",
    date: "2026-08-13",
    changes: [
      { type: "fix", text: "Loan Recovery (Stand): Interest (Intt) field is now editable so the operator can specify the exact interest portion" },
      { type: "fix", text: "Loan Recovery (Stand): Interest Recovered now appears as a separate Cr entry in the Day Book under the Interest Income account" },
      { type: "fix", text: "Loan Recovery: Interest amounts now display as whole numbers (no decimals)" },
    ],
  },
  {
    version: "1.0.20",
    date: "2026-08-13",
    changes: [
      { type: "fix", text: "MIS Interest Posting now posts the fixed monthly amount (e.g. ₹525 every month) instead of a day-count-based variable amount" },
    ],
  },
  {
    version: "1.0.19",
    date: "2026-08-13",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
  {
    version: "1.0.18",
    date: "2026-08-13",
    changes: [
      { type: "new", text: "FD Ledger: added 'Interest Posted' column — interest posting entries now appear in a separate highlighted column instead of the Deposits (Cr) column, with a dedicated total and summary card." },
      { type: "new", text: "RD Ledger: added 'Interest Posted' column — same treatment as FD Ledger. Both ledgers now show 8 columns: S.No, Date, Voucher No., Particulars, Withdrawals (Dr), Deposits (Cr), Interest Posted, Balance." },
    ],
  },
  {
    version: "1.0.17",
    date: "2026-08-13",
    changes: [
      { type: "fix", text: "FD Mature / Renew / Pre-Mature: the Interest Paid debit entry (maturity amount minus principal) is now correctly generated in the voucher and Day Book. Previously only the principal was debited while the full maturity amount was credited, leaving the voucher unbalanced." },
    ],
  },
  {
    version: "1.0.16",
    date: "2026-08-13",
    changes: [
      { type: "fix", text: "Saving Interest Posting: when an account has no prior interest posting and its opening date is before the branch's first session start date, interest is now calculated from the first session start date rather than the account opening date." },
      { type: "fix", text: "FD Mature / Renew / Pre-Mature: the Interest Paid debit entry is now correctly included in the voucher, making it balance. Previously only the principal was debited from the FD account while the full maturity amount (principal + interest) was credited to the payout account." },
    ],
  },
  {
    version: "1.0.15",
    date: "2026-08-13",
    changes: [
      { type: "fix", text: "Saving Interest Posting: when an account has no prior interest posting and its opening date is before the branch's first session start date, interest is now calculated from the first session start date rather than the account opening date." },
      { type: "fix", text: "FD Mature / Renew / Pre-Mature: the Interest Paid debit entry (₹maturity - ₹principal) is now correctly included in the voucher. Previously the voucher was unbalanced — only the principal was debited from the FD account while the full maturity amount was credited to the payout account." },
    ],
  },
  {
    version: "1.0.14",
    date: "2026-08-12",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
  {
    version: "1.0.13",
    date: "2026-08-12",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
  {
    version: "1.0.12",
    date: "2026-08-12",
    changes: [
      { type: "improvement", text: "Close Saving Account ledger view, RD Financial Report format selector (standard vs with-opening-closing), session fromDate fix in all 23 reports, FD Renew delete fix, CloseAccount voucher sub-type" },
    ],
  },
  {
    version: "1.0.11",
    date: "2026-08-12",
    changes: [
      { type: "new",         text: "Close Saving Account: account ledger is now displayed immediately after selecting an account so you can verify all transactions before closure." },
      { type: "new",         text: "RD Financial Report: new 'With Opening & Closing Balance' format — shows derived opening balance and running closing balance per row alongside period Dr/Cr. Format selector dropdown added to filter bar; print/PDF use landscape for the wider layout." },
      { type: "fix",         text: "All reports now correctly pre-fill the From Date to the session start (April 1 of the fiscal year) instead of showing blank." },
      { type: "fix",         text: "RD Financial Report: rows now appear in account-head code order, matching the legacy stored-procedure output." },
      { type: "fix",         text: "FD Renew voucher deletion: now correctly removes the new detail row and reverts the original to Open status, instead of the previous approach that could resurrect wrong entries." },
      { type: "improvement", text: "Close Saving Account: combined closing voucher now uses a dedicated CloseAccount sub-type (29); interest expense account is validated before the transaction begins." },
    ],
  },
  {
    version: "1.0.10",
    date: "2026-08-10",
    changes: [
      { type: "fix",         text: "FD Maturity/Renewal/Pre-Maturity: interest amount now debits the Interest Paid account separately instead of being rolled into the FD account debit. Entries now correctly reflect Dr FD Account (principal) + Dr Interest Paid Account (interest) = Cr payout account (total)." },
      { type: "new",         text: "RD Financial Report added under Financial Reports — shows period Dr/Cr movements and closing balances per account head, with print, PDF, and Excel export." },
      { type: "improvement", text: "RD Branch-Wise Rule: formula captions now include a brief description of the interest method (e.g. 'CI Quarterly, Annuity-Due') for easier selection." },
    ],
  },
  {
    version: "1.0.9",
    date: "2026-08-09",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
  {
    version: "1.0.8",
    date: "2026-08-09",
    changes: [
      { type: "improvement", text: "Account Masters (Saving, FD, RD, Loan): tabs now unlock step-by-step — each tab must pass validation before the next one becomes available. Edit mode still unlocks all tabs freely." },
      { type: "fix",         text: "Nominee validation now correctly checks name and relation for every nominee row, not just whether at least one row exists." },
      { type: "improvement", text: "Account Head Master: selecting a parent head auto-suggests the next available child head code based on the 4-segment (3 digits each) structure. The suggestion is editable." },
      { type: "fix",         text: "FD Interest Posting: the Credit entry now correctly posts to the customer's FD account instead of the Interest Payable GL account." },
      { type: "fix",         text: "Loan Interest Posting: Add-In-Balance loans now display the correct interest amount using the proper Balance / Min-Balance / Schedule method." },
    ],
  },
  {
    version: "1.0.7",
    date: "2026-08-05",
    changes: [
      { type: "new",         text: "Loan Recovery vouchers can now be edited — open any recovery voucher from Voucher Search and modify it directly." },
      { type: "improvement", text: "All voucher save and update messages now consistently show the voucher number, so you always know which entry was created." },
      { type: "improvement", text: "RD Account Master: the opening date field is now correctly labelled 'Account Opening Date', and the First Kist Date automatically adjusts whenever you change the opening date." },
      { type: "improvement", text: "RD Account Master: the Payment Date picker now prevents selecting a date before the Maturity Date, avoiding data errors." },
      { type: "improvement", text: "Cash Book: when viewing multiple days at once, each day now shows a clear 'Total for [date]' summary row so daily receipts and payments are easy to spot." },
    ],
  },
  {
    version: "1.0.6",
    date: "2026-08-05",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
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
