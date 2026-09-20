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
    version: "1.0.67",
    date: "2026-09-20",
    changes: [
      { type: "fix", text: "Loan interest: Schedule method and penal calculation now exclude pre-session kist interest — amounts from before the first session are covered by the opening balance entry and no longer double-counted" },
      { type: "fix", text: "Loan period detail: now starts from the first session date instead of the loan origination date; pre-session kist principals excluded from performing balance calculation" },
      { type: "fix", text: "Loan period detail: STD BAL now reduces on the same row the kist becomes due (not the next row); overdue kist principal now shown in the Cr column as an internal STD→OVD transfer" },
    ],
  },
  {
    version: "1.0.66",
    date: "2026-09-20",
    changes: [
      { type: "fix", text: "FD interest posting: cursor now clamped to first session start date — FDs opened before the session no longer generate historical interest periods" },
    ],
  },
  {
    version: "1.0.65",
    date: "2026-09-20",
    changes: [
      { type: "fix", text: "Loan principal balance no longer double-counts opening balance when both TotalBalance and detail rows exist" },
      { type: "fix", text: "Loan period detail: STD BAL now shows performing balance (total minus overdue kist principal); standard interest calculated on performing balance only" },
    ],
  },
  {
    version: "1.0.64",
    date: "2026-09-20",
    changes: [
      { type: "fix", text: "Loan penal interest: overdue kist days now clamped to first session start date — pre-session kists no longer accumulate thousands of overdue days" },
    ],
  },
  {
    version: "1.0.63",
    date: "2026-09-20",
    changes: [
      { type: "fix", text: "Loan Interest Posting: interest calculation now starts from the branch's first session date (not the account opening date) for accounts opened before the session started — opening balance and opening interest already cover the pre-session period" },
    ],
  },
  {
    version: "1.0.62",
    date: "2026-09-20",
    changes: [
      { type: "fix", text: "Loan Recovery: Cat 1 (unposted standard) and Cat 2 (unposted penal) interest no longer included in the recoverable Int Max cap, validation, or allocation — only Cat 3 (Std. Recoverable) and Cat 4 (Overdue Recoverable) count toward recoverable interest" },
    ],
  },
  {
    version: "1.0.61",
    date: "2026-09-20",
    changes: [
      { type: "fix", text: "Balance Sheet: reverted fiscal-year filter on P&L heads — net profit calculation restored to all-time cumulative as originally designed" },
    ],
  },
  {
    version: "1.0.60",
    date: "2026-09-20",
    changes: [
      { type: "fix", text: "Balance Sheet: Net Profit now matches the P&L report — income/expense heads are restricted to the current fiscal year (April 1 onwards) instead of accumulating from all historical periods" },
    ],
  },
  {
    version: "1.0.59",
    date: "2026-09-20",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
  {
    version: "1.0.58",
    date: "2026-09-20",
    changes: [
      { type: "improvement", text: "Loan Recovery Voucher: embedded ledger redesigned to match the Loan Account Ledger report style — dark header, yellow opening balance row, separate columns for Advancement (DR), Int DR, Int CR, Recovery (CR), and Balance with Dr/Cr suffix" },
    ],
  },
  {
    version: "1.0.57",
    date: "2026-09-20",
    changes: [
      { type: "fix", text: "Loan Interest Posting: LimitWise loans now calculate interest correctly — rate was only being read from accountkistdetail which is empty for LimitWise; now falls back to accountlimitdetail.StandardInterestRate and OverdueInterestRate" },
      { type: "fix", text: "Loan Recovery Voucher ledger: opening balance no longer double-counts accountlimitdetail rows when TotalBalance is already set — same root cause as the recovery outstanding fix in v1.0.56" },
      { type: "fix", text: "Loan Recovery Voucher ledger: opening balance date no longer shows '01-January-1' (DateTime.MinValue) — now uses the account's LoanDate; shows '—' when no date is available" },
    ],
  },
  {
    version: "1.0.56",
    date: "2026-09-20",
    changes: [
      { type: "fix", text: "Loan Ledger: opening interest (OpenInt) for Stand loans now appears in the INT DR column of the opening balance row — was silently missing even when set in migration data" },
      { type: "fix", text: "Loan Ledger: total INT DR now correctly includes the opening interest in all three output paths (screen, Excel export, print)" },
      { type: "fix", text: "Loan Recovery: fixed principal double-count — loanaccountbalancedetail (bifurcation rows) were being added on top of TotalBalance, inflating the outstanding principal" },
      { type: "fix", text: "Loan Recovery: OpenInt (opening recoverable interest) was wrongly added to unposted standard interest (Cat 1) causing it to appear twice — it now correctly appears only in Cat 3 (Standard Recoverable)" },
      { type: "fix", text: "Loan Recovery: unposted interest (Cat 1 Standard Interest, Cat 2 Penal Interest) removed from Total Outstanding and allocation — only formally posted interest (Cat 3 + Cat 4) is now recoverable; run an IP voucher first to make unposted interest recoverable" },
      { type: "improvement", text: "Loan Account Master: Opening Interest, Int Type, Opening Overdue Int, Overdue Int Type, and Overdue Date fields are now hidden when the product's interest posting is set to Add in Balance — these fields are not applicable for AddInBalance loans" },
    ],
  },
  {
    version: "1.0.55",
    date: "2026-09-18",
    changes: [
      { type: "fix", text: "Loan Account Master: legacy accounts (migrated from SQL Server) now correctly show their account number in the A/C No. field — was showing internal DB id instead of the actual account number" },
      { type: "fix", text: "FD Account Master: same legacy account number fix applied — suffix now correctly restored from stored account number instead of internal id" },
      { type: "new", text: "Product deletion protection: Saving, FD, RD, and Loan products can no longer be deleted if accounts, branch-wise rules, or interest slabs reference them — a clear breakdown of where the product is in use is shown" },
      { type: "fix", text: "Login: fixed null crash in LogErrors when JWT claims are absent (e.g. during login failure) — Int32.Parse now safely handles missing claims" },
    ],
  },
  {
    version: "1.0.54",
    date: "2026-09-18",
    changes: [
      { type: "fix", text: "RD Financial Report: P&L closing voucher (Journal VType=7, SubType=39) now correctly excluded from both period Dr/Cr columns and closing balance — was being incorrectly included because the filter used the legacy SQL Server type (VType=2) instead of the new system type" },
      { type: "fix", text: "Loan Product Master: edit mode no longer crashes with 'Cannot read ratioOrPerc of null' — backend data is now merged with safe defaults so no sub-DTO is ever null" },
      { type: "fix", text: "Loan Product list: clicking Edit no longer throws 'Cannot read then of undefined' — CRUDOperations now handles void-returning modifyEntry without calling .then() on it" },
      { type: "fix", text: "Saving Product Master: loading a product in edit mode now correctly restores all fields — date was computed with wrong format and null sub-DTOs were silently spread as empty objects" },
    ],
  },
  {
    version: "1.0.53",
    date: "2026-09-13",
    changes: [
      { type: "fix", text: "Ledger pages (Saving, RD, Loan, FD, Share Money) now default to the current session's date range — previously the API returned the first-ever session's dates (e.g. 2018-2019), overriding the correct initial state" },
      { type: "fix", text: "Loan Interest Posting batch: penal interest now calculates for accounts whose overdue rate is 0 but a slab is configured — the batch was missing the slab fallback that the single-account view already had" },
      { type: "fix", text: "Loan Interest Period Detail: penal interest now accrues even when the kist schedule table is empty — falls back to KistFirstDate to determine when penal begins, matching the single-account calculation path" },
      { type: "fix", text: "Loan Interest Posting: added guard to prevent kist dates stored before the loan date from creating incorrect period checkpoints (protects against corrupted schedule data)" },
    ],
  },
  {
    version: "1.0.52",
    date: "2026-09-08",
    changes: [
      { type: "new",         text: "Loan Interest Posting: new Period Detail tab shows a full period-by-period interest history from loan date — grouped columns for Standard Interest, Overdue/Penal, and Result with color-coded row types" },
      { type: "fix",         text: "Loan Interest Posting: penal interest now correctly accrues from the kist due date — previously a kist due on the period-start checkpoint was excluded, making OVR INT always zero" },
      { type: "fix",         text: "Loan Interest Posting: Calculation tab penal row now shows the actual overdue kist principal instead of the full loan principal" },
      { type: "improvement", text: "Loan Interest Posting: batch items now carry overdue installments, overdue principal, and penal breakdown — these were missing from batch calculation and only available in the single-account view" },
      { type: "new",         text: "Audit logging system introduced — a separate audit database records create/update/delete events across the platform for tamper-proof audit trails" },
    ],
  },
  {
    version: "1.0.51",
    date: "2026-09-06",
    changes: [
      { type: "fix", text: "Loan Ledger: Stand-type loans now correctly show separate Interest Dr and Interest Cr columns — this was broken when the loan product was set up at the head office branch and viewed from a sub-branch" },
      { type: "fix", text: "Penal interest now calculates correctly for overdue loans — the system previously picked an older loan record with no overdue rate instead of the most recent one; also falls back to the product slab's penal rate if no rate was set on the individual account" },
    ],
  },
  {
    version: "1.0.50",
    date: "2026-09-06",
    changes: [
      { type: "new", text: "Super User Settings: new toggles to show or hide the Bank FD module and the Payroll / Salary module for each branch — both are hidden by default and must be explicitly turned on" },
      { type: "improvement", text: "Bank FD and Payroll screens (sidebar menu, header search, account masters, voucher operations hub) are now automatically hidden for branches where the respective module is turned off in Super User Settings" },
      { type: "improvement", text: "Toggling Bank FD or Payroll in Super User Settings now takes effect immediately across the entire app without needing to log out and back in" },
      { type: "improvement", text: "All voucher save and update confirmations now show the actual voucher number in the success message, so the operator always knows which entry was recorded" },
      { type: "improvement", text: "Loan Interest Posting: clicking the detail icon for a Stand-type loan now shows a full per-kist penal breakdown — kist number, due date, principal outstanding, days overdue, penal rate, and penal interest amount — instead of a single combined figure" },
      { type: "fix", text: "Voucher deletion is now blocked when the voucher is part of a multi-step inter-branch transaction and a later step already exists — the user must remove the later step first before deleting an earlier one" },
    ],
  },
  {
    version: "1.0.49",
    date: "2026-09-06",
    changes: [
      { type: "fix", text: "Loan Ledger: Stand-type loans now show separate Int Dr and Int Cr columns — interest is no longer lumped into the principal advancement column, and the principal balance is unaffected by interest postings" },
      { type: "fix", text: "Penal interest not calculated for account opened 02-Apr with first posting on 31-May (no overdue kists shown), and for second posting on 31-May after earlier posting on 30-Apr (kist due 02-May)" },
      { type: "improvement", text: "Loan Interest Posting: interest detail popup for Stand loans now shows a per-kist penal breakdown (kist number, due date, principal, days overdue, rate, penal interest) instead of a single summary row" },
    ],
  },
  {
    version: "1.0.48",
    date: "2026-09-03",
    changes: [
      { type: "fix", text: "Saving Interest (Monthly Minimum Balance method): minimum balance was incorrectly computed only from day 11 of the month — now correctly scans all days from day 1, and no longer skips months where activity falls in the first 10 days" },
    ],
  },
  {
    version: "1.0.47",
    date: "2026-09-03",
    changes: [
      { type: "fix", text: "Loan Ledger: interest credit (recovery) entries were missing for standard loans — only principal portion was shown; now shows full principal + interest credit" },
    ],
  },
  {
    version: "1.0.46",
    date: "2026-09-02",
    changes: [
      { type: "fix", text: "Security: super-user settings now require isSu claim — non-SU users can no longer call these endpoints directly via the API" },
      { type: "fix", text: "Security: member and account images now require authentication — previously publicly accessible without login" },
      { type: "fix", text: "Security: verbose request logging removed from production — all requests were being logged to console" },
      { type: "fix", text: "Security: JWT secret and DB credentials removed from source code; appsettings.json secrets are now empty in the repo" },
      { type: "fix", text: "Security: password strength indicator in user creation form no longer uses innerHTML — prevents potential XSS" },
      { type: "improvement", text: "AllowedHosts restricted to known domains — was previously set to wildcard (*)" },
      { type: "new", text: "Bank FD Interest Income Account auto-populates when selecting a head code in Mature, Pre-Mature, and Interest Posting screens" },
      { type: "new", text: "Bank FD Interest Income Setting screen — configure per-head-code income account mapping" },
    ],
  },
  {
    version: "1.0.45",
    date: "2026-08-31",
    changes: [
      { type: "fix", text: "Loan Ledger — loan interest posting entries now correctly show in Dr column with proper amount (were missing/showing as zero)" },
    ],
  },
  {
    version: "1.0.44",
    date: "2026-08-31",
    changes: [
      { type: "new", text: "Bank FD Interest Posting screen — calculate and post periodic interest with editable interest/TDS amounts" },
      { type: "improvement", text: "Bank FD Interest Posting added to Voucher Operations page under Bank FD section" },
      { type: "fix", text: "Settings Master — Bank FD Maturity Reminder Days field description fixed (was causing React warning)" },
    ],
  },
  {
    version: "1.0.43",
    date: "2026-08-31",
    changes: [
      { type: "improvement", text: "Minor updates and bug fixes" },
    ],
  },
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
