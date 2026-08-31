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
    version: "1.0.42",
    date: "2026-08-31",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
  {
    version: "1.0.41",
    date: "2026-08-31",
    changes: [
      { type: "fix", text: "Bank FD voucher section: live balance indicator now includes in-progress form values (pending FD amount and pending voucher amount), so the indicator stays accurate regardless of the order entries are filled in." },
      { type: "fix", text: "Bank FD Mature/Renew/Pre-Mature vouchers now correctly use VoucherType 10 (Bank FD) instead of VoucherType 3 (regular FD) — they now appear correctly in Voucher Search and Bank FD Ledger." },
      { type: "improvement", text: "Bank FD Account: multiple credit entries supported in the voucher section (table interface matching legacy system) — each credit row can target a different GL account with its own narration and amount." },
      { type: "improvement", text: "Bank FD Account: opening balance head code now correctly stores the BIGINT headcode (not the integer head ID) — fixes incorrect values written to bankfdaccountopeningbalance and bankfdaccountopeningtds tables." },
      { type: "improvement", text: "Dashboard search bar now includes 'New Bank FD Account' as a searchable screen, consistent with all other account masters." },
    ],
  },
  {
    version: "1.0.40",
    date: "2026-08-26",
    changes: [
      { type: "new", text: "Bank FD Account creation: mandatory voucher section added for non-opening entries. Select the credit account (cash/GL), amount auto-fills from FD total, with a live Dr/Cr preview. Opening balance entries skip the voucher (same rule as all other account masters)." },
      { type: "new", text: "New VoucherType 10 (Bank FD) and SubType 30 (Bank FD Deposit) introduced. Creation vouchers appear in Voucher Search and Day Book under Bank FD head — no modification allowed, only delete." },
    ],
  },
  {
    version: "1.0.39",
    date: "2026-08-26",
    changes: [
      { type: "improvement", text: "FD partial period interest posting; Saving interest from/to date with smart gap detection; RD compounding interval now drives maturity formula" },
    ],
  },
  {
    version: "1.0.38",
    date: "2026-08-26",
    changes: [
      { type: "fix", text: "Bank FD Maturity / Premature / Renewal: Interest Earned is now editable — operators can override the calculated interest before confirming. TDS and net payout recalculate automatically." },
      { type: "fix", text: "Bank FD Maturity / Premature / Renewal: deleting the voucher now reverts the FD detail back to Open status so it reappears in the Maturity, Premature, and Renewal screens." },
      { type: "fix", text: "Head Wise Day Book: Bank FD accounts now show the correct account head name (e.g. 'FDR - HP Cooperative Bank') instead of 'Unknown'. Root cause was HeadCode being stored as the integer HeadId instead of the actual BIGINT headcode." },
      { type: "new", text: "Salary / Payroll module introduced: Employee Designation master, Employee Master, Salary Component master, Employee Attendance tracking, and Monthly Salary Creation with component-wise breakdown." },
    ],
  },
  {
    version: "1.0.37",
    date: "2026-08-21",
    changes: [
      { type: "new", text: "FD Interest Posting: partial period support — posting before a full compounding interval (e.g. month 2 of a quarterly FD) now calculates interest on actual days elapsed. MIS is unchanged." },
      { type: "new", text: "Saving Interest Posting: added Voucher Date, Interest From Date (optional), and Interest To Date fields. When From Date is set, the system skips periods already posted and calculates only the remaining unpaid interest." },
      { type: "fix", text: "Saving Interest Posting: total interest now equals the sum of displayed per-month values (previously the total was the raw unrounded sum, causing a visible mismatch)." },
      { type: "fix", text: "RD Account Master: changing the compounding interval now recalculates the maturity amount using the correct formula (Monthly→F2, Half-Yearly→F4, Yearly→F5, Quarterly keeps product formula)." },
    ],
  },
  {
    version: "1.0.36",
    date: "2026-08-20",
    changes: [
      { type: "fix", text: "FD Mature, FD Renew, FD Pre-Mature, RD Mature, RD Pre-Mature: replaced dummy loan data with real Loan Product → Loan Account selection. Balance card shows Outstanding and Principal; Stand loans show an Interest Amount field; Add-in-Balance loans show only the total Amount." },
      { type: "improvement", text: "Loan recovery from FD/RD maturity now writes voucherrecintdetail entries for Stand loan interest, and sets IntCr on the voucher credit entry — consistent with regular loan recovery." },
      { type: "fix", text: "Removed stray debug alert(JSON.stringify(...)) from RD Mature screen." },
    ],
  },
  {
    version: "1.0.35",
    date: "2026-08-20",
    changes: [
      { type: "new", text: "Bank FD Ledger: complete overhaul — native account and certificate dropdowns, date range placed first, accounts filtered by FD date range and re-fetched when dates change." },
      { type: "fix", text: "Bank FD Account Form: FD Date and Opening Date pickers now correctly enforce the working date as the maximum (format bug prevented the max constraint from applying)." },
      { type: "fix", text: "Bank FD Ledger: fixed account list not binding — was filtering by wrong AccTypeId (7 instead of 8) and unsafe nullable bool check." },
    ],
  },
  {
    version: "1.0.34",
    date: "2026-08-19",
    changes: [
      { type: "fix", text: "FD Ledger: fixed opening balance calculation for accounts with multiple FD details — now correctly isolates each detail's historical movements instead of summing all details combined." },
      { type: "fix", text: "FD Interest Posting: interest amounts in the main grid (display, editable default, and tfoot total) now round to whole numbers, consistent with the popup breakdown." },
      { type: "fix", text: "FD Mature/Pre-Mature: Interest Payable field now pre-fills as a whole number (no paisa)." },
      { type: "fix", text: "RD Mature/Pre-Mature: maturity amount and pre-maturity settlement displayed as whole numbers." },
      { type: "fix", text: "Close Saving Account: accrued interest pre-fills as a whole number." },
      { type: "fix", text: "Loan Recovery: kist interest and FD/RD pledge interest columns now display as whole numbers." },
    ],
  },
  {
    version: "1.0.33",
    date: "2026-08-19",
    changes: [
      { type: "new", text: "Bank FD Ledger: new report screen showing a complete statement for a Bank Fixed Deposit account. Search accounts by name or number, filter by FD certificate and date range, and view opening balance, all transactions with operation type, running balance, and closing balance. Supports Print, PDF, and Excel export." },
    ],
  },
  {
    version: "1.0.32",
    date: "2026-08-19",
    changes: [
      { type: "fix", text: "Saving, FD, and RD Interest Posting: fixed a critical bug where each account in a batch posting received its own separate voucher. All accounts in a single posting run now share one voucher — one combined debit to the interest expense account and one credit per member account." },
    ],
  },
  {
    version: "1.0.31",
    date: "2026-08-19",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
  {
    version: "1.0.30",
    date: "2026-08-19",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
  {
    version: "1.0.29",
    date: "2026-08-19",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
  {
    version: "1.0.28",
    date: "2026-08-18",
    changes: [
      { type: "new", text: "Bank FD Mature/Renew: new screen to close a matured Bank Fixed Deposit. Shows only genuinely matured certificates. Supports TDS deduction (only when a TDS account is linked to the FD's account head). Includes a Renew toggle to roll over into a new FD." },
      { type: "new", text: "Bank FD Pre-Mature: new screen to close a Bank FD before its maturity date. Applies a configurable penalty rate to derive the effective interest rate. Calculates pre-mature payout and optionally deducts TDS." },
    ],
  },
  {
    version: "1.0.27",
    date: "2026-08-18",
    changes: [
      { type: "fix", text: "Vouchers: accounts opened after the voucher date no longer appear in account dropdowns — e.g. an account opened April 5 will not show up in a voucher dated April 2." },
      { type: "fix", text: "Vouchers: products whose effective date is after the voucher date are now filtered out. When you change the voucher date, the product list refreshes automatically." },
    ],
  },
  {
    version: "1.0.26",
    date: "2026-08-18",
    changes: [
      { type: "fix", text: "Saving Interest Posting: fixed a bug where all accounts always showed 1% interest rate regardless of the configured slab. Slab wise products now correctly look up the rate from the interest slab table." },
      { type: "new", text: "Saving Interest Posting: Fixed Rate products now prompt the user to enter the rate before calculating — the entered rate is applied uniformly to all accounts." },
      { type: "improvement", text: "Saving Product Master: rate method options simplified to 'Fixed Rate' and 'Slab wise/Change Rate' — the redundant 'Changed Rate' option has been removed." },
    ],
  },
  {
    version: "1.0.25",
    date: "2026-08-18",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
  {
    version: "1.0.24",
    date: "2026-08-18",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
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
