#!/usr/bin/env python3
"""
migrate.py -- SQL Server (legacy) -> PostgreSQL (new schema) migration
for BankingPlatform.

Usage
-----
  python migrate.py \
    --source "DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=00;Trusted_Connection=yes;Encrypt=yes;TrustServerCertificate=yes;" \
    --target "host=localhost dbname=SecureBankDB user=postgres password=postgres" \
    [--tables CSAS_T_Member,CSAS_T_Voucher]
    [--dry-run]
    [--batch-size 500]

How it works
------------
1. Source: SQL Server via pyodbc (Windows Auth or SA).
2. Target: PostgreSQL via psycopg2.
3. Column mapping:
     - PK column "ID" -> "id"
     - Other columns: strip "C_{TableName}_" prefix, lowercase
       e.g. C_Member_BranchId -> branchid
4. MAPPED tables (in TABLE_RENAMES): inserted into existing new-schema tables.
   Uses INSERT ... OVERRIDING SYSTEM VALUE ... ON CONFLICT DO NOTHING.
5. UNMAPPED tables: auto-created with id GENERATED ALWAYS AS IDENTITY +
   composite PK (id, branchid) when branchid exists.
6. Special: CSAS_T_User passwords (plain text) hashed with PBKDF2-SHA256
   to match PasswordHasher.cs — users keep their existing passwords.
7. Sequences reset to max(id)+1 after each mapped table.
8. Full statistics printed at the end.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import os
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

# ── Stats tracker ────────────────────────────────────────────────────────────

@dataclass
class TableStat:
    legacy_name: str
    new_name: str
    kind: str          # "mapped" | "auto-created" | "skipped"
    src_rows: int = 0
    inserted: int = 0
    created: bool = False
    error: str = ""

stats_log: list[TableStat] = []

def print_stats():
    mapped    = [s for s in stats_log if s.kind == "mapped"]
    auto      = [s for s in stats_log if s.kind == "auto-created"]
    skipped   = [s for s in stats_log if s.kind == "skipped"]

    total_src      = sum(s.src_rows  for s in stats_log)
    total_inserted = sum(s.inserted  for s in stats_log)
    errors         = [s for s in stats_log if s.error]
    tables_created = [s for s in auto if s.created]

    W = 74
    print("\n" + "=" * W)
    print(" MIGRATION SUMMARY ".center(W))
    print("=" * W)
    print(f"  {'Category':<30} {'Tables':>8}  {'Src Rows':>10}  {'Inserted':>10}")
    print(f"  {'-'*30} {'-'*8}  {'-'*10}  {'-'*10}")
    print(f"  {'Mapped (existing schema)':<30} {len(mapped):>8}  "
          f"{sum(s.src_rows for s in mapped):>10,}  {sum(s.inserted for s in mapped):>10,}")
    print(f"  {'Auto-created (unmapped)':<30} {len(auto):>8}  "
          f"{sum(s.src_rows for s in auto):>10,}  {sum(s.inserted for s in auto):>10,}")
    print(f"  {'Skipped (not in source)':<30} {len(skipped):>8}  {'N/A':>10}  {'N/A':>10}")
    print(f"  {'-'*30} {'-'*8}  {'-'*10}  {'-'*10}")
    print(f"  {'TOTAL':<30} {len(mapped)+len(auto):>8}  {total_src:>10,}  {total_inserted:>10,}")
    print(f"\n  New tables created  : {len(tables_created)}")
    print(f"  Errors              : {len(errors)}")
    print("=" * W)

    if mapped:
        print(f"\n  {'-'*W}")
        print(f"  MAPPED TABLES ({len(mapped)})")
        print(f"  {'-'*W}")
        print(f"  {'Legacy Table':<40} {'New Table':<30} {'Rows':>8}")
        print(f"  {'-'*40} {'-'*30} {'-'*8}")
        for s in mapped:
            print(f"  {s.legacy_name:<40} {s.new_name:<30} {s.inserted:>8,}")

    if auto:
        print(f"\n  {'-'*W}")
        print(f"  AUTO-CREATED TABLES ({len(auto)})")
        print(f"  {'-'*W}")
        print(f"  {'New Table':<40} {'Created?':<10} {'Rows':>8}")
        print(f"  {'-'*40} {'-'*10} {'-'*8}")
        for s in auto:
            flag = "YES" if s.created else "existed"
            print(f"  {s.new_name:<40} {flag:<10} {s.inserted:>8,}")

    if errors:
        print(f"\n  {'-'*W}")
        print(f"  ERRORS ({len(errors)})")
        print(f"  {'-'*W}")
        for s in errors:
            print(f"  {s.legacy_name}: {s.error}")

    print("=" * W + "\n")

# ── Dependency checks ────────────────────────────────────────────────────────

try:
    import pyodbc
except ImportError:
    print("ERROR: pyodbc not found. Install: pip install pyodbc")
    print("       Also install 'ODBC Driver 17 for SQL Server' from Microsoft.")
    sys.exit(1)

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("ERROR: psycopg2 not found. Install: pip install psycopg2-binary")
    sys.exit(1)

# ── Value-transform helpers ──────────────────────────────────────────────────

def _yn_to_bool(v):
    """Legacy 'Y'/'N' char → Python bool for PostgreSQL BOOLEAN columns."""
    if v == "Y": return True
    if v == "N": return False
    return bool(v) if v is not None else None

def _tilde_to_comma(v):
    """'1~2~3~' → '1,2,3' (drops empty parts from tilde-delimited strings)."""
    if v is None: return None
    return ",".join(p.strip() for p in str(v).split("~") if p.strip())

# Recovery mode codes in legacy → full names expected by new system
_RECOVERY_MODE_MAP: dict[str, str] = {
    "CS": "Cash", "CH": "Cheque", "S": "Savings", "CU": "Current", "GL": "GL",
}
# Disbursment mode codes in legacy → full names expected by new system
_DISBURSMENT_MODE_MAP: dict[str, str] = {
    "CS": "Current", "CH": "Cheque", "S": "Saving", "CA": "Cash", "GL": "GL",
}

def _tilde_to_recovery_mode(v):
    if v is None: return None
    parts = [p.strip() for p in str(v).split("~") if p.strip()]
    return ",".join(_RECOVERY_MODE_MAP.get(p, p) for p in parts)

def _tilde_to_disbursment_mode(v):
    if v is None: return None
    parts = [p.strip() for p in str(v).split("~") if p.strip()]
    return ",".join(_DISBURSMENT_MODE_MAP.get(p, p) for p in parts)

def _build_member_custom_select(all_src_cols: list) -> Optional[tuple]:
    """
    Inspect CSAS_T_Member columns and build a SELECT that computes:
      - MemberName   = FirstName + ' ' + LastName
      - RelativeName = RelFirstName + ' ' + RelLastName
    Returns (sql, extra_col_overrides) or None if columns not found.
    """
    by_upper = {c["src_name"].upper(): c["src_name"] for c in all_src_cols}

    def find(keywords):
        return next((by_upper[k] for k in by_upper
                     if any(kw in k for kw in keywords)), None)

    fname    = find(["FIRSTNAME", "FNAME", "FIRST_NAME"])
    lname    = find(["LASTNAME",  "LNAME", "LAST_NAME"])
    # relative name columns — look for Rel prefix + first/last name patterns
    rel_cols = [(k, v) for k, v in by_upper.items() if k.startswith("C_MEMBER_REL")]
    relfname = next((v for k, v in rel_cols if "FIRST" in k or "FNAME" in k), None)
    rellname = next((v for k, v in rel_cols if "LAST"  in k or "LNAME" in k), None)

    if not (fname and lname):
        return None

    extras = {}
    concat_parts = [
        f" RTRIM(ISNULL([{fname}],'') + ' ' + ISNULL([{lname}],'')) AS MemberName",
    ]
    extras["membername"] = "membername"

    if relfname and rellname:
        concat_parts.append(
            f" RTRIM(ISNULL([{relfname}],'') + ' ' + ISNULL([{rellname}],'')) AS RelativeName"
        )
        extras["relativename"] = "relativename"

    sql = "SELECT *, " + ", ".join(concat_parts) + " FROM [CSAS_T_Member]"
    return sql, extras

# ── Password hashing (matches PasswordHasher.cs exactly) ─────────────────────

def hash_password(plain: str) -> str:
    """PBKDF2-SHA256, 100k iterations, 16-byte salt, 32-byte key -> Base64."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, 100_000, dklen=32)
    return base64.b64encode(salt + dk).decode("utf-8")

# ── SQL Server -> PostgreSQL type map ─────────────────────────────────────────

def pg_type(sql_type: str, max_len: Optional[int], prec: Optional[int], scale: Optional[int]) -> str:
    t = sql_type.lower()
    if t in ("int", "integer"):           return "INTEGER"
    if t == "bigint":                     return "BIGINT"
    if t in ("smallint", "tinyint"):      return "SMALLINT"
    if t == "bit":                        return "BOOLEAN"
    if t == "money":                      return "NUMERIC(19,4)"
    if t == "smallmoney":                 return "NUMERIC(10,4)"
    if t in ("float", "real"):            return "DOUBLE PRECISION"
    if t in ("date",):                    return "DATE"
    if t in ("time",):                    return "TIME"
    if t in ("datetime", "datetime2", "smalldatetime"): return "TIMESTAMP"
    if t in ("ntext", "text", "xml"):     return "TEXT"
    if t in ("image", "varbinary", "binary"): return "BYTEA"
    if t == "uniqueidentifier":           return "VARCHAR(36)"
    if t in ("decimal", "numeric"):
        if prec and scale is not None:    return f"NUMERIC({prec},{scale})"
        return "NUMERIC"
    if t in ("nvarchar", "varchar"):
        if max_len and max_len > 0:       return f"VARCHAR({max_len})"
        return "TEXT"
    if t in ("nchar", "char"):
        if max_len and max_len > 0:       return f"CHAR({max_len})"
        return "CHAR"
    return "TEXT"

# ── Column name stripping ─────────────────────────────────────────────────────

def strip_col(col: str, legacy_table: str) -> str:
    """
    'ID'                       -> 'id'
    'C_Member_BranchId'        -> 'branchid'
    'C_AccountMaster_AccNo'    -> 'accno'
    Falls back to col.lower() if prefix not found.
    """
    if col.upper() == "ID":
        return "id"
    # Extract base name: CSAS_T_AccountMaster -> AccountMaster
    base = legacy_table
    for pfx in ("CSAS_T_", "csas_t_"):
        if base.startswith(pfx):
            base = base[len(pfx):]
            break
    prefix = f"C_{base}_"
    if col.startswith(prefix):
        return col[len(prefix):].lower()
    # Try case-insensitive match
    low = col.lower()
    low_pfx = prefix.lower()
    if low.startswith(low_pfx):
        return low[len(low_pfx):]
    return col.lower()

