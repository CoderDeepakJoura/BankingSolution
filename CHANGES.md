# Loan Recovery — Bank-Grade Interest Implementation

## Summary

This change replaces the placeholder interest calculation in the loan recovery module with a
correct, bank-grade implementation. The core problem was that interest was being read from the
wrong table (`loanaccountrecoveryinterest`, which stores only opening-balance imports), while
the real interest ledger is `voucherrecintdetail`.

---

## Database Changes

### Modified Tables

#### `loanproductdefinition`
| Change | Column | Type | Default |
|--------|--------|------|---------|
| **Added** | `intcalcmethod` | `VARCHAR(12)` | `'Schedule'` |

**Purpose:** Controls how unposted (dynamic) interest is calculated for a loan product.

| Value | Meaning |
|-------|---------|
| `Schedule` | Sum `InterestAmt` from overdue kist schedule rows |
| `Balance` | `P × R × Days / 365` on current outstanding principal |
| `MinBalance` | `MinP × R × Days / 365` — minimum principal in the period |

**Migration SQL** (already in `scripts/Scripts.sql` Section 13):
```sql
ALTER TABLE loanproductdefinition
  ADD COLUMN IF NOT EXISTS intcalcmethod VARCHAR(12) DEFAULT 'Schedule';
```

### No Tables Added or Removed

The existing table structure is sufficient. The fix was using the **correct existing tables**:

| Table | Role |
|-------|------|
| `voucherrecintdetail` | **Primary interest ledger** — Cat 1/2 IntDr = posted, Cat 3 IntCr = recovered |
| `loanaccountbalancedetail` | Principal movement log (advancements + recoveries) |
| `loanaccopeningbalance` | Opening balance only (imported/migrated accounts) |
| `accountkistschedule` | Per-kist principal + interest schedule |
| `loanaccountrecoveryinterest` | Opening-balance interest import only — NOT used for live tracking |

---

## Interest Category Definitions

| Cat ID | Name | IntDr source | IntCr source |
|--------|------|-------------|-------------|
| 1 | StdInterest | Interest Posting Voucher | Recovery (auto-post path) |
| 2 | PenalInterest | Interest Posting Voucher | Recovery (auto-post path) |
| 3 | StdRecoverable | *(sum of Cat 1+2 after posting)* | Recovery against posted interest |
| 4 | OverdueRecoverable | Overdue principal posting | Recovery against overdue kist principal |

---

## Interest Calculation Logic (`GetLoanBalanceAsync`)

### Posted interest (from `voucherrecintdetail`)
```
postedStdInt   = SUM(IntDr) WHERE IntCatId = 1
postedPenalInt = SUM(IntDr) WHERE IntCatId = 2
totalPosted    = postedStdInt + postedPenalInt

postedRecovered   = SUM(IntCr) WHERE IntCatId = 3   ← Cat 3 recovery credits
unpostedRecovered = SUM(IntCr) WHERE IntCatId IN (1,2)  ← auto-post-recovery credits

stdRec = MAX(0, totalPosted + openStdInt - postedRecovered)   → Cat 3 outstanding
ovdRec = MAX(0, ovdPosted   + openOvdInt - ovdRecovered)      → Cat 4 outstanding
```

### Dynamic (unposted) interest

#### Schedule method (default)
```
scheduleIntDue = SUM(kistschedule.InterestAmt) for overdue kists + openStdInt
dynStdInt      = MAX(0, scheduleIntDue - totalPosted - unpostedRecovered)

dynPenalInt per kist = Principal × OverdueRate × DaysSinceDue / 365
dynPenalInt          = MAX(0, Σ(above) - postedPenalInt)
```

#### Balance method
```
days        = calcToDate - calcFromDate
dynStdInt   = MAX(0, principalBal × StdRate × days / 365 + openStdInt - posted - unpostedRecovered)
dynPenalInt = Σ(overduePrincipal_i × OverdueRate × daysOverdue_i / 365) - postedPenalInt
```

#### Minimum Balance method
```
effectivePrincipal = min(daily balance in [calcFromDate, calcToDate])
dynStdInt          = MAX(0, effectivePrincipal × StdRate × days / 365 + openStdInt - posted - unpostedRecovered)
dynPenalInt        = same as Balance method (penal is always on overdue kist principal)
```

### Interest calculation period
- **fromDate**: date of last Cat 1/2 IntDr entry in `voucherrecintdetail`; falls back to `LoanDate`
- **toDate**: today

---

## Save Logic (`AddLoanRecoveryVoucherAsync`)

### Auto-posting of unposted interest (Cat 1 / Cat 2)
When the recovery amount covers unposted dynamic interest, the system simultaneously:
1. Writes `IntDr = amount` (formal posting record)
2. Writes `IntCr = amount` (recovery record)

Both in the same `voucherrecintdetail` row. This means:
- No separate "interest posting" voucher needs to run before recovery can happen.
- The audit trail is complete: posted and recovered in one transaction.

### Posted interest recovery (Cat 3 / Cat 4)
Only `IntCr` is written — the `IntDr` already exists from a prior interest posting voucher.

### Removed
- Writes to `loanaccountrecoveryinterest` during recovery have been **removed**.
  That table was incorrectly being used to track live interest; it is for opening-balance imports only.

---

## Backend Files Modified

| File | Change |
|------|--------|
| `BankingPlatform.Infrastructure/Models/ProductMasters/Loan/LoanProductDefinition.cs` | Added `IntCalcMethod` string property |
| `BankingPlatform.API/DTO/Voucher/Loan/LoanRecoveryDTO.cs` | Added 5 new fields to `LoanRecoveryBalanceDTO` |
| `BankingPlatform.API/Service/Vouchers/Loan/LoanRecoveryVoucherService.cs` | Complete rewrite — correct interest ledger, three calc methods, auto-posting |
| `scripts/Scripts.sql` | Added `intcalcmethod` ALTER TABLE in Section 13 |

### New fields in `LoanRecoveryBalanceDTO`

| Field | Type | Purpose |
|-------|------|---------|
| `OverdueInstallments` | `int` | Count of past-due kist schedule rows |
| `OverduePrincipal` | `decimal` | Sum of principal from overdue kist rows |
| `InterestCalcFromDate` | `DateTime?` | Start of current interest period (null if no prior posting) |
| `InterestCalcToDate` | `DateTime?` | End of current interest period (today) |
| `IntCalcMethod` | `string` | Calculation method used |

---

## Frontend Files Modified

| File | Change |
|------|--------|
| `client/src/services/vouchers/loan/loanRecoveryApi.ts` | Added 5 new fields to `LoanRecoveryBalanceDTO` TS interface |
| `client/src/pages/vouchers/Loan/loanrecovery.tsx` | Interest Detail tab now shows: calc method, period, overdue installments, overdue principal, per-category descriptions |

---

## No Breaking Changes

- The `RecoverySeq` allocation logic is unchanged.
- The voucher header, Cr entry, Dr entries, and `loanaccountbalancedetail` writes are unchanged.
- The `SearchLoanAccountsAsync` and `GetKistScheduleAsync` endpoints are unchanged.
- The `LoanAccountRecoveryInterest` model and table are left in place (for opening-balance data).