# BankingPlatform — CLAUDE.md

Codebase documentation for AI-assisted development. Keep this file updated as the project evolves.

---

## Project Structure

```
BankingPlatform/
├── client/                          # React + TypeScript frontend (Vite)
├── backend/
│   ├── BankingPlatform.API/         # ASP.NET Core 8 Web API
│   ├── BankingPlatform.Infrastructure/  # EF Core, DbContext, Models, Migrations
│   └── BankingPlatform.Common/      # Shared enums and classes
└── scripts/
    └── Scripts.sql                  # Authoritative PostgreSQL schema (idempotent, safe to re-run)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Redux Toolkit, react-select, SweetAlert2 |
| Backend | ASP.NET Core 8, EF Core (PostgreSQL / Npgsql) |
| Database | PostgreSQL |
| Auth | JWT Bearer tokens + refresh tokens |

---

## Key Conventions

### Backend
- All controllers use `[Authorize]` unless explicitly public
- Services are registered in `Program.cs`; no service locator pattern
- DateTime stored as `DateTimeKind.Unspecified` in DB (no UTC offset)
- Composite PKs are the norm: `(id, branchid)` on almost every table
- `async` methods must not use `ref` parameters — return updated values instead
- Balance formula for member accounts: `SUM(Cr) - SUM(Dr)` from `vouchercreditdebitdetails` where status `"V"` or `"A"`, plus opening balance where applicable

### Frontend
- All screens use `w-full` — never `max-w-*` centered containers
- Every screen needs an outer gradient background wrapper + styled gradient header bar with back button + icon; never just a bare `<h2>`
- DatePicker component accepts `min`/`max` props in `YYYY-MM-DD` format
- Redux `user` slice holds: `branchid`, `branchCode`, `workingdate`, `sessionFromDate`, `sessionToDate`, `sessionId`, `isSu`, `branchGstNo`, `branchStateId`, `lastSeenVersion`
- `canEnterOpeningBalance(user, date)` — utility to check if opening balance entry is allowed (first session logic)
- `isOpeningEntry` flag controls opening balance UI visibility throughout the app
- react-select `control` style must always include `cursor: "pointer"` — react-select renders divs, not native selects, so the pointer cursor must be set explicitly

### Route Registry — CRITICAL
- **`client/src/routes/routeRegistry.tsx`** is the single source of truth for ALL app routes and the header search
- Adding a new screen = add ONE entry to `ROUTES` array in `routeRegistry.tsx` with `path`, `element`, `label`, and `category`
- `App.tsx` maps over `ROUTES` automatically — do NOT add `<Route>` manually in `App.tsx`
- `SEARCHABLE_SCREENS` is derived automatically from entries that have both `label` and `category`
- Header search (`HeaderLandingPage.tsx`) imports `SEARCHABLE_SCREENS` — no manual `ALL_SCREENS` array exists anymore
- Routes without `label`/`category` (param routes, detail/info pages) are registered in router but hidden from search

### Scripts.sql
- Every new column must appear in BOTH the `CREATE TABLE` block AND the incremental `ALTER TABLE ADD COLUMN IF NOT EXISTS` section at the bottom
- New FK constraints go in the incremental section using `DO $$ BEGIN IF NOT EXISTS ... END $$` pattern (idempotent)

---

## Account Types (Enums.AccountTypes)

| Value | Type |
|---|---|
| 2 | Saving |
| 3 | General |
| 4 | ShareMoney |
| 5 | RD |
| 6 | FD |

---

## Voucher Types / Sub-Types

Defined in `Enums.VoucherType` and `Enums.VoucherSubType`.

| VoucherType | Name |
|---|---|
| 1 | Member |
| 2 | Saving |
| 3 | Fixed Deposit |
| 4 | Recurring Deposit |
| 5 | Loan |
| 6 | Cash |
| 7 | Journal |
| 9 | Inter Branch |

| SubType | Name |
|---|---|
| 1 | Share Money |
| 2 | Deposit |
| 3 | Withdrawal |
| 4 | Interest Posting |
| 5 | Mature |
| 6 | Renew |
| 7 | Pre-Mature |
| 8 | Kist |
| 9 | Loan Advancement |
| 10 | Loan Recovery |
| 11 | Payment/Receipt |
| 12 | Transfer |
| 13 | Loan Interest Posting |
| 14 | Loan Expense |
| 15 | Loan Interest Posting (alt) |
| 16 | RD Multiple Kist |
| 19 | IB Saving Dep — HO Step 1 (HOToBranch source) |
| 20 | IB Saving Dep — Branch Credit (HO→Br, dest branch final) |
| 21 | IB Saving Dep — Source Branch Step 1 (BranchToBranch source) |
| 22 | IB Saving Dep — HO Settlement (BranchToBranch HO step) |
| 23 | IB Saving Dep — Dest Branch Credit (BranchToBranch final) |
| 24 | IB Saving Wdl — HO Step 1 (HOToBranch source, Dr IB-Ref Cr Cash) |
| 25 | IB Saving Wdl — Dest Branch Debit (HO→Br, dest branch final, Dr Customer Cr HO-Ref) |
| 26 | IB Saving Wdl — Source Branch Step 1 (BranchToBranch, Dr HO-Ref Cr Cash) |
| 27 | IB Saving Wdl — HO Settlement (BranchToBranch, Dr Dest-Ref Cr Source-Ref) |
| 28 | IB Saving Wdl — Dest Branch Debit (BranchToBranch final, Dr Customer Cr HO-Ref) |

---

## Inter-Branch (IB) Voucher System

### Overview
Enables saving deposits and withdrawals across branches. Two flow types:

| FlowType | Steps | Description |
|---|---|---|
| `HOToBranch` | 2 steps | HO initiates (Step 1) → Dest branch approves (Step 3) |
| `BranchToBranch` | 3 steps | Source branch initiates (Step 1) → HO settles (Step 2) → Dest branch approves (Step 3) |

### Database Table: `interbranchvoucher`
Key columns:
- `flowtype` — `"HOToBranch"` or `"BranchToBranch"`
- `status` — `"Pending"` → `"HOConfirmed"` / `"BranchCompleted"` → `"Completed"`
- `frombrid`, `destbrid` — source and destination branch IDs
- `step1voucherid`, `step2voucherid`, `step3voucherid` — voucher IDs for each step
- `step2brid`, `step3brid` — branch IDs that performed each step
- `step2draccid/craccid`, `step3draccid/craccid` — account IDs used in each step
- `step2draccname/craccname`, `step3draccname/craccname` — pre-resolved account names

### Reference Accounts: `otherbranchaccounts`
Table `{brid, otherbrid, accid}` — defines which account a branch uses to represent another branch.
- Used by HO branch to look up which GL account maps to the source/dest branch pair
- Query: `WHERE brid = <hoBranchId> AND otherbrid = <targetBranchId>`

### Status State Machine
```
"Pending"
   ├─→ (Step 2 done)  "HOConfirmed"
   └─→ (Step 3 done first, BranchToBranch) "BranchCompleted"

"HOConfirmed"
   └─→ (Step 3 done) "Completed"

"BranchCompleted"
   └─→ (Step 2 done) "Completed"
```
**Rule**: `"Completed"` only when BOTH Step 2 AND Step 3 are done.

### VoucherSubTypes by Step

**Deposit (VoucherType = "IBSavingDeposit")**

| FlowType | Step | SubType | Who acts | Dr → Cr |
|---|---|---|---|---|
| HOToBranch | Step 1 | 19 | HO branch | Cash → Dest-Ref |
| HOToBranch | Step 3 | 20 | Dest branch | HO-Ref → Customer |
| BranchToBranch | Step 1 | 21 | Source branch | Cash → HO-Ref |
| BranchToBranch | Step 2 | 22 | HO branch | Source-Ref → Dest-Ref |
| BranchToBranch | Step 3 | 23 | Dest branch | HO-Ref → Customer |

**Withdrawal (VoucherType = "IBSavingWithdrawal") — all Dr/Cr reversed vs deposit**

| FlowType | Step | SubType | Who acts | Dr → Cr |
|---|---|---|---|---|
| HOToBranch | Step 1 | 24 | HO branch | Dest-Ref → Cash |
| HOToBranch | Step 3 | 25 | Dest branch | Customer → HO-Ref |
| BranchToBranch | Step 1 | 26 | Source branch | HO-Ref → Cash |
| BranchToBranch | Step 2 | 27 | HO branch | Dest-Ref → Source-Ref |
| BranchToBranch | Step 3 | 28 | Dest branch | Customer → HO-Ref |

### Service: `IBSavingDepositService.cs`
Key methods:
- `GetIncomingForBranchAsync(brId)` — returns vouchers for dest branch to approve (Step 3). Does NOT wait for Step 2; shows vouchers from the moment Step 1 exists. Falls back to `otherbranchaccounts` lookup for HO branch ref account when Step 2 hasn't happened yet.
- `GetPendingForHOAsync(brId)` — returns vouchers where this branch is the HO intermediary. Filters using `otherbranchaccounts`: only shows vouchers where BOTH `FromBrId` AND `DestBrId` are in the branch's mapped `otherbrid` set. Pre-resolves Step2 Dr/Cr names adjusted for withdrawal vs deposit orientation.
- `WriteFinalVoucherAsync(dto)` — creates deposit Step 3 voucher (Dr=HO-Ref, Cr=Customer). Sets status to `"BranchCompleted"` if BranchToBranch and Step 2 not yet done; else `"Completed"`. Writes `vouchersavingdetail` with operation `"SD"`.
- `WriteWithdrawalFinalVoucherAsync(dto)` — creates withdrawal final-step voucher (Dr=Customer, Cr=HO-Ref). Same status logic. Writes `vouchersavingdetail` with operation `"SW"`.
- `CreateWithdrawalStep1Async(dto)` — creates withdrawal Step 1 (Dr=IB-Ref, Cr=Cash). Validates DrAccId is in `otherbranchaccounts`. VoucherType = `"IBSavingWithdrawal"`.
- `CreateBranchToHOSettlementAsync(dto)` — deposit Step 2. Sets status to `"Completed"` if Step 3 already done; else `"HOConfirmed"`.
- `CreateWithdrawalHOSettlementAsync(dto)` — withdrawal Step 2 (Dr=Dest-Ref, Cr=Source-Ref — reversed from deposit).
- `GetNotificationsAsync(brId)` — returns `IBNotificationDTO` with:
  - `incoming`: vouchers where `DestBrId = brId`, `Step3VoucherId = null`, `Status != "Completed"`
  - `pendingHO`: vouchers where BOTH `FromBrId` AND `DestBrId` are in `hoMappedBrIds` (otherbranchaccounts for this branch), and `Step2VoucherId = null`, `Status != "Completed"`

### Narration (Step 2)
Auto-filled default: `"HO settlement for IB deposit of ₹{amount} from {fromBrCode}-{fromBrName} to {destBrCode}-{destBrName} for A/C {destAccNo} ({destAccName})"`
User can edit before confirming. Passed as `dto.Narration` override.

### Frontend Pages
- `IBPendingVouchers.tsx` — HO branch approves Step 2. Shows pre-resolved Dr/Cr account names. Has editable narration textarea with auto-fill. Handles both deposit and withdrawal — labels swap based on `voucherType`.
- `IBIncomingVouchers.tsx` — Dest branch approves Step 3 (or Step 2 for HOToBranch). Handles both deposit and withdrawal — "credit/debit" labels, button text, and Dr/Cr annotations all flip based on `voucherType`. For pending withdrawal, `step3DrAccName` holds the pre-resolved HO-ref (Cr side), and `destAccName` is used for the Dr (customer) display.
- `savingwithdrawal.tsx` — Now supports IB mode. Adds "Destination Branch" selector; when set, routes submit to `ibVoucherApi.createSavingWithdrawalStep1` with `drAccId=ibDrAccId` (IB-ref), `crAccId=creditAccount` (cash). Shows "IB Ref Debit Account" label below the branch selector.
- Status badge colors: `"Pending"` → yellow, `"HOConfirmed"` → blue, `"BranchCompleted"` → violet, `"Completed"` → green

### IB Voucher Deletion Protection (`VoucherOperationsService.DeleteVoucherAsync`)
- **Delete Step 1**: blocked if Step 2 OR Step 3 exists. User must delete later steps first.
- **Delete Step 2**: allowed. After deletion, nulls all Step2 fields on IB record. Status reverts:
  - If Step 3 exists → `"BranchCompleted"`
  - If Step 3 doesn't exist → `"Pending"`
- **Delete Step 3**: allowed. After deletion, nulls all Step3 fields on IB record. Status reverts:
  - If Step 2 exists → `"HOConfirmed"`
  - If Step 2 doesn't exist → `"Pending"`

### Notification Bell (`HeaderLandingPage.tsx`)
- `NotificationBell` component fetches `/IBVoucher/notifications/{brId}` on mount and every 60s
- Uses `createPortal` for the dropdown to avoid overflow clipping
- Two refs: `bellRef` (button) + `dropdownRef` (portal div) — both checked in mousedown outside-click handler to prevent race condition
- Navigates to `/ib-incoming-vouchers` (incoming) or `/ib-pending-vouchers` (pendingHO) on click
- Red badge shows total count

---

## Voucher Search / Voucher Operations

### `VoucherSearch.tsx`
- Date field is disabled — always shows current working date
- Vouchers can only be searched/deleted for the current working date
- **Error surfacing**: catch block uses `err instanceof Error ? err.message : "An unexpected error occurred."` — backend's 400 message (e.g. IB deletion protection) is shown directly in SweetAlert

### Modify Blocked Reasons (`voucherOperationsApi.ts`)
`MODIFY_BLOCKED_REASON` map keyed by `"{voucherType}-{voucherSubType}"` provides specific explanations when a voucher can't be modified. Falls back to generic message using `voucherTypeName — voucherSubTypeName` if key not in map.

### VoucherType / SubType Names (`VoucherOperationsService.cs`)
`GetVoucherTypeName` and `GetVoucherSubTypeName` — used for display in Voucher Search. IB subtypes 19–23 are registered here.

---

## FD Account Master

### Opening Balance (per-detail, not combined)
- Opening balance is stored **per FD detail** in `fdaccountdetail.openingbalance` + `fdaccountdetail.openingbalancetype` (`"Cr"` / `"Dr"`)
- The old combined `accopeningbalance` row for FD is no longer written on create/update
- Visibility controlled by `isOpeningEntry` — same rule as all other opening balance fields
- In `CreateNewFDAccAsync`: FD details are **always saved** (opening entry or real voucher). Previously they were only saved inside the real-voucher block — this was a bug that has been fixed.

### Maturity Amount Calculation
- Formula: `A = P × (1 + r/n)^(n × t)` where `t = actualCalendarDays / daysInAYear`
- `daysInAYear` is configured per product in `fdproductbranchwiserule.daysinayear` (default 360 if not set)
- Backend endpoint `fetch-fd-related-info` now returns `daysInAYear` in its response
- Frontend stores `daysInAYear` in `fdDaysInAYear` state (updated each time the backend responds) and passes it to `calculateMaturityLocally` — previously hardcoded 360 which caused wrong maturity amounts when product was set to 365

### FD Date Validation
- FD Date cannot be before Account Opening Date — enforced at both DatePicker (`min` prop) and `handleAddFdDetail` validation

### `slabid` in `fdaccountdetail`
- Made nullable (`int?`) — FK to `fdinterestslab` uses `NULL` when no slab found (slabId = 0), preventing FK violation

---

## Balance Calculations for FD Accounts

Three places updated to include per-detail opening balance:

1. **`FDLedgerService.CalculateOpeningBalanceAsync`** — reads `fdaccountdetail.openingbalance` instead of `accopeningbalance`
2. **`FetchDataController.GetAccountBalance`** — detects FD account type and adds per-detail opening balance sum
3. **`JournalVoucherService.CheckPersonalAccountBalances`** — when debiting an FD account, adds per-detail opening balance to available balance before comparing

---

## Journal Voucher (GST)

- GST stock entries are linked to journal vouchers via `StockMain.VmId = voucherId`
- `StockMain` has NO cascade from `voucher` — must be manually deleted before voucher deletion
- `VoucherCreditDebitDetails` has ON DELETE CASCADE from `voucher`
- In modify mode: auto-generated GST tax Cr entries are filtered out of the entry list using tax account IDs fetched via `GET /JournalVoucher/{voucherId}/gst`
- Balance check for personal accounts (Saving, RD, FD, ShareMoney) runs before saving

---

## General Account Master

- `accountNumber` validation has NO `minLength` — single-digit account numbers like "1" are valid
- Validation: `required`, `maxLength: 20`, `pattern: /^\d+$/`

---

## Dashboard

- Redesigned with gradient hero card (blue→indigo→violet) showing branch name + code badge inline
- Branch code displayed both in hero badge and info chip row
- Quick access grid with 6 colored navigation tiles
- `branchCode` is in Redux `user` slice (set from `/auth/me` response via `Layout.tsx`)

---

## Database — Foreign Key Status

All FK constraints are defined in `scripts/Scripts.sql`. Key notes:

| Table | Constraint | Type | Notes |
|---|---|---|---|
| `fdaccountdetail` | → `accountmaster` | CASCADE | ✅ |
| `fdaccountdetail` | → `fdinterestslab` | RESTRICT | slabid is nullable |
| `fdinterestslabdetail` | → `fdinterestslab` | RESTRICT | Added |
| `fdinterestslabdetail` | → `fdinterestslabinfo` | CASCADE | Added |
| `vouchersavingdetail` | → `voucher` | RESTRICT | Added — app explicitly deletes before voucher |
| `voucherrecintdetail` | → `voucher` | **None** | Intentionally unconstrained — `DeleteVoucherAsync` does NOT clean this up first; adding RESTRICT would break loan interest posting / recovery voucher deletions |
| `accopeningbalance` | → `accountmaster` | CASCADE | Added — owned data |
| `rdaccountdetail` | → `accountmaster` | CASCADE | Added — `DeleteRDAccountAsync` removes accountmaster directly (comment says "CASCADE handles rdaccountdetail") |
| `accountkistdetail` | → `accountmaster` | RESTRICT | Added — explicitly removed first in `DeleteLoanAccountAsync` |
| `accountlimitdetail` | → `accountmaster` | RESTRICT | Added — explicitly removed first in `DeleteLoanAccountAsync` |
| `loanslabdetail` | → `loanslab` | RESTRICT | Added |

### Orphan Data Handling
All FK additions in the `REFERENTIAL INTEGRITY` section of Scripts.sql now include a `DELETE ... WHERE NOT EXISTS` cleanup immediately before the `DO $$ BEGIN ADD CONSTRAINT` block. This makes the script safe to run on existing databases with stale data. No manual one-time cleanup queries are needed.

---

## What's New / Changelog Feature

- **Version source of truth**: `client/src/constants/config.ts` — `APP_VERSION` and `APP_VERSION_DATE`. Update both here on every deploy.
- **Changelog content**: `client/src/utils/changelog.ts` — hardcoded array of `{ version, date, changes[] }`. Add a new entry at the top of the array on every deploy. `APP_VERSION` is re-exported from `constants/config.ts`.
- **DB storage**: `user.lastseenversion VARCHAR(20) DEFAULT '0.0.0'` — tracks the last version each user acknowledged.
- **Backend**: `GET /auth/me` returns `LastSeenVersion`; `PATCH /auth/acknowledge-version` updates it in DB.
- **Frontend flow**: `Layout.tsx` compares `data.lastSeenVersion` from `/auth/me` with `APP_VERSION`; shows `WhatsNewModal` if they differ. On "Got it!", calls `acknowledge_version()` and closes.
- **Footer button**: `Footer.tsx` accepts `onWhatsNewClick` prop — clicking "🎉 What's New" reopens the modal manually anytime. Layout passes `() => setShowWhatsNew(true)`.
- **Change types**: `"new"` (green), `"fix"` (red), `"improvement"` (blue) — rendered as colored badges in the modal.

### Deploy checklist for a new version
1. Bump `APP_VERSION` in `constants/config.ts`
2. Update `APP_VERSION_DATE` in `constants/config.ts`
3. Add new entry at top of `changelog` array in `utils/changelog.ts`

---

## RD Account Master — Known Casing Rules

- Backend `RDAccountDetailDTO` property `RdSlabId` → serialized as `rdSlabId` (capital S preserved). Frontend must use `rd.rdSlabId`, NOT `rd.rdslabId`.
- `compoundingInterval` in state stores numeric string values `"3"` / `"4"` / `"5"` / `"6"` matching native `<select>` option values — do NOT apply a reverse label map when loading in modify mode.
- Default cash account (By Cash debit side) is fetched via `commonservice.default_cash_in_hand_account(branchId)` in `Promise.all` during `fetchData`, stored in `defaultCashAccountId` state, and restored on reset.

---

## EF Core Migrations

Migrations live in `BankingPlatform.Infrastructure/Migrations/`. Recent ones:

| Migration | What it does |
|---|---|
| `20260531120000_AddOpeningBalanceToFDDetail` | Adds `openingbalance`, `openingbalancetype` to `fdaccountdetail` |
| `20260531130000_MakeFDDetailSlabIdNullable` | Makes `fdaccountdetail.slabid` nullable, re-adds FK |
| `20260613100000_AddVoucherIdToLoanAccountBalanceDetail` | Adds `voucherid` to `loanaccountbalancedetail` |
| `20260614100000_AddLastSeenVersionToUser` | Adds `lastseenversion` to `user` table for What's New feature |

---

## Common Bugs Fixed

1. **`ref` in async C# method** — `ProcessGstEntries` in `JournalVoucherService` used `ref int row` (illegal in async). Fixed: changed to value param + `Task<int>` return.
2. **FD details not saved for opening entries** — `CreateNewFDAccAsync` only saved FD details inside the real-voucher block. Opening entries silently created accounts with no FD details in DB. Fixed: FD details always saved regardless of voucher type.
3. **`rdaccountdetail` orphan bug** — `DeleteRDAccountAsync` comment said "CASCADE handles rdaccountdetail" but no CASCADE FK existed. RD detail rows were silently orphaned on account deletion. Fixed: CASCADE FK added.
4. **FD maturity amount wrong when product uses 365-day year** — `calculateMaturityLocally` hardcoded 360. Now `daysInAYear` is returned by backend and stored in state.
5. **FD opening balance visibility** — Combined opening balance at account level removed; replaced with per-FD-detail opening balance using same `isOpeningEntry` visibility rule.
6. **RD modify mode — compoundingInterval blank** — `reverseCompoundingMap` was converting DB integer to label string ("Monthly") which didn't match `<select>` option values ("3"/"4"/"5"/"6"). Fixed: use `rd.compoundingInterval.toString()` directly.
7. **RD modify mode — slab name not loaded** — `GetRDAccountByIdAsync` never populated `slabName` in the DTO. Fixed: added DB lookup against `rdinterestslab` by `RdSlabId`.
8. **IB voucher Step 3 not showing without Step 2** — `GetIncomingForBranchAsync` required `Step2VoucherId != null`. Fixed: removed that constraint; Step 3 is independent.
9. **IB notification bell showing wrong data** — `GetNotificationsAsync` initially returned all pending vouchers to all branches. Fixed: `pendingHO` now filtered by checking if BOTH `FromBrId` AND `DestBrId` are in the branch's `otherbranchaccounts` mapped set.
10. **IB `BranchCompleted` status not set** — `WriteFinalVoucherAsync` set `"Completed"` unconditionally. Fixed: sets `"BranchCompleted"` when BranchToBranch and Step 2 not yet done.
11. **Voucher Search delete showed generic error for IB protection** — catch block hardcoded "An unexpected error occurred." Fixed: uses `err.message` from thrown Error (which `parseErrorMessage` populates from the backend JSON response).
12. **Voucher Search modify showed generic "not supported" message** — now shows specific reason per voucher type from `MODIFY_BLOCKED_REASON` map in `voucherOperationsApi.ts`.
13. **Header search required manual array maintenance** — `ALL_SCREENS` in `HeaderLandingPage.tsx` was a separate manually-maintained array. Fixed: `routeRegistry.tsx` is now the single source of truth; `SEARCHABLE_SCREENS` is derived automatically.
14. **`/slab-operations` duplicate route** — App.tsx had two routes with same path; second one (FDInterestSlabOperations) was dead. Fixed in registry: FD interest slab operations now at unique path `/fd-interest-slab-operations`.