# ── VoucherType + SubType translation (legacy -> new schema) ─────────────────
# Keyed on (legacy_vtype, legacy_subtype) -> (new_vtype, new_subtype).
# Applied only to CSAS_T_Voucher rows.
# Legacy enum:  1=Cash 2=Journal 5=Saving 6=RD 7=FD 9=Loan 10=BFD
# New schema:   2=Saving 3=FD 4=RD 5=Loan 6=Cash 7=Journal
VOUCHER_TYPE_SUBTYPE_MAP: dict[tuple[int, int], tuple[int, int]] = {
    # CashVoucher (1) ---------------------------------------------------
    (1,  3): (5,  9),   # CashLoanAdvancement  -> Loan + Loan Advancement
    (1,  4): (5, 10),   # CashLoanRecovery     -> Loan + Loan Recovery
    (1, 25): (3,  7),   # PMFD                 -> FD   + Pre-Mature
    (1, 33): (6, 11),   # PR                   -> Cash + Payment/Receipt
    # JournalVoucher (2) ------------------------------------------------
    (2,  7): (7, 12),   # Transfer             -> Journal + Transfer
    (2, 35): (10,  5),  # MatureBFD            -> BankFD + Mature
    (2, 36): (10,  6),  # ReNewBFD             -> BankFD + Renew
    (2, 39): (7,  39),  # ProfitLossAcc        -> Journal + (keep)
    (2, 40): (7,  40),  # StandODReserve       -> Journal + (keep)
    (2, 44): (10,  7),  # PreMatureBFD         -> BankFD + PreMature
    (2, 49): (7, 14),   # ExpenseStand         -> Journal + Loan Expense
    # Saving (5) --------------------------------------------------------
    (5,  8): (2,  3),   # WithDrawl            -> Saving + Withdrawal
    (5,  9): (2,  2),   # Deposit              -> Saving + Deposit
    (5, 10): (2,  4),   # InterestPosting      -> Saving + Interest Posting
    (5, 42): (2, 42),   # AgentReceiptPosting  -> Saving + (keep)
    # RD (6) ------------------------------------------------------------
    (6, 10): (4,  4),   # InterestPosting      -> RD + Interest Posting
    (6, 11): (4,  8),   # RDR                  -> RD + Kist
    (6, 24): (4,  5),   # Mature               -> RD + Mature
    (6, 28): (4,  7),   # PMRD                 -> RD + Pre-Mature
    (6, 29): (4, 29),   # SA (Suspense Acc)    -> RD + (keep)
    (6, 42): (4, 42),   # AgentReceiptPosting  -> RD + (keep)
    # FD (7) ------------------------------------------------------------
    (7, 10): (3,  4),   # InterestPosting      -> FD + Interest Posting
    (7, 14): (3,  2),   # FDR (cash receipt)   -> FD + Deposit
    (7, 16): (3, 15),   # OthAccPosting (MIS)  -> FD + MISInterestPosting
    (7, 24): (3,  5),   # Mature               -> FD + Mature
    (7, 26): (3,  6),   # ReNew                -> FD + Renew
    # Loan (9) ----------------------------------------------------------
    (9, 31): (5,  4),   # LIP                  -> Loan + InterestPosting
    # BFD (10) ----------------------------------------------------------
    (10, 10): (10,  4), # InterestPosting      -> BankFD + Interest Posting
}

def translate_voucher_types(vtype: object, vsubtype: object) -> tuple[int, int]:
    """Return (new_vtype, new_subtype) for a legacy voucher row.
    Falls back to the original values if the pair is not in the map."""
    try:
        key = (int(vtype), int(vsubtype))
    except (TypeError, ValueError):
        return (vtype, vsubtype)  # type: ignore[return-value]
    return VOUCHER_TYPE_SUBTYPE_MAP.get(key, key)

# ── TABLE_RENAMES: CSAS_T_ source -> new PostgreSQL table ────────────────────
# Tables listed here are inserted into EXISTING new-schema tables (with column
# remapping). All other CSAS_T_ tables are auto-created.

TABLE_RENAMES: dict[str, str] = {
    # Reference / Location
    "CSAS_T_State":                           "state",
    "CSAS_T_Zone":                            "zone",
    "CSAS_T_Thana":                           "thana",
    "CSAS_T_PostOffice":                      "postoffice",
    "CSAS_T_Tehsil":                          "tehsil",
    "CSAS_T_Patwar":                          "patwar",
    "CSAS_T_Village":                         "village",
    "CSAS_T_Category":                        "category",
    "CSAS_T_Caste":                           "caste",
    "CSAS_T_Relation":                        "relation",
    "CSAS_T_Occupation":                      "occupation",
    "CSAS_T_District":                        "district",
    "CSAS_T_Area":                            "area",
    "CSAS_T_Station":                         "station",
    "CSAS_T_StationBranch":                   "stationbranch",
    "CSAS_T_Currency":                        "currency",
    "CSAS_T_EduQualification":                "eduqualification",
    "CSAS_T_FormatBalSheetAsset":             "formatbalsheetasset",
    "CSAS_T_FormatBalSheetLiability":         "formatbalsheetliability",
    "CSAS_T_DayBookHeadWiseFormat":           "daybookheadwiseformat",
    # Society / System
    "CSAS_T_SocietyMaster":                   "societymaster",
    "CSAS_T_SystemSetting":                   "systemsetting",
    "CSAS_T_SuspenseAcc":                     "suspenseacc",
    "CSAS_T_WorkingDayDetail":                "workingdaydetail",
    "CSAS_T_DayProcess":                      "dayprocess",
    "CSAS_T_DayProcessDetail":                "dayprocessdetail",
    "CSAS_T_DepositSettings":                 "depositsettings",
    "CSAS_T_SessionWiseVrSettings":           "sessionwisevrsettings",
    # Security / Roles
    "CSAS_T_UserRole":                        "userrole",
    "CSAS_T_RolesDefine":                     "rolesdefine",
    "CSAS_T_SecurityObject":                  "securityobject",
    "CSAS_T_SecurityPermission":              "securitypermission",
    "CSAS_T_SecurityObjectPermission":        "securityobjectpermission",
    "CSAS_T_SecObjPermissionRole":            "secobjpermissionrole",
    # Branch
    "CSAS_T_BranchMaster":                    "branchmaster",
    "CSAS_T_BranchSession":                   "branchsession",
    # Auth
    "CSAS_T_User":                            "user",
    # Member
    "CSAS_T_Member":                          "member",
    "CSAS_T_MemberNominee":                   "membernomineedetails",
    "CSAS_T_MemberImages":                    "memberimages",
    "CSAS_T_MemberSequence":                  "membersequence",
    "CSAS_T_MemberSettings":                  "membersettings",
    "CSAS_T_DateWiseMemType":                 "datewisememtype",
    # Accounts
    "CSAS_T_AccountHeadType":                 "accountheadtype",
    "CSAS_T_AccountHead":                     "accounthead",
    "CSAS_T_AccountMaster":                   "accountmaster",
    "CSAS_T_AccOpeningBalance":               "accopeningbalance",
    "CSAS_T_AccServiceDetail":                "accservicedetail",
    "CSAS_T_AccNomineeDetail":                "accnomineedetail",
    "CSAS_T_AccContactDetail":                "acccontactdetail",
    "CSAS_T_AccountSavingDetail":             "accountsavingdetail",
    "CSAS_T_AccountSequence":                 "accountsequence",
    "CSAS_T_PersonAccDetail":                 "personaccdetail",
    "CSAS_T_JointAccDetail":                  "jointaccountinfo",
    "CSAS_T_JointAccSettings":                "jointaccsettings",
    "CSAS_T_AccountKistDetail":               "accountkistdetail",
    "CSAS_T_AccountKistSchedule":             "accountkistschedule",
    "CSAS_T_AccountKistScheduleHistory":      "accountkistschedulehistory",
    "CSAS_T_AccountLimitDetail":              "accountlimitdetail",
    "CSAS_T_GenAccLimitDetail":               "genacclimitdetail",
    # Saving Product
    "CSAS_T_SavingProduct":                   "savingproduct",
    "CSAS_T_SavingProductInterestRules":      "savingproductinterestrules",
    "CSAS_T_SavingProductDefinition":         "savingproductdefinition",
    "CSAS_T_SavingProductInterestSlab":       "savingproductinterestslab",
    "CSAS_T_SavingProductInterestSlabDetail": "savingproductinterestslabdetail",
    "CSAS_T_SavingProductPosting":            "savingproductposting",
    "CSAS_T_SavProdBranchWiseRule":           "savprodbranchwiserule",
    "CSAS_T_GeneralAccInterest":              "generalaccinterest",
    "CSAS_T_GeneralIntSlab":                  "generalintslab",
    # FD
    "CSAS_T_FDProduct":                       "fdproduct",
    "CSAS_T_FDProductBranchWiseRule":         "fdproductbranchwiserule",
    "CSAS_T_FDProductInterestRules":          "fdproductinterestrules",
    "CSAS_T_FDProductDefinition":             "fdproductdefinition",
    "CSAS_T_FDProductPosting":                "fdproductposting",
    "CSAS_T_FDProductSlab":                   "fdproductslab",
    "CSAS_T_FDProductSlabInt":                "fdproductslabint",
    "CSAS_T_FDProductSlabIntDetail":          "fdproductslabintdetail",
    "CSAS_T_FDTDSSlab":                       "fdtdsslab",
    "CSAS_T_FDTDSSlabDetail":                 "fdtdsslabdetail",
    "CSAS_T_FDAccountDetail":                 "fdaccountdetail",
    # Bank FD
    "CSAS_T_BankFDAccountDetail":             "bankfdaccountdetail",
    "CSAS_T_BankFDAccountOpeningBalance":     "bankfdaccountopeningbalance",
    "CSAS_T_BankFDAccountOpeningTDS":         "bankfdaccountopeningtds",
    "CSAS_T_BFDHeadTDSAccSettings":           "bfdheadtdsaccsettings",
    # RD
    "CSAS_T_RDProduct":                       "rdproduct",
    "CSAS_T_RDProductBranchWiseRule":         "rdproductbranchwiserule",
    "CSAS_T_RDProductDefinition":             "rdproductdefinition",
    "CSAS_T_RDProductInterestRules":          "rdproductinterestrules",
    "CSAS_T_RDProductPosting":                "rdproductposting",
    "CSAS_T_RDAccountDetail":                 "rdaccountdetail",
    "CSAS_T_RDAccountOpeningBalance":         "rdaccountopeningbalance",
    "CSAS_T_RDSlab":                          "rdslab",
    "CSAS_T_RDSlabDetail":                    "rdslabdetail",
    # Loan
    "CSAS_T_LoanProduct":                     "loanproduct",
    "CSAS_T_LoanProductBranchWiseRule":       "loanproductbranchwiserule",
    "CSAS_T_LoanProductDefinition":           "loanproductdefinition",
    "CSAS_T_LoanProductAdvancement":          "loanproductadvancement",
    "CSAS_T_LoanProductMarginMoneyRule":      "loanproductmarginmoneyrule",
    "CSAS_T_LoanProductPosting":              "loanproductposting",
    "CSAS_T_LoanProductRecovery":             "loanproductrecovery",
    "CSAS_T_LoanProductSecurity":             "loanproductsecurity",
    "CSAS_T_LoanProductShareMoneyRule":       "loanproductsharemoneyrule",
    "CSAS_T_LoanSlab":                        "loanslab",
    "CSAS_T_LoanSlabDetail":                  "loanslabdetail",
    "CSAS_T_LoanCategory":                    "loancategory",
    "CSAS_T_LoanExpStand":                    "loanexpstand",
    "CSAS_T_LoanAccOpeningBalance":           "loanaccopeningbalance",
    "CSAS_T_LoanAccountBalanceDetail":        "loanaccountbalancedetail",
    "CSAS_T_LoanAccountRecoveryInterest":     "loanaccountrecoveryinterest",
    "CSAS_T_LoanAccFDPledge":                 "loanaccfdpledge",
    "CSAS_T_LoanAccFDPledgeDetail":           "loanaccfdpledgedetail",
    "CSAS_T_LoanAccRDPledge":                 "loanaccrdpledge",
    "CSAS_T_LoanAccRDPledgeDetail":           "loanaccrdpledgedetail",
    "CSAS_T_LoanGuarWitness":                 "loanguarwitness",
    "CSAS_T_ExpenseCatagory":                 "expensecategory",
    # Kist / Schedules
    "CSAS_T_KistReschedule":                  "kistreschedule",
    "CSAS_T_KistRescheduleAccs":              "kistrescheduleaccs",
    "CSAS_T_DivCalculation":                  "divcalculation",
    # NPA
    "CSAS_T_NPAPlanCategory":                 "npaplancategory",
    "CSAS_T_NPAPlanMaster":                   "npaplanmaster",
    # Agent / Collection
    "CSAS_T_AgentLevelMaster":                "agentlevelmaster",
    "CSAS_T_AgentLevelDetail":                "agentleveldetail",
    "CSAS_T_AgentMaster":                     "agentmaster",
    "CSAS_T_AccountAgentDatewise":            "accountagentdatewise",
    "CSAS_T_CollReceipt":                     "collreceipt",
    "CSAS_T_CollSavingReceiptDetail":         "collsavingreceiptdetail",
    "CSAS_T_CollRDReceiptDetail":             "collrdreceiptdetail",
    "CSAS_T_CollLoanReceiptDetail":           "collloanreceiptdetail",
    # Voucher
    "CSAS_T_VoucherSettings":                 "vouchersettings",
    "CSAS_T_Voucher":                         "voucher",
    "CSAS_T_VoucherAccCRDr":                  "vouchercreditdebitdetails",
    "CSAS_T_VoucherSavingDetail":             "vouchersavingdetail",
    "CSAS_T_VoucherFDDetail":                 "voucherfddetail",
    "CSAS_T_VoucherBFDDetail":                "voucherbfddetail",
    "CSAS_T_VoucherRDDetail":                 "voucherrddetail",
    "CSAS_T_VoucherExpDetail":                "loanexpense",
    "CSAS_T_VoucherRecIntDetail":             "voucherrecintdetail",
    "CSAS_T_VoucherAgent":                    "voucheragent",
    "CSAS_T_VoucherLinking":                  "voucherlinking",
    "CSAS_T_VoucherLoanAccOverdue":           "voucherloanaccoverdue",
    "CSAS_T_VoucherJointAccDetail":           "voucherjointaccdetail",
    "CSAS_T_VoucherCurrencyDetail":           "vouchercurrencydetail",
    "CSAS_T_VrODReserve":                     "vrodreserve",
    "CSAS_T_OtherBrAccs":                     "otherbranchaccounts",
    # GST / Tax
    "CSAS_T_Tax":                             "tax",
    "CSAS_T_TaxType":                         "taxtype",
    "CSAS_T_TaxGroup":                        "taxgroup",
    "CSAS_T_TaxGroupType":                    "taxgrouptype",
    "CSAS_T_BillBook":                        "billbook",
    "CSAS_T_StockMain":                       "stockmain",
    "CSAS_T_StockBillBookDetail":             "stockbillbookdetail",
    "CSAS_T_NextBillNumber":                  "nextbillnumber",
    # Services
    "CSAS_T_ServiceTaxRule":                  "servicetaxrule",
    "CSAS_T_ServiceTaxTypeDet":               "servicetaxtypedet",
    "CSAS_T_SMDetail":                        "smdetail",
    # HR
    "CSAS_T_Employeedesignation":             "employeedesignation",
    "CSAS_T_EmployeeMaster":                  "employeemaster",
    "CSAS_T_EmployeeAttendance":              "employeeattendance",
    "CSAS_T_SalaryComponent":                 "salarycomponent",
    "CSAS_T_SalaryCompEmpWise":               "salarycompempwise",
    "CSAS_T_MonthlySalary":                   "monthlysalary",
    "CSAS_T_EmpGrade":                        "empgrade",
    "CSAS_T_SalarySlab":                      "salaryslab",
    # System
    "CSAS_T_GeneralSettings":                 "generalsettings",
    "CSAS_T_ErrorLog":                        "errorlog",
}

# ── Explicit column name overrides per legacy table ──────────────────────────
# Key: stripped legacy column name -> target PostgreSQL column name.
# Used when automatic prefix-stripping + table-prefix fallback is not enough
# (e.g. semantic renames like userid->addedby, status->entrystatus).
TABLE_COLUMN_MAP: dict[str, dict[str, str]] = {
    # accountmaster: many column name mismatches + product ID merge
    "CSAS_T_AccountMaster": {
        "name":             "accountname",
        "namesl":           "accountnamesl",
        "acnoprefix":       "accprefix",
        "acnosuffix":       "accsuffix",
        "openingdate":      "accopeningdate",
        "isclosed":         "isaccclosed",
        "issuspense":       "issuspenseaccount",
        # generalproductid is derived via COALESCE in custom SELECT
        "generalproductid": "generalproductid",
    },
    # occupation: source uses Desc, target uses description
    "CSAS_T_Occupation": {
        "desc":   "description",
        "descsl": "descriptionsl",
    },
    # Reference tables: new schema prefixes column names with table name
    "CSAS_T_State": {
        "name": "statename",
        "code": "statecode",
    },
    "CSAS_T_Zone": {
        "name": "zonename",
        "namesl": "zonenamesl",
        "code": "zonecode",
    },
    # Location hierarchy: legacy uses name/namesl/code; new schema prefixes with table name
    "CSAS_T_Thana": {
        "name":   "thananame",
        "namesl": "thananamesl",
        "code":   "thanacode",
    },
    "CSAS_T_PostOffice": {
        "name":   "postofficename",
        "namesl": "postofficenamesl",
        "code":   "postofficecode",
    },
    "CSAS_T_Tehsil": {
        "name":   "tehsilname",
        "namesl": "tehsilnamesl",
        "code":   "tehsilcode",
    },
    "CSAS_T_Patwar": {
        "desc":   "description",
        "descsl": "descriptionsl",
    },
    "CSAS_T_Village": {
        "name":   "villagename",
        "namesl": "villagenamesl",
    },
    # Category/Caste: new schema uses categoryname/description
    # Legacy uses C_Category_Desc (confirmed via INFORMATION_SCHEMA query)
    "CSAS_T_Category": {
        "desc":   "categoryname",
        "descsl": "categorynamesl",
    },
    "CSAS_T_Caste": {
        "desc":   "description",
        "descsl": "descriptionsl",
    },
    # Relation: new schema uses description/descriptionsl
    "CSAS_T_Relation": {
        "name":   "description",
        "namesl": "descriptionsl",
    },
    # Product tables: new schema uses productname/productcode
    "CSAS_T_SavingProduct": {
        "name": "productname",
        "code": "productcode",
    },
    "CSAS_T_FDProduct": {
        "name": "productname",
        "code": "productcode",
    },
    # FDAccountDetail: accid (stripped from C_FDAccountDetail_AccId) → accountid;
    # branchid is a _derived alias from the JOIN — tgt_col.upper() must match alias.upper()
    "CSAS_T_FDAccountDetail": {
        "accid":     "accountid",
        "branchid":  "branchid",
    },
    "CSAS_T_RDProduct": {
        "name": "productname",
        "code": "productcode",
        "namesl": "productnamesl",
    },
    "CSAS_T_LoanProduct": {
        "name": "productname",
    },
    # accountheadtype: source uses Name/NameSL, target uses description/descriptionsl
    "CSAS_T_AccountHeadType": {
        "name":   "description",
        "namesl": "descriptionsl",
    },
    # accounthead: code->headcode, headtypeid->accountheadtypeid; name stays name
    "CSAS_T_AccountHead": {
        "code":       "headcode",
        "headtypeid": "accountheadtypeid",
    },
    # membernominee: C_Member_*/C_NomineeDetail_* prefixes don't strip to target names,
    # so all non-trivial columns are wired as _derived via custom SELECT aliases.
    "CSAS_T_MemberNominee": {
        "memberid":         "memberid",      # alias MemberID
        "nomineename":      "nomineename",   # alias NomineeName
        "firstnamesl":      "firstnamesl",   # alias FirstNameSL
        "lastnamesl":       "lastnamesl",    # alias LastNameSL
        "age":              "age",           # alias Age
        "relationid":       "relationid",    # alias RelationId (see custom SELECT)
    },
    "CSAS_T_Voucher": {
        "vno":            "voucherno",
        "vtype":          "vouchertype",
        "vsubtype":       "vouchersubtype",
        "vdate":          "voucherdate",
        "longnarration":  "vouchernarration",
        "status":         "voucherstatus",
        "userid":         "addedby",
        "muserid":        "modifiedby",
        "verifyby":       "verifiedby",
        "utime":          "actualtime",
        # brid, otherbrid auto-detect fine; longnarrationsl/ishoupdated dropped
    },
    "CSAS_T_VoucherAccCRDr": {
        "vid":                "voucherid",
        "accid":              "accountid",
        "amt":                "voucheramount",
        "etype":              "voucherentrytype",
        "status":             "entrystatus",
        "rowno":              "voucherseqno",
        "exp":                "expenseamt",
        "vouchermainstatus":  "voucherstatus",
        # narration, accheadcode, valuedate, intdr, intcr auto-detect fine
        # narrationsl, ishoupdated, parentid dropped (not in new schema)
    },
    "CSAS_T_VoucherSavingDetail": {
        # vacccrdrid, operation, accid, amt, chequebookid, chequeno,
        # valuedate, voucherdate, vouchermainstatus all auto-detect fine.
        # othrefaccid / ishoupdated dropped (not in new schema).
    },
    "CSAS_T_VoucherFDDetail": {
        "vacccrdi":  "vacccrdrid",   # strip gives "vacccrdi" but target is "vacccrdrid"
        # amountcr, amountdr, operation, valuedate, voucherdate,
        # intdr, intcr, vouchermainstatus, fdaccid, fdaccdetid auto-detect fine.
        # ishoupdated dropped.
    },
    "CSAS_T_VoucherRDDetail": {
        "vacccrdi":    "vacccrdrid",
        "rdaccid":     "rdaccid",
        "rdaccdetid":  "rdaccdetid",
        "penalacci":   "penalaccid",
        # amountcr, amountdr, operation, valuedate, voucherdate,
        # othrefaccid, penalamt, intdr, intcr, vouchermainstatus auto-detect fine.
    },
    "CSAS_T_VoucherRecIntDetail": {
        "vacccrdi":  "vacccrdrid",
        "voucherno": "voucherno",
        "entrydate": "entrydate",
        "valuedate": "valuedate",
        "intcatid":  "intcatid",
        "pamt":      "pamt",
        "accid":     "accid",
        "intdr":     "intdr",
        "intcr":     "intcr",
        "vouchermainstatus": "vouchermainstatus",
    },
}

# ── Custom SELECT queries for tables that need a JOIN to get derived columns ──
# When provided, this query replaces the simple "SELECT ... FROM [table]" fetch.
# Column order MUST match what build_col_map() returns for the table (columns
# from the query are matched by name via TABLE_COLUMN_MAP / auto-detection).
TABLE_CUSTOM_SELECT: dict[str, str] = {
    # AccountMaster: 4 separate product ID columns merge into 1 generalproductid
    "CSAS_T_AccountMaster": (
        "SELECT *,"
        " COALESCE(C_AccountMaster_SavingProductID, C_AccountMaster_FDProductID,"
        "          C_AccountMaster_RDProductID, C_AccountMaster_LoanProductID) AS GeneralProductId"
        " FROM [CSAS_T_AccountMaster]"
    ),
    # MemberNominee: mixed C_Member_*/C_NomineeDetail_*/C_MemberNominee_* prefixes
    # → rename everything cleanly and build NomineeName from First+Last name.
    "CSAS_T_MemberNominee": (
        "SELECT"
        " mn.ID,"
        " mn.C_Member_ID                       AS MemberID,"
        " RTRIM(ISNULL(mn.C_NomineeDetail_FirstName,'') + ' '"
        "       + ISNULL(mn.C_NomineeDetail_LastName,'')) AS NomineeName,"
        " mn.C_NomineeDetail_FirstNameSL        AS FirstNameSL,"
        " mn.C_NomineeDetail_LastNameSL         AS LastNameSL,"
        " mn.C_NomineeDetail_Relation           AS RelationId,"
        " mn.C_NomineeDetail_Age                AS Age,"
        " mn.C_MemberNominee_IsMinor            AS IsMinor,"
        " mn.C_MemberNominee_DOB                AS DOB,"
        " mn.C_MemberNominee_NameOfGuardian     AS NameOfGuardian,"
        " mn.C_MemberNominee_NameOfGuardianSL   AS NameOfGuardianSL,"
        " mn.C_MemberNominee_NominationDate     AS NominationDate,"
        " mn.C_MemberNominee_AadhaarCardNo      AS AadhaarCardNo"
        " FROM [CSAS_T_MemberNominee] mn"
    ),
    # FDAccountDetail: AccId → AccountId alias; BranchId via join with AccountMaster
    "CSAS_T_FDAccountDetail": (
        "SELECT fd.Id,"
        " am.C_AccountMaster_BranchId AS BranchId,"
        " fd.C_FDAccountDetail_AccId AS AccountId,"
        " fd.C_FDAccountDetail_FDAmount,"
        " fd.C_FDAccountDetail_FDDate,"
        " fd.C_FDAccountDetail_FDMaturityDate,"
        " fd.C_FDAccountDetail_MaturityAmount,"
        " fd.C_FDAccountDetail_LTDNo,"
        " fd.C_FDAccountDetail_FDStatus,"
        " fd.C_FDAccountDetail_FDPeriodMonths,"
        " fd.C_FDAccountDetail_FDPeriodDays,"
        " fd.C_FDAccountDetail_SlabId,"
        " fd.C_FDAccountDetail_IntRate,"
        " fd.C_FDAccountDetail_IntCompInterval,"
        " fd.C_FDAccountDetail_SerialNo,"
        " fd.C_FDAccountDetail_VoucherDate,"
        " fd.C_FDAccountDetail_InterestPaidInterval,"
        " fd.C_FDAccountDetail_InterestPaidAmount,"
        " fd.C_FDAccountDetail_MISAccID"
        " FROM [CSAS_T_FDAccountDetail] fd"
        " JOIN [CSAS_T_AccountMaster] am ON am.Id = fd.C_FDAccountDetail_AccId"
    ),
    # VoucherFDDetail has no VoucherID — derive it via VoucherAccCRDr
    "CSAS_T_VoucherFDDetail": (
        "SELECT fd.Id,"
        " fd.C_VoucherFDDetail_VAccCrDrId,"
        " crd.C_VoucherAccCRDr_VID AS VoucherID,"
        " fd.C_VoucherFDDetail_FDAccId,"
        " fd.C_VoucherFDDetail_FDAccDetId,"
        " fd.C_VoucherFDDetail_AmountCr,"
        " fd.C_VoucherFDDetail_AmountDr,"
        " fd.C_VoucherFDDetail_Operation,"
        " fd.C_VoucherFDDetail_ValueDate,"
        " fd.C_VoucherFDDetail_VoucherDate,"
        " fd.C_VoucherFDDetail_IntDr,"
        " fd.C_VoucherFDDetail_IntCr,"
        " fd.C_VoucherFDDetail_VoucherMainStatus"
        " FROM [CSAS_T_VoucherFDDetail] fd"
        " LEFT JOIN [CSAS_T_VoucherAccCRDr] crd"
        "  ON crd.Id = fd.C_VoucherFDDetail_VAccCrDrId"
    ),
    # VoucherRecIntDetail has no direct VoucherID — derive via VoucherAccCRDr
    "CSAS_T_VoucherRecIntDetail": (
        "SELECT ri.Id,"
        " ri.C_VoucherRecIntDetail_VAccCrDrId,"
        " crd.C_VoucherAccCRDr_VID AS VoucherID,"
        " ri.C_VoucherRecIntDetail_VoucherNo,"
        " ri.C_VoucherRecIntDetail_EntryDate,"
        " ri.C_VoucherRecIntDetail_ValueDate,"
        " ri.C_VoucherRecIntDetail_IntCatId,"
        " ri.C_VoucherRecIntDetail_Pamt,"
        " ri.C_VoucherRecIntDetail_AccId,"
        " ri.C_VoucherRecIntDetail_IntDr,"
        " ri.C_VoucherRecIntDetail_IntCr,"
        " ri.C_VoucherRecIntDetail_VoucherMainStatus"
        " FROM [CSAS_T_VoucherRecIntDetail] ri"
        " LEFT JOIN [CSAS_T_VoucherAccCRDr] crd"
        "  ON crd.Id = ri.C_VoucherRecIntDetail_VAccCrDrId"
    ),
}

# ── Per-column value transforms keyed by (legacy_table, tgt_col) ─────────────
# Each value is a callable(value) -> transformed_value applied after coerce_value.
TABLE_VALUE_TRANSFORMS: dict[str, dict[str, Callable]] = {
    # member: categoryid is NOT NULL in new schema but NULL for 273 members in legacy
    # (confirmed: 273/757 legacy members have C_Member_CategoryId=NULL → insert fails)
    # Use 0 as a safe default meaning "category not assigned"
    "CSAS_T_Member": {
        "categoryid": lambda v: v if v is not None else 0,
    },
    # accounthead: accountheadtypeid is NOT NULL in new schema but some legacy heads
    # have C_AccountHead_HeadTypeId = NULL (sub-heads or misc heads without explicit type).
    # Those rows were being silently skipped (NOT NULL constraint violation).
    # Default to 2 (Assets) — closest safe default for receivable/misc heads.
    # After migration, review heads with accountheadtypeid=2 that belong elsewhere:
    #   SELECT id, headcode, name FROM accounthead WHERE branchid=1 AND accountheadtypeid=2
    #   (compare with legacy to re-classify Liabilities=1 / Income=3 / Expenditure=4)
    "CSAS_T_AccountHead": {
        "accountheadtypeid": lambda v: v if v is not None else 2,
    },
    # accountmaster: isclosed is BIT in source → BOOLEAN in target
    "CSAS_T_AccountMaster": {
        "isaccclosed": lambda v: bool(v) if v is not None else None,
    },
    # branchmaster: PhonePrefix1 can be NULL in legacy but is NOT NULL in target
    "CSAS_T_BranchMaster": {
        "branchmaster_phoneprefix1": lambda v: v if v is not None else "",
        "branchmaster_phoneno1":     lambda v: v if v is not None else "",
        "branchmaster_phonetype1":   lambda v: v if v is not None else 1,
        "branchmaster_gstino":       lambda v: v if v is not None else "",
        "branchmaster_pincode":      lambda v: v if v is not None else "",
        "branchmaster_emailid":      lambda v: v if v is not None else "",
    },
    # branchsession: legacy stores 'Y'/'N' strings for boolean columns
    "CSAS_T_BranchSession": {
        "iscurrent": _yn_to_bool,
        "isfirst":   _yn_to_bool,
    },
    # fdaccountdetail: slabid references old fdproductslab (not fdinterestslab) — null it out to avoid FK violation
    "CSAS_T_FDAccountDetail": {
        "slabid": lambda v: None,
    },
    # accountkistdetail: legacy status '5' → 'A' (Active); kistwithinterest '5' → 'WI'
    "CSAS_T_AccountKistDetail": {
        "status":           lambda v: "A"  if v is not None and str(v).strip() == "5" else v,
        "kistwithinterest": lambda v: "WI" if v is not None and str(v).strip() == "5" else v,
    },
    # vouchersavingdetail: legacy operation codes D/W/IPO → new SD/SW/SIP
    "CSAS_T_VoucherSavingDetail": {
        "operation": lambda v: {"D": "SD", "W": "SW", "IPO": "SIP"}.get(str(v), str(v)) if v is not None else None,
    },
    # loanproductrecovery: tilde-delimited codes → comma-separated full names
    "CSAS_T_LoanProductRecovery": {
        "recoverymode": _tilde_to_recovery_mode,
        "recoveryseq":  _tilde_to_comma,
    },
    # loanproductadvancement: tilde-delimited disbursment codes → full names
    "CSAS_T_LoanProductAdvancement": {
        "disbursmentmode": _tilde_to_disbursment_mode,
    },
    # loanproductdefinition: tilde-delimited security IDs → comma-separated
    "CSAS_T_LoanProductDefinition": {
        "securityids": _tilde_to_comma,
    },
    # membernomineedetails: aadhaarcardno is NOT NULL but blank in legacy → coerce
    "CSAS_T_MemberNominee": {
        "aadhaarcardno": lambda v: v if v is not None else "",
    },
}

# ── Table-specific default injections for columns missing from legacy source ──
# Applied unconditionally when the target column is not in mapped_tgt.
TABLE_DEFAULT_INJECTIONS: dict[str, dict[str, Any]] = {
    # member: defareabrid (default area branch id) is NOT NULL, not in legacy source
    "CSAS_T_Member": {
        "defareabrid": 1,
    },
    # accountmaster: memberbranchid not in legacy (all accounts belong to branch 1)
    "CSAS_T_AccountMaster": {
        "memberbranchid": 1,
    },
    # location tables: branchid NOT NULL in new schema; legacy may not carry it
    # code columns (thanacode etc.) are NOT NULL; default to empty string if absent
    "CSAS_T_Thana": {
        "branchid":  1,
        "thanacode": "",
    },
    "CSAS_T_PostOffice": {
        "branchid":       1,
        "postofficecode": "",
    },
    "CSAS_T_Tehsil": {
        "branchid":   1,
        "tehsilcode": "",
    },
    "CSAS_T_Patwar": {
        "branchid": 1,
    },
    "CSAS_T_Village": {
        "branchid": 1,
    },
    # caste: new schema requires categoryid (NOT NULL); inject General=1 as default
    # (only applied when legacy caste table has no categoryid column)
    "CSAS_T_Caste": {
        "categoryid": 1,
    },
    # loanaccountbalancedetail: new schema requires entrytype; all legacy rows are advances
    "CSAS_T_LoanAccountBalanceDetail": {
        "entrytype": "ADV",
    },
    # loanguarwitness: new schema has member-id columns absent from legacy; default to 1
    "CSAS_T_LoanGuarWitness": {
        "guar1membrid": 1,
        "guar2membrid": 1,
        "wit1membrid":  1,
        "wit2membrid":  1,
    },
    # accountheadtype: CSAS_T_AccountHeadType is always empty in legacy; the 4
    # standard types (Liabilities/Assets/Income/Expenditure) are seeded by the
    # migrate_member_sub_tables phase instead. No injection needed here.
    # membernomineedetails: several NOT NULL columns not derivable from legacy
    "CSAS_T_MemberNominee": {
        "relationwithmember": 1,   # same meaning as relationid; overridden in build_row if mapped
        "percentageshare":    100, # legacy had single nominee concept; 100% default
        "aadhaarcardno":      "",  # NOT NULL but often blank in legacy
    },
}

# ── FK-safe insertion order for mapped tables (parents before children).
MIGRATION_ORDER = [
    # Deepest reference tables (no FK dependencies)
    "CSAS_T_State",
    "CSAS_T_Zone",
    "CSAS_T_Category",        # must be before CSAS_T_Caste (caste.categoryid FK)
    "CSAS_T_Caste",
    "CSAS_T_Relation",
    "CSAS_T_Occupation",
    "CSAS_T_District",
    "CSAS_T_Currency",
    "CSAS_T_EduQualification",
    # Geographic hierarchy: zone → thana/postoffice/tehsil/patwar → village → area → station
    "CSAS_T_Thana",
    "CSAS_T_PostOffice",
    "CSAS_T_Tehsil",
    "CSAS_T_Patwar",
    "CSAS_T_Village",         # depends on zone, thana, postoffice, tehsil, patwar
    "CSAS_T_Area",
    "CSAS_T_Station",
    # Society / system config (no FKs to bank data)
    "CSAS_T_SocietyMaster",
    "CSAS_T_SystemSetting",
    "CSAS_T_GeneralSettings",
    "CSAS_T_DepositSettings",
    "CSAS_T_DayBookHeadWiseFormat",
    "CSAS_T_FormatBalSheetAsset",
    "CSAS_T_FormatBalSheetLiability",
    # Security / roles (no FK to member/account)
    "CSAS_T_UserRole",
    "CSAS_T_SecurityObject",
    "CSAS_T_SecurityPermission",
    "CSAS_T_SecurityObjectPermission",
    "CSAS_T_SecObjPermissionRole",
    # Branch
    "CSAS_T_BranchMaster",
    "CSAS_T_BranchSession",
    "CSAS_T_StationBranch",
    # Auth / users (depend on branch, roles)
    "CSAS_T_User",
    "CSAS_T_RolesDefine",
    # Working day / day process (depend on branch)
    "CSAS_T_WorkingDayDetail",
    "CSAS_T_DayProcess",
    "CSAS_T_DayProcessDetail",
    "CSAS_T_SessionWiseVrSettings",
    # Agent / collection masters (depend on branch)
    "CSAS_T_AgentLevelMaster",
    "CSAS_T_AgentLevelDetail",
    # Member (depends on branch, station, caste, occupation, relation, village)
    "CSAS_T_Member",
    "CSAS_T_MemberNominee",
    "CSAS_T_MemberImages",
    "CSAS_T_MemberSequence",
    "CSAS_T_MemberSettings",
    "CSAS_T_DateWiseMemType",
    # Agent master (depends on member)
    "CSAS_T_AgentMaster",
    # Account head structure
    "CSAS_T_AccountHeadType",
    "CSAS_T_AccountHead",
    # Account master + related (depends on member, account head)
    "CSAS_T_AccountMaster",
    "CSAS_T_AccOpeningBalance",
    "CSAS_T_AccServiceDetail",
    "CSAS_T_AccNomineeDetail",
    "CSAS_T_AccContactDetail",
    "CSAS_T_AccountSavingDetail",
    "CSAS_T_AccountSequence",
    "CSAS_T_PersonAccDetail",
    "CSAS_T_JointAccDetail",
    "CSAS_T_JointAccSettings",
    "CSAS_T_AccountLimitDetail",
    "CSAS_T_GenAccLimitDetail",
    "CSAS_T_SuspenseAcc",
    # Saving product hierarchy
    "CSAS_T_SavingProduct",
    "CSAS_T_SavingProductInterestRules",
    "CSAS_T_SavingProductDefinition",
    "CSAS_T_SavingProductInterestSlab",
    "CSAS_T_SavingProductInterestSlabDetail",
    "CSAS_T_SavingProductPosting",
    "CSAS_T_SavProdBranchWiseRule",
    "CSAS_T_GeneralAccInterest",
    "CSAS_T_GeneralIntSlab",
    # FD product
    "CSAS_T_FDProduct",
    "CSAS_T_FDProductBranchWiseRule",
    "CSAS_T_FDProductInterestRules",
    "CSAS_T_FDProductDefinition",
    "CSAS_T_FDProductPosting",
    "CSAS_T_FDProductSlab",
    "CSAS_T_FDProductSlabInt",
    "CSAS_T_FDProductSlabIntDetail",
    "CSAS_T_FDTDSSlab",
    "CSAS_T_FDTDSSlabDetail",
    "CSAS_T_FDAccountDetail",
    # Bank FD
    "CSAS_T_BankFDAccountDetail",
    "CSAS_T_BankFDAccountOpeningBalance",
    "CSAS_T_BankFDAccountOpeningTDS",
    "CSAS_T_BFDHeadTDSAccSettings",
    # RD product + accounts
    "CSAS_T_RDProduct",
    "CSAS_T_RDProductBranchWiseRule",
    "CSAS_T_RDProductDefinition",
    "CSAS_T_RDProductInterestRules",
    "CSAS_T_RDProductPosting",
    "CSAS_T_RDSlab",
    "CSAS_T_RDSlabDetail",
    "CSAS_T_RDAccountDetail",
    "CSAS_T_RDAccountOpeningBalance",
    # Loan product + accounts
    "CSAS_T_LoanProduct",
    "CSAS_T_LoanProductBranchWiseRule",
    "CSAS_T_LoanProductDefinition",
    "CSAS_T_LoanProductAdvancement",
    "CSAS_T_LoanProductMarginMoneyRule",
    "CSAS_T_LoanProductPosting",
    "CSAS_T_LoanProductRecovery",
    "CSAS_T_LoanProductSecurity",
    "CSAS_T_LoanProductShareMoneyRule",
    "CSAS_T_LoanSlab",
    "CSAS_T_LoanSlabDetail",
    "CSAS_T_LoanCategory",
    "CSAS_T_LoanExpStand",
    "CSAS_T_LoanAccOpeningBalance",
    "CSAS_T_LoanAccountBalanceDetail",
    "CSAS_T_LoanAccountRecoveryInterest",
    "CSAS_T_LoanAccFDPledge",
    "CSAS_T_LoanAccFDPledgeDetail",
    "CSAS_T_LoanAccRDPledge",
    "CSAS_T_LoanAccRDPledgeDetail",
    "CSAS_T_LoanGuarWitness",
    "CSAS_T_ExpenseCatagory",
    # Kist / schedules (depend on account)
    "CSAS_T_AccountKistDetail",
    "CSAS_T_AccountKistSchedule",
    "CSAS_T_AccountKistScheduleHistory",
    "CSAS_T_KistReschedule",
    "CSAS_T_KistRescheduleAccs",
    "CSAS_T_DivCalculation",
    # NPA
    "CSAS_T_NPAPlanCategory",
    "CSAS_T_NPAPlanMaster",
    # GST / Tax (before vouchers)
    "CSAS_T_Tax",
    "CSAS_T_TaxType",
    "CSAS_T_TaxGroup",
    "CSAS_T_TaxGroupType",
    "CSAS_T_BillBook",
    "CSAS_T_NextBillNumber",
    # Services
    "CSAS_T_ServiceTaxRule",
    "CSAS_T_ServiceTaxTypeDet",
    "CSAS_T_SMDetail",
    # HR
    "CSAS_T_Employeedesignation",
    "CSAS_T_EmployeeMaster",
    "CSAS_T_EmployeeAttendance",
    "CSAS_T_SalaryComponent",
    "CSAS_T_SalaryCompEmpWise",
    "CSAS_T_MonthlySalary",
    "CSAS_T_EmpGrade",
    "CSAS_T_SalarySlab",
    # Voucher settings
    "CSAS_T_VoucherSettings",
    # Vouchers last (depend on almost everything)
    "CSAS_T_OtherBrAccs",
    "CSAS_T_Voucher",
    "CSAS_T_VoucherAccCRDr",
    "CSAS_T_VoucherSavingDetail",
    "CSAS_T_VoucherFDDetail",
    "CSAS_T_VoucherBFDDetail",
    "CSAS_T_VoucherRDDetail",
    "CSAS_T_VoucherExpDetail",
    "CSAS_T_VoucherRecIntDetail",
    "CSAS_T_VoucherAgent",
    "CSAS_T_VoucherLinking",
    "CSAS_T_VoucherLoanAccOverdue",
    "CSAS_T_VoucherJointAccDetail",
    "CSAS_T_VoucherCurrencyDetail",
    "CSAS_T_VrODReserve",
    "CSAS_T_StockMain",
    "CSAS_T_StockBillBookDetail",
    # Agent / collection receipts (depend on voucher)
    "CSAS_T_AccountAgentDatewise",
    "CSAS_T_CollReceipt",
    "CSAS_T_CollSavingReceiptDetail",
    "CSAS_T_CollRDReceiptDetail",
    "CSAS_T_CollLoanReceiptDetail",
    "CSAS_T_ErrorLog",
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_src_columns(src_cur, table: str) -> list[dict]:
    """Return column metadata from SQL Server INFORMATION_SCHEMA."""
    src_cur.execute("""
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH,
               NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
    """, (table,))
    rows = src_cur.fetchall()
    return [
        {
            "src_name": r[0],
            "new_name": strip_col(r[0], table),
            "data_type": r[1],
            "max_len": r[2],
            "prec": r[3],
            "scale": r[4],
            "nullable": r[5] == "YES",
        }
        for r in rows
    ]

def get_tgt_columns(tgt_cur, table: str) -> set[str]:
    """Return set of column names that exist in the PostgreSQL target table."""
    tgt_cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = %s AND table_schema = 'public'
    """, (table,))
    return {r[0] for r in tgt_cur.fetchall()}

def table_exists_in_src(src_cur, table: str) -> bool:
    src_cur.execute(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?", (table,)
    )
    return src_cur.fetchone()[0] > 0

def table_exists_in_tgt(tgt_cur, table: str) -> bool:
    tgt_cur.execute(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name=%s AND table_schema='public'",
        (table,)
    )
    return tgt_cur.fetchone()[0] > 0

def src_row_count(src_cur, table: str) -> int:
    src_cur.execute(f"SELECT COUNT(*) FROM [{table}]")
    return src_cur.fetchone()[0]

# PostgreSQL reserved keywords that must always be double-quoted as column names
PG_RESERVED = {
    "desc","asc","all","and","any","as","asc","between","by","case","check",
    "column","constraint","create","cross","default","desc","distinct","drop",
    "else","end","except","false","for","foreign","from","full","group",
    "having","in","inner","intersect","into","is","join","left","like",
    "limit","not","null","offset","on","or","order","outer","primary",
    "references","right","select","set","table","then","to","true","union",
    "unique","update","using","values","when","where","with","user",
}

def pg_quote(name: str) -> str:
    """Double-quote a column name if it's a reserved keyword."""
    return f'"{name}"' if name.lower() in PG_RESERVED else name

def match_col(stripped: str, new_table: str, tgt_cols: set[str],
              col_overrides: Optional[dict[str, str]] = None) -> Optional[str]:
    """
    Find the target PostgreSQL column for a stripped legacy field name.
    Strategy:
      1. Explicit override from TABLE_COLUMN_MAP (if provided)
      2. Exact match:    'branchid' -> 'branchid'
      3. Prefixed match: 'name'     -> 'zonename'  (new_table + stripped)
    Returns None when no target column is found (column is dropped).
    """
    # Explicit rename override
    if col_overrides and stripped in col_overrides:
        mapped = col_overrides[stripped]
        return mapped if mapped in tgt_cols else None
    if stripped in tgt_cols:
        return stripped
    # Try tablename+field (no separator): e.g. zone + name -> zonename
    prefixed = f"{new_table}{stripped}"
    if prefixed in tgt_cols:
        return prefixed
    # Try tablename_field (underscore): e.g. branchmaster + societyid -> branchmaster_societyid
    prefixed_u = f"{new_table}_{stripped}"
    if prefixed_u in tgt_cols:
        return prefixed_u
    return None

def coerce_value(val, col_meta: dict):
    """Convert SQL Server value to PostgreSQL-compatible Python value."""
    if val is None:
        return None
    dt = col_meta["data_type"].lower()
    if dt == "bit":
        # Return int so it works for both BOOLEAN and SMALLINT columns
        return int(bool(val))
    if dt == "uniqueidentifier":
        return str(val)
    if dt in ("money", "smallmoney"):
        return float(val)
    return val

def get_tgt_nullable(tgt_cur, table: str) -> dict[str, bool]:
    """Return {column_name: is_nullable} for the target table."""
    tgt_cur.execute("""
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = %s AND table_schema = 'public'
    """, (table,))
    return {r[0]: (r[1] == "YES") for r in tgt_cur.fetchall()}

# ── Migrate a MAPPED table ────────────────────────────────────────────────────

def migrate_mapped(src_conn, tgt_conn, legacy_table: str, new_table: str,
                   batch_size: int, dry_run: bool, truncate: bool = False) -> int:
    src_cur = src_conn.cursor()
    tgt_cur = tgt_conn.cursor()

    if not table_exists_in_src(src_cur, legacy_table):
        print(f"  [SKIP] {legacy_table} — not found in SQL Server")
        stats_log.append(TableStat(legacy_table, new_table, "skipped"))
        return 0

    # For tables with a custom SELECT query (e.g. needing a JOIN), use it to
    # derive column metadata from INFORMATION_SCHEMA but fetch rows via the query.
    custom_select = TABLE_CUSTOM_SELECT.get(legacy_table)
    col_overrides = dict(TABLE_COLUMN_MAP.get(legacy_table, {}))

    all_src_cols  = get_src_columns(src_cur, legacy_table)
    tgt_cols      = get_tgt_columns(tgt_cur, new_table)

    # CSAS_T_Member: discover name columns at runtime, build concat SELECT
    if legacy_table.upper() == "CSAS_T_MEMBER" and not custom_select:
        result = _build_member_custom_select(all_src_cols)
        if result:
            custom_select, extra_overrides = result
            col_overrides.update(extra_overrides)
            print(f"  [INFO] Member name cols: {list(extra_overrides.keys())}")
    tgt_nullable  = get_tgt_nullable(tgt_cur, new_table)

    is_user_table = legacy_table.upper() == "CSAS_T_USER"

    # Map source columns to target columns (explicit overrides take priority)
    col_map = []
    for c in all_src_cols:
        tgt_col = match_col(c["new_name"], new_table, tgt_cols, col_overrides)
        if tgt_col:
            col_map.append({**c, "tgt_col": tgt_col})

    # If a custom SELECT adds extra derived columns, append them with a dummy meta
    if custom_select:
        already_mapped_tgt = {c["tgt_col"] for c in col_map}
        # Check for derived column overrides: any override value not yet in col_map
        for stripped, tgt_col in col_overrides.items():
            if tgt_col not in already_mapped_tgt and tgt_col in tgt_cols:
                col_map.append({
                    "src_name": stripped,          # placeholder (not used for fetch)
                    "new_name": stripped,
                    "data_type": "nvarchar",       # safe fallback for coerce_value
                    "max_len": None, "prec": None, "scale": None,
                    "nullable": True,
                    "tgt_col": tgt_col,
                    "_derived": True,
                })

    # Detect NOT NULL target columns with no source equivalent (inject defaults)
    mapped_tgt = {c["tgt_col"] for c in col_map}
    injected: dict[str, object] = {}
    for col, nullable in tgt_nullable.items():
        if col not in mapped_tgt and not nullable:
            if col in ("branchid", "brid"):
                injected[col] = 1          # all legacy data is for branch 1
            elif col in ("ishoupdated", "hcl1", "hcl2", "hcl3"):
                injected[col] = 0
            elif col == "voucherid":
                injected[col] = 0          # placeholder; FK disabled during migration

    # Table-specific default injections (applied regardless of nullable status)
    for col, default_val in TABLE_DEFAULT_INJECTIONS.get(legacy_table, {}).items():
        if col not in mapped_tgt:
            injected[col] = default_val

    if not col_map and not injected:
        print(f"  [WARN] {legacy_table} — no matching columns found, skipping")
        stats_log.append(TableStat(legacy_table, new_table, "skipped",
                                   error="no matching columns"))
        return 0

    src_names    = [f"[{c['src_name']}]" for c in col_map if not c.get("_derived")]
    tgt_names    = [pg_quote(c["tgt_col"]) for c in col_map]
    inj_names    = [pg_quote(k) for k in injected]
    inj_vals     = list(injected.values())

    all_tgt_cols = tgt_names + inj_names
    placeholders = ", ".join(["%s"] * (len(col_map) + len(injected)))
    tgt_cols_sql = ", ".join(all_tgt_cols)

    insert_sql = (
        f'INSERT INTO "{new_table}" ({tgt_cols_sql}) '
        f"OVERRIDING SYSTEM VALUE "
        f"VALUES ({placeholders}) "
        f"ON CONFLICT DO NOTHING"
    )

    total = src_row_count(src_cur, legacy_table)
    if dry_run:
        print(f"  [DRY ] {legacy_table} -> {new_table}  ({total} rows, {len(col_map)} cols mapped, "
              f"{len(injected)} injected)")
        stats_log.append(TableStat(legacy_table, new_table, "mapped",
                                   src_rows=total, inserted=total))
        return total

    if truncate:
        tgt_cur.execute(f'TRUNCATE TABLE "{new_table}" CASCADE')
        tgt_conn.commit()
        print(f"  [TRUNC] {new_table}")

    print(f"  [MIGR] {legacy_table} -> {new_table}  ({total:,} rows) ...", end=" ", flush=True)

    # Use custom SELECT (with JOINs) when provided; else simple table fetch
    if custom_select:
        src_cur.execute(custom_select)
    elif src_names:
        src_cur.execute(f"SELECT {', '.join(src_names)} FROM [{legacy_table}]")
    else:
        src_cur.execute(f"SELECT 1 FROM [{legacy_table}]")

    # For custom SELECT, the result columns may differ from col_map order.
    # Build a name->index map from the cursor description after execute.
    custom_col_index: dict[str, int] = {}

    is_voucher_table = legacy_table.upper() == "CSAS_T_VOUCHER"

    # Pre-compute positions of vouchertype / vouchersubtype in the processed
    # tuple so build_row can apply the combined translation efficiently.
    vtype_pos    = next((i for i, c in enumerate(col_map) if c["tgt_col"] == "vouchertype"),    None)
    vsubtype_pos = next((i for i, c in enumerate(col_map) if c["tgt_col"] == "vouchersubtype"), None)

    # Index into plain-SELECT rows by non-derived position only
    non_derived_cols = [c for c in col_map if not c.get("_derived")]

    # Per-column value transforms for this table (tilde splitting, code mapping, etc.)
    table_transforms = TABLE_VALUE_TRANSFORMS.get(legacy_table, {})

    def build_row(row):
        processed = []
        plain_idx = 0  # position in the plain SELECT result
        for c in col_map:
            if c.get("_derived"):
                # Derived column from custom SELECT (e.g. concatenated name, JOIN-derived id).
                # custom_col_index keys are UPPERCASE; tgt_col is lowercase → use .upper().
                idx = custom_col_index.get(c["tgt_col"].upper())
                val = row[idx] if (idx is not None and custom_select) else None
            elif custom_select:
                idx = custom_col_index.get(c["src_name"].upper())
                if idx is None:
                    # Fallback: alias in custom SELECT may match the target col name
                    idx = custom_col_index.get(c["tgt_col"].upper())
                val = row[idx] if idx is not None else None
                plain_idx += 1
            else:
                val = row[plain_idx]
                plain_idx += 1
            if is_user_table and c["tgt_col"] == "password" and val:
                # Legacy stores password as Base64(plaintext) — decode first, then hash
                try:
                    plain = base64.b64decode(str(val)).decode("utf-8")
                except Exception:
                    plain = str(val)
                val = hash_password(plain)
            else:
                val = coerce_value(val, c)
            # Apply per-column value transform (tilde splitting, code mapping, etc.)
            tf = table_transforms.get(c["tgt_col"])
            if tf is not None:
                val = tf(val)
            processed.append(val)
        processed.extend(inj_vals)

        # Apply VoucherType + SubType combined translation for the voucher table
        if is_voucher_table and vtype_pos is not None and vsubtype_pos is not None:
            new_vtype, new_vsubtype = translate_voucher_types(
                processed[vtype_pos], processed[vsubtype_pos]
            )
            processed[vtype_pos]    = new_vtype
            processed[vsubtype_pos] = new_vsubtype

        return tuple(processed)

    # After execute, capture result column positions by name (upper-cased).
    # Needed for custom SELECT queries where column order differs from col_map.
    if custom_select and src_cur.description:
        custom_col_index = {
            desc[0].upper(): i for i, desc in enumerate(src_cur.description)
        }

    inserted = 0
    skipped  = 0

    try:
        while True:
            rows = src_cur.fetchmany(batch_size)
            if not rows:
                break
            batch = [build_row(r) for r in rows]
            try:
                psycopg2.extras.execute_batch(tgt_cur, insert_sql, batch, page_size=batch_size)
                tgt_conn.commit()
                inserted += len(batch)
            except Exception as batch_err:
                tgt_conn.rollback()
                # Row-by-row fallback so one bad row doesn't lose the whole batch
                for row_vals in batch:
                    try:
                        tgt_cur.execute(insert_sql, row_vals)
                        tgt_conn.commit()
                        inserted += 1
                    except Exception as row_err:
                        tgt_conn.rollback()
                        skipped += 1
                        if skipped <= 3:
                            print(f"\n  [ROW-ERR] {row_err}")
                            print(f"  [ROW-ERR] SQL: {insert_sql[:120]}")
                            print(f"  [ROW-ERR] vals: {row_vals}")
        print(f"done ({inserted:,} inserted, {skipped:,} skipped)")
    except Exception as e:
        tgt_conn.rollback()
        print(f"ERROR: {e}")
        stats_log.append(TableStat(legacy_table, new_table, "mapped",
                                   src_rows=total, inserted=inserted, error=str(e)))
        return inserted

    # Post-insert fixups: sync derived columns that couldn't be mapped 1:1
    if new_table == "membernomineedetails":
        tgt_cur.execute(
            'UPDATE "membernomineedetails" SET relationwithmember = relationid '
            'WHERE relationid IS NOT NULL'
        )
        tgt_conn.commit()

    # Reset sequence so new inserts don't collide
    seq_name = f"{new_table}_id_seq"
    tgt_cur.execute(f"""
        SELECT setval('{seq_name}',
            COALESCE((SELECT MAX(id) FROM "{new_table}"), 0) + 1, false)
        WHERE EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = '{seq_name}')
    """)
    tgt_conn.commit()

    stats_log.append(TableStat(legacy_table, new_table, "mapped",
                               src_rows=total, inserted=inserted))
    return inserted

# ── Auto-create and migrate an UNMAPPED table ─────────────────────────────────

def migrate_unmapped(src_conn, tgt_conn, legacy_table: str,
                     batch_size: int, dry_run: bool, truncate: bool = False) -> int:
    src_cur = src_conn.cursor()
    tgt_cur = tgt_conn.cursor()

    # New table name: strip CSAS_T_ prefix, lowercase
    base = legacy_table
    for pfx in ("CSAS_T_", "csas_t_"):
        if base.startswith(pfx):
            base = base[len(pfx):]
            break
    new_table = base.lower()

    all_src_cols = get_src_columns(src_cur, legacy_table)
    if not all_src_cols:
        return 0

    total = src_row_count(src_cur, legacy_table)
    has_branchid = any(c["new_name"] == "branchid" for c in all_src_cols)
    pk = "PRIMARY KEY (id, branchid)" if has_branchid else "PRIMARY KEY (id)"

    if dry_run:
        print(f"  [DRY ] {legacy_table} -> {new_table} (auto-create, {total} rows, {pk})")
        stats_log.append(TableStat(legacy_table, new_table, "auto-created",
                                   src_rows=total, inserted=total))
        return total

    # Create table if not exists
    was_created = False
    if not table_exists_in_tgt(tgt_cur, new_table):
        col_defs = []
        for c in all_src_cols:
            nn = c["new_name"]
            if nn == "id":
                # Use GENERATED ALWAYS AS IDENTITY — overridden during migration
                # via INSERT ... OVERRIDING SYSTEM VALUE
                col_defs.append("    id INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1)")
            else:
                pgt = pg_type(c["data_type"], c["max_len"], c["prec"], c["scale"])
                # Relax NOT NULL for unmapped tables to avoid insert failures
                col_defs.append(f"    {pg_quote(nn)} {pgt}")
        create_sql = (
            f'CREATE TABLE IF NOT EXISTS "{new_table}" (\n'
            + ",\n".join(col_defs)
            + f",\n    CONSTRAINT pk_{new_table} {pk}\n);"
        )
        tgt_cur.execute(create_sql)
        tgt_conn.commit()
        was_created = True
        print(f"  [CREA] {new_table} created ({len(all_src_cols)} cols, {pk})")
    elif truncate:
        tgt_cur.execute(f'TRUNCATE TABLE "{new_table}" CASCADE')
        tgt_conn.commit()
        print(f"  [TRUNC] {new_table}")

    tgt_cols = get_tgt_columns(tgt_cur, new_table)

    col_map = [c for c in all_src_cols if c["new_name"] in tgt_cols]
    if not col_map:
        print(f"  [WARN] {legacy_table} — no matchable columns after create, skipping data")
        stats_log.append(TableStat(legacy_table, new_table, "auto-created",
                                   src_rows=total, created=was_created))
        return 0

    src_names    = [f"[{c['src_name']}]" for c in col_map]
    tgt_names    = [pg_quote(c["new_name"]) for c in col_map]
    placeholders = ", ".join(["%s"] * len(col_map))
    tgt_cols_sql = ", ".join(tgt_names)

    insert_sql = (
        f'INSERT INTO "{new_table}" ({tgt_cols_sql}) '
        f"OVERRIDING SYSTEM VALUE "
        f"VALUES ({placeholders}) "
        f"ON CONFLICT DO NOTHING"
    )

    print(f"  [MIGR] {legacy_table} -> {new_table} ({total:,} rows) ...", end=" ", flush=True)
    src_cur.execute(f"SELECT {', '.join(src_names)} FROM [{legacy_table}]")

    inserted = 0
    skipped = 0
    try:
        while True:
            rows = src_cur.fetchmany(batch_size)
            if not rows:
                break
            batch = [tuple(coerce_value(row[i], col_map[i]) for i in range(len(col_map))) for row in rows]
            try:
                psycopg2.extras.execute_batch(tgt_cur, insert_sql, batch, page_size=batch_size)
                tgt_conn.commit()
                inserted += len(batch)
            except Exception:
                tgt_conn.rollback()
                for row_vals in batch:
                    try:
                        tgt_cur.execute(insert_sql, row_vals)
                        tgt_conn.commit()
                        inserted += 1
                    except Exception:
                        tgt_conn.rollback()
                        skipped += 1
        print(f"done ({inserted:,} inserted, {skipped:,} skipped)")
    except Exception as e:
        tgt_conn.rollback()
        print(f"ERROR: {e}")
        stats_log.append(TableStat(legacy_table, new_table, "auto-created",
                                   src_rows=total, inserted=inserted,
                                   created=was_created, error=str(e)))
        return inserted

    stats_log.append(TableStat(legacy_table, new_table, "auto-created",
                               src_rows=total, inserted=inserted, created=was_created))
    return inserted

# ── Member sub-table migration ────────────────────────────────────────────────
# CSAS_T_Member holds location and document fields that the new schema puts in
# separate tables (memberlocationdetails and memberdocdetails).  These were not
# written by the standard mapped migration, so they are handled here explicitly.

def migrate_member_sub_tables(
    src_conn, tgt_conn, batch_size: int, dry_run: bool, truncate: bool
) -> None:
    """Populate memberlocationdetails and memberdocdetails from CSAS_T_Member."""

    src_cur = src_conn.cursor()
    tgt_cur = tgt_conn.cursor()

    # ── Verify source table exists ───────────────────────────────────────────
    src_cur.execute("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = 'CSAS_T_Member'
    """)
    if src_cur.fetchone()[0] == 0:
        print("  [SKIP] CSAS_T_Member not found — skipping member sub-table migration")
        return

    # Verify the fields we need actually exist in the source table.
    src_cur.execute("""
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'CSAS_T_Member'
    """)
    src_cols = {r[0].upper() for r in src_cur.fetchall()}

    def has(col: str) -> bool:
        return col.upper() in src_cols

    print(f"\n{'='*60}")
    print("Phase 1.5: Member sub-tables (memberlocationdetails, memberdocdetails)")
    print(f"{'='*60}")

    # ── memberlocationdetails ────────────────────────────────────────────────
    print("\n  [INFO] memberlocationdetails from CSAS_T_Member ...")

    if truncate:
        tgt_cur.execute('TRUNCATE TABLE "memberlocationdetails"')
        tgt_conn.commit()
        print("  [TRUNC] memberlocationdetails")

    # Build SELECT — fall back to '' / 0 for any column not present in source.
    loc_select = """
        SELECT
            m.ID                                                  AS member_id,
            m.C_Member_BranchId                                   AS branchid,
            ISNULL(m.C_Member_AddressLine1,   '')                 AS addressline1,
            ISNULL(m.C_Member_AddressLineSL1, '')                 AS addresslinesl1,
            ISNULL(m.C_Member_AddressLine2,   '')                 AS addressline2,
            ISNULL(m.C_Member_AddressLineSL2, '')                 AS addresslinesl2,
            ISNULL(m.C_Member_VillageId,      0)                  AS villageid1,
            ISNULL(m.C_Member_PO1,            0)                  AS po1,
            ISNULL(m.C_Member_Tehsil1,        0)                  AS tehsil1,
            0                                                      AS thanaid1,
            ISNULL(m.C_Member_ZoneId,         0)                  AS zoneid1
        FROM [CSAS_T_Member] m
    """

    # Conditionally replace any missing optional columns with literals.
    # (The mandatory columns above exist in all known schemas; guard them anyway.)
    if not has("C_Member_AddressLine1"):
        loc_select = loc_select.replace("m.C_Member_AddressLine1,", "'',")
    if not has("C_Member_AddressLineSL1"):
        loc_select = loc_select.replace("m.C_Member_AddressLineSL1,", "'',")
    if not has("C_Member_AddressLine2"):
        loc_select = loc_select.replace("m.C_Member_AddressLine2,", "'',")
    if not has("C_Member_AddressLineSL2"):
        loc_select = loc_select.replace("m.C_Member_AddressLineSL2,", "'',")
    if not has("C_Member_VillageId"):
        loc_select = loc_select.replace("m.C_Member_VillageId,", "0,")
    if not has("C_Member_PO1"):
        loc_select = loc_select.replace("m.C_Member_PO1,", "0,")
    if not has("C_Member_Tehsil1"):
        loc_select = loc_select.replace("m.C_Member_Tehsil1,", "0,")
    if not has("C_Member_ZoneId"):
        loc_select = loc_select.replace("m.C_Member_ZoneId,", "0,")

    loc_insert = """
        INSERT INTO "memberlocationdetails"
            (branchid, memberid, addressline1, addresslinesl1,
             addressline2, addresslinesl2,
             villageid1, po1, tehsil1, thanaid1, zoneid1)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (memberid, branchid) DO NOTHING
    """

    if dry_run:
        src_cur.execute(f"SELECT COUNT(*) FROM [CSAS_T_Member]")
        total = src_cur.fetchone()[0]
        print(f"  [DRY ] memberlocationdetails <- CSAS_T_Member ({total} rows)")
    else:
        src_cur.execute(loc_select)
        inserted = skipped = 0
        while True:
            rows = src_cur.fetchmany(batch_size)
            if not rows:
                break
            batch = [(
                r[1], r[0],             # branchid, memberid
                r[2] or "", r[3] or "", # addressline1, addresslinesl1
                r[4] or "", r[5] or "", # addressline2, addresslinesl2
                r[6] or 0,  r[7] or 0, # villageid1, po1
                r[8] or 0,  r[9],      # tehsil1, thanaid1 (always 0)
                r[10] or 0,            # zoneid1
            ) for r in rows]
            try:
                psycopg2.extras.execute_batch(tgt_cur, loc_insert, batch, page_size=batch_size)
                tgt_conn.commit()
                inserted += len(batch)
            except Exception:
                tgt_conn.rollback()
                for row_vals in batch:
                    try:
                        tgt_cur.execute(loc_insert, row_vals)
                        tgt_conn.commit()
                        inserted += 1
                    except Exception:
                        tgt_conn.rollback()
                        skipped += 1
        print(f"  [DONE] memberlocationdetails: {inserted} inserted, {skipped} skipped")
        stats_log.append(TableStat("CSAS_T_Member[location]", "memberlocationdetails",
                                   "mapped", src_rows=inserted + skipped, inserted=inserted))

    # ── memberdocdetails ─────────────────────────────────────────────────────
    print("\n  [INFO] memberdocdetails from CSAS_T_Member ...")

    if truncate:
        tgt_cur.execute('TRUNCATE TABLE "memberdocdetails"')
        tgt_conn.commit()
        print("  [TRUNC] memberdocdetails")

    pan_col    = "m.C_Member_PanCardNo"    if has("C_Member_PanCardNo")    else "''"
    aadhaar_col = "m.C_Member_AadhaarCardNo" if has("C_Member_AadhaarCardNo") else "''"

    doc_select = f"""
        SELECT
            m.ID                                 AS member_id,
            m.C_Member_BranchId                  AS branchid,
            ISNULL({pan_col},     '')             AS pancardno,
            ISNULL({aadhaar_col}, '')             AS aadhaarcardno
        FROM [CSAS_T_Member] m
    """

    doc_insert = """
        INSERT INTO "memberdocdetails"
            (branchid, memberid, pancardno, aadhaarcardno, memberpicext, membersignext)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (memberid, branchid) DO NOTHING
    """

    if dry_run:
        src_cur.execute("SELECT COUNT(*) FROM [CSAS_T_Member]")
        total = src_cur.fetchone()[0]
        print(f"  [DRY ] memberdocdetails <- CSAS_T_Member ({total} rows)")
    else:
        src_cur.execute(doc_select)
        inserted = skipped = 0
        while True:
            rows = src_cur.fetchmany(batch_size)
            if not rows:
                break
            batch = [(
                r[1], r[0],   # branchid, memberid
                r[2] or "",   # pancardno
                r[3] or "",   # aadhaarcardno
                "", "",       # memberpicext, membersignext (no image migration)
            ) for r in rows]
            try:
                psycopg2.extras.execute_batch(tgt_cur, doc_insert, batch, page_size=batch_size)
                tgt_conn.commit()
                inserted += len(batch)
            except Exception:
                tgt_conn.rollback()
                for row_vals in batch:
                    try:
                        tgt_cur.execute(doc_insert, row_vals)
                        tgt_conn.commit()
                        inserted += 1
                    except Exception:
                        tgt_conn.rollback()
                        skipped += 1
        print(f"  [DONE] memberdocdetails: {inserted} inserted, {skipped} skipped")
        stats_log.append(TableStat("CSAS_T_Member[docs]", "memberdocdetails",
                                   "mapped", src_rows=inserted + skipped, inserted=inserted))


# ── Post-migration fixes ───────────────────────────────────────────────────────

def post_migrate_generalproductid(src_conn, tgt_conn, dry_run: bool):
    """
    Fix accountmaster.generalproductid for Loan (acctypeid=1), RD (5), and FD (6).

    During accountmaster migration the COALESCE logic leaves generalproductid=0
    when the legacy column stores integer 0 instead of NULL for unset product IDs.
    This step reads each account-type-specific product ID column from SQL Server
    and applies the correct value to PostgreSQL.
    """
    print(f"\n  [FIX] generalproductid for Loan / RD / FD accounts ...")

    src_cur = src_conn.cursor()
    tgt_cur = tgt_conn.cursor()

    # (acctypeid, legacy_column, label)
    fixes = [
        (1, "C_AccountMaster_LoanProductID", "Loan"),
        (5, "C_AccountMaster_RDProductID",   "RD"),
        (6, "C_AccountMaster_FDProductID",   "FD"),
    ]

    for acctypeid, legacy_col, label in fixes:
        src_cur.execute(f"""
            SELECT Id, {legacy_col}
            FROM CSAS_T_AccountMaster
            WHERE C_AccountMaster_AccTypeId = {acctypeid}
              AND {legacy_col} IS NOT NULL
              AND {legacy_col} > 0
        """)
        rows = src_cur.fetchall()
        updated = 0
        for (acc_id, product_id) in rows:
            if not dry_run:
                tgt_cur.execute(
                    "UPDATE accountmaster SET generalproductid = %s WHERE id = %s AND acctypeid = %s",
                    (product_id, acc_id, acctypeid)
                )
                if tgt_cur.rowcount > 0:
                    updated += 1
            else:
                updated += 1
        if not dry_run:
            tgt_conn.commit()
        print(f"      {label}: {updated} accounts updated")


def post_migrate_station_to_village(tgt_conn, dry_run: bool):
    """
    Copy migrated station rows into the village table at the same IDs.

    Legacy members store station IDs in C_Member_VillageId, which migrate.py
    writes to memberaddressdetail.villageid1.  The new schema references the
    village table via that column.  Since CSAS_T_Village doesn't exist in the
    legacy "00" database, we alias every station row into village at the same ID
    so that memberaddressdetail.villageid1 (= legacy station ID) resolves
    correctly in the UI.

    Geographic FK fields (zoneid, thanaid, postofficeid, tehsilid, patwarid)
    are defaulted to 0; they can be filled in later once the client provides
    the actual mapping.
    """
    tgt_cur = tgt_conn.cursor()

    tgt_cur.execute("SELECT COUNT(*) FROM station")
    station_count = tgt_cur.fetchone()[0]
    if station_count == 0:
        print("  [SKIP] station→village alias — station table is empty")
        return

    if dry_run:
        print(f"  [DRY ] station→village alias — would copy {station_count} station rows into village")
        return

    # Introspect actual station columns — strip_col results vary by legacy schema version.
    tgt_cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'station'
    """)
    station_cols = {r[0].lower() for r in tgt_cur.fetchall()}

    if "brid" in station_cols:
        brid_expr = "COALESCE(s.brid, 1)"
    elif "branchid" in station_cols:
        brid_expr = "COALESCE(s.branchid, 1)"
    else:
        brid_expr = "1"

    if "name" in station_cols:
        name_expr = "COALESCE(NULLIF(TRIM(s.name), ''), 'Station ' || s.id::text)"
    elif "stationname" in station_cols:
        name_expr = "COALESCE(NULLIF(TRIM(s.stationname), ''), 'Station ' || s.id::text)"
    else:
        name_expr = "'Station ' || s.id::text"

    if "namesl" in station_cols:
        namesl_expr = "s.namesl"
    elif "stationnamesl" in station_cols:
        namesl_expr = "s.stationnamesl"
    else:
        namesl_expr = "NULL"

    print(f"    station cols detected: {sorted(station_cols)}")
    print(f"    using: brid={brid_expr}, name={name_expr}, namesl={namesl_expr}")

    insert_sql = f"""
        INSERT INTO village (id, branchid, villagename, villagenamesl,
                             zoneid, thanaid, postofficeid, tehsilid, pincode, patwarid)
        OVERRIDING SYSTEM VALUE
        SELECT
            s.id,
            {brid_expr},
            {name_expr},
            {namesl_expr},
            0, 0, 0, 0, 0, 0
        FROM station s
        ON CONFLICT DO NOTHING
    """
    tgt_cur.execute(insert_sql)
    copied = tgt_cur.rowcount
    tgt_conn.commit()
    print(f"  [ALIAS] station→village — copied {copied} station rows into village table")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="SQL Server -> PostgreSQL migration")
    parser.add_argument("--source", required=True,
        help='pyodbc connection string for SQL Server source. '
             'Example: "DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=00;Trusted_Connection=yes;Encrypt=yes;TrustServerCertificate=yes;"')
    parser.add_argument("--target", required=True,
        help='psycopg2 DSN for PostgreSQL target. Example: "host=localhost dbname=banking user=admin password=..."')
    parser.add_argument("--tables",
        help="Comma-separated list of CSAS_T_ table names to migrate (default: all)")
    parser.add_argument("--dry-run", action="store_true",
        help="Print what would be migrated without inserting anything")
    parser.add_argument("--batch-size", type=int, default=500,
        help="Rows per batch insert (default: 500)")
    parser.add_argument("--skip-unmapped", action="store_true",
        help="Skip tables not in TABLE_RENAMES (default: auto-create them)")
    parser.add_argument("--truncate", action="store_true",
        help="TRUNCATE each target table before inserting (clean slate migration)")
    args = parser.parse_args()

    print("Connecting to SQL Server ...")
    src_conn = pyodbc.connect(args.source)
    src_conn.setdecoding(pyodbc.SQL_CHAR,  encoding="utf-8")
    src_conn.setdecoding(pyodbc.SQL_WCHAR, encoding="utf-8")
    src_conn.setencoding(encoding="utf-8")

    print("Connecting to PostgreSQL ...")
    tgt_conn = psycopg2.connect(args.target)
    tgt_conn.autocommit = False

    # Disable FK checks during migration
    tgt_cur = tgt_conn.cursor()
    tgt_cur.execute("SET session_replication_role = 'replica';")
    tgt_conn.commit()

    src_cur = src_conn.cursor()

    # Diagnostic: confirm we're on the right database
    src_cur.execute("SELECT DB_NAME(), COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
    diag = src_cur.fetchone()
    print(f"  Source DB  : {diag[0]}")
    print(f"  Total tables in source: {diag[1]}")

    # Discover all CSAS_T_ tables in SQL Server
    src_cur.execute("""
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME LIKE 'CSAS_T_%'
        ORDER BY TABLE_NAME
    """)
    all_src_tables = [r[0] for r in src_cur.fetchall()]
    print(f"  CSAS_T_ tables found: {len(all_src_tables)}")
    if all_src_tables:
        print(f"  First few: {all_src_tables[:5]}")
    print()

    if args.tables:
        requested = set(t.strip() for t in args.tables.split(","))
        all_src_tables = [t for t in all_src_tables if t in requested]

    # Phase 1: migrate mapped tables in FK order
    print(f"\n{'='*60}")
    print(f"Phase 1: Mapped tables ({len(TABLE_RENAMES)} defined)")
    print(f"{'='*60}")

    migrated_tables = set()
    total_rows = 0

    for legacy_table in MIGRATION_ORDER:
        if legacy_table not in TABLE_RENAMES:
            continue
        # Normalize case to match actual SQL Server table name
        actual = next((t for t in all_src_tables if t.upper() == legacy_table.upper()), None)
        if not actual:
            print(f"  [SKIP] {legacy_table} — not in source DB")
            continue
        new_table = TABLE_RENAMES[legacy_table]
        n = migrate_mapped(src_conn, tgt_conn, actual, new_table, args.batch_size, args.dry_run, args.truncate)
        total_rows += n
        migrated_tables.add(actual.upper())

    # Seed accountheadtype if empty (legacy table is always 0 rows; types are
    # implicit convention: id 1=Liabilities, 2=Assets, 3=Income, 4=Expenditure).
    tgt_cur.execute("SELECT COUNT(*) FROM accountheadtype WHERE branchid = 1")
    if tgt_cur.fetchone()[0] == 0 and not args.dry_run:
        seed_rows = [
            (1, 1, "Liabilities", "", 1),
            (2, 1, "Assets",      "", 2),
            (3, 1, "Income",      "", 3),
            (4, 1, "Expenditure", "", 4),
        ]
        for row in seed_rows:
            tgt_cur.execute(
                'INSERT INTO accountheadtype (id, branchid, description, descriptionsl, categoryid) '
                'OVERRIDING SYSTEM VALUE VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING',
                row,
            )
        tgt_conn.commit()
        print(f"\n  [SEED] accountheadtype — inserted 4 standard account head types")

    # Phase 1.5: member sub-tables (location + docs) from CSAS_T_Member
    # Only run if we're not filtering to a specific table list, or if CSAS_T_Member
    # is explicitly in the requested tables.
    run_member_sub = (
        not args.tables or
        "CSAS_T_Member" in (t.strip() for t in args.tables.split(","))
    )
    if run_member_sub and "CSAS_T_MEMBER" in migrated_tables:
        migrate_member_sub_tables(src_conn, tgt_conn, args.batch_size, args.dry_run, args.truncate)

    # Phase 1.6: fix generalproductid for Loan/RD/FD accounts.
    # The accountmaster COALESCE logic during migration often leaves 0 for integer
    # product ID columns (SQL Server stores 0 instead of NULL for "not set").
    # This step pulls the correct product ID from each account-type-specific column
    # and applies it, making product dropdowns work correctly.
    run_acc_master = (
        not args.tables or
        "CSAS_T_AccountMaster" in (t.strip() for t in args.tables.split(","))
    )
    if run_acc_master and "CSAS_T_ACCOUNTMASTER" in migrated_tables:
        post_migrate_generalproductid(src_conn, tgt_conn, args.dry_run)

    # Phase 1.7: alias station rows into village so memberaddressdetail.villageid1
    # references resolve correctly (CSAS_T_Village does not exist in legacy "00").
    run_station_alias = (
        not args.tables or
        "CSAS_T_Station" in (t.strip() for t in args.tables.split(","))
    )
    if run_station_alias and "CSAS_T_STATION" in migrated_tables:
        print(f"\n  Phase 1.7: station→village alias")
        post_migrate_station_to_village(tgt_conn, args.dry_run)

    # Phase 2: unmapped tables
    # Audit/log tables — skipped intentionally; old log data is not meaningful in the new system.
    SKIP_UNMAPPED = {
        "CSAS_T_USERENTRYLOG", "CSAS_T_USERENTRYLOGDETAIL",
        "CSAS_T_USERLOGINHISTORY", "CSAS_T_USERCURRENTSESSION",
        "CSAS_T_BACKUPHISTORY",
    }
    if not args.skip_unmapped:
        unmapped = [t for t in all_src_tables
                    if t.upper() not in migrated_tables and t.upper() not in SKIP_UNMAPPED]
        print(f"\n{'='*60}")
        print(f"Phase 2: Unmapped tables ({len(unmapped)} tables -> auto-create)")
        print(f"{'='*60}")
        for t in unmapped:
            n = migrate_unmapped(src_conn, tgt_conn, t, args.batch_size, args.dry_run, args.truncate)
            total_rows += n

    # Re-enable FK checks
    tgt_cur.execute("SET session_replication_role = 'origin';")
    tgt_conn.commit()

    print_stats()
    if args.dry_run:
        print("  (DRY RUN — nothing was written)\n")

    src_conn.close()
    tgt_conn.close()

if __name__ == "__main__":
    main()
