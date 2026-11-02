-- ============================================================
-- DATA MIGRATION DIAGNOSTIC SCRIPT
-- Run this on your PostgreSQL database and share all results.
-- Each section tells you a specific category of mismatch.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. BRANCHES: what branch IDs exist?
-- ──────────────────────────────────────────────────────────
SELECT 'BRANCHES' AS section, id AS branch_id, branchmaster_name AS branch_name
FROM branchmaster
ORDER BY id;

-- ──────────────────────────────────────────────────────────
-- 2. ACCOUNTS: distribution by branch and type
--    AccTypeId: 1=Loan, 2=Saving, 3=General, 4=ShareMoney, 5=RD, 6=FD
-- ──────────────────────────────────────────────────────────
SELECT 'ACCOUNT_DIST' AS section,
       branchid,
       acctypeid,
       CASE acctypeid
           WHEN 1 THEN 'Loan'
           WHEN 2 THEN 'Saving'
           WHEN 3 THEN 'General'
           WHEN 4 THEN 'ShareMoney'
           WHEN 5 THEN 'RD'
           WHEN 6 THEN 'FD'
           ELSE 'Unknown-' || acctypeid::text
       END AS type_name,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE isaccclosed = true) AS closed,
       COUNT(*) FILTER (WHERE isaccclosed IS NULL OR isaccclosed = false) AS active
FROM accountmaster
GROUP BY branchid, acctypeid
ORDER BY branchid, acctypeid;

-- ──────────────────────────────────────────────────────────
-- 3. PRODUCTS: distribution by branch (all types)
-- ──────────────────────────────────────────────────────────
SELECT 'RD_PRODUCTS' AS section, brid AS branchid, id, productname, productcode, effectivefrom
FROM rdproduct ORDER BY brid, id;

SELECT 'FD_PRODUCTS' AS section, branchid, id, productname, productcode, effectivefrom, effectivetill
FROM fdproduct ORDER BY branchid, id;

SELECT 'SAVING_PRODUCTS' AS section, branchid, id, productname, productcode, effectivefrom, effectivetill
FROM savingproduct ORDER BY branchid, id;

SELECT 'LOAN_PRODUCTS' AS section, brid AS branchid, id, productname, code, effectivefrom
FROM loanproduct ORDER BY brid, id;

-- ──────────────────────────────────────────────────────────
-- 4. PRODUCT-ACCOUNT MISMATCH
--    Accounts whose generalproductid references a product
--    that doesn't exist for the account's own branch.
-- ──────────────────────────────────────────────────────────

-- 4a. RD accounts with no matching RD product in the same branch
SELECT 'RD_ACCT_NO_PRODUCT' AS issue,
       a.id AS account_id, a.branchid, a.accountnumber, a.accountname,
       a.generalproductid AS referenced_product_id,
       rp.id AS found_product_id, rp.brid AS found_in_branch
FROM accountmaster a
LEFT JOIN rdproduct rp ON rp.id = a.generalproductid AND rp.brid = a.branchid
WHERE a.acctypeid = 5
  AND a.generalproductid IS NOT NULL
  AND rp.id IS NULL
ORDER BY a.branchid, a.id;

-- 4b. FD accounts with no matching FD product in the same branch
SELECT 'FD_ACCT_NO_PRODUCT' AS issue,
       a.id AS account_id, a.branchid, a.accountnumber, a.accountname,
       a.generalproductid AS referenced_product_id
FROM accountmaster a
LEFT JOIN fdproduct fp ON fp.id = a.generalproductid AND fp.branchid = a.branchid
WHERE a.acctypeid = 6
  AND a.generalproductid IS NOT NULL
  AND fp.id IS NULL
ORDER BY a.branchid, a.id;

-- 4c. Saving accounts with no matching Saving product in the same branch
SELECT 'SAVING_ACCT_NO_PRODUCT' AS issue,
       a.id AS account_id, a.branchid, a.accountnumber, a.accountname,
       a.generalproductid AS referenced_product_id
FROM accountmaster a
LEFT JOIN savingproduct sp ON sp.id = a.generalproductid AND sp.branchid = a.branchid
WHERE a.acctypeid = 2
  AND a.generalproductid IS NOT NULL
  AND sp.id IS NULL
ORDER BY a.branchid, a.id;

-- 4d. Loan accounts with no matching Loan product in the same branch
SELECT 'LOAN_ACCT_NO_PRODUCT' AS issue,
       a.id AS account_id, a.branchid, a.accountnumber, a.accountname,
       a.generalproductid AS referenced_product_id
FROM accountmaster a
LEFT JOIN loanproduct lp ON lp.id = a.generalproductid AND lp.brid = a.branchid
WHERE a.acctypeid = 1
  AND a.generalproductid IS NOT NULL
  AND lp.id IS NULL
ORDER BY a.branchid, a.id;

-- ──────────────────────────────────────────────────────────
-- 5. WRONG BRANCH IN PRODUCT TABLES
--    Products whose branch ID doesn't match any branchmaster.
-- ──────────────────────────────────────────────────────────
SELECT 'RD_PRODUCT_ORPHAN_BRANCH' AS issue, id, brid AS branchid, productname
FROM rdproduct
WHERE brid NOT IN (SELECT id FROM branchmaster);

SELECT 'FD_PRODUCT_ORPHAN_BRANCH' AS issue, id, branchid, productname
FROM fdproduct
WHERE branchid NOT IN (SELECT id FROM branchmaster);

SELECT 'SAVING_PRODUCT_ORPHAN_BRANCH' AS issue, id, branchid, productname
FROM savingproduct
WHERE branchid NOT IN (SELECT id FROM branchmaster);

SELECT 'LOAN_PRODUCT_ORPHAN_BRANCH' AS issue, id, brid AS branchid, productname
FROM loanproduct
WHERE brid NOT IN (SELECT id FROM branchmaster);

-- ──────────────────────────────────────────────────────────
-- 6. ACCOUNTS WITH WRONG BRANCH (not in branchmaster)
-- ──────────────────────────────────────────────────────────
SELECT 'ACCOUNT_ORPHAN_BRANCH' AS issue, COUNT(*) AS count, branchid
FROM accountmaster
WHERE branchid NOT IN (SELECT id FROM branchmaster)
GROUP BY branchid;

-- ──────────────────────────────────────────────────────────
-- 7. MEMBER–ACCOUNT BRANCH MISMATCH
--    Accounts whose memberbranchid ≠ their own branchid,
--    OR whose (memberid, memberbranchid) has no matching member row.
-- ──────────────────────────────────────────────────────────
SELECT 'ACCT_MEMBER_BRANCH_MISMATCH' AS issue,
       a.id AS account_id, a.branchid AS account_branchid,
       a.memberid, a.memberbranchid,
       m.id IS NOT NULL AS member_exists
FROM accountmaster a
LEFT JOIN member m ON m.id = a.memberid AND m.branchid = a.memberbranchid
WHERE a.memberid IS NOT NULL
  AND (a.memberbranchid IS NULL
       OR a.memberbranchid != a.branchid
       OR m.id IS NULL)
ORDER BY a.branchid, a.id
LIMIT 50;

-- ──────────────────────────────────────────────────────────
-- 8. MEMBERS WITH WRONG BRANCH (not in branchmaster)
-- ──────────────────────────────────────────────────────────
SELECT 'MEMBER_ORPHAN_BRANCH' AS issue, COUNT(*) AS count, branchid
FROM member
WHERE branchid NOT IN (SELECT id FROM branchmaster)
GROUP BY branchid;

-- ──────────────────────────────────────────────────────────
-- 9. EFFECTIVEFROM DATES — are products future-dated?
--    Products with effectivefrom > today are hidden by date filter.
-- ──────────────────────────────────────────────────────────
SELECT 'RD_FUTURE_DATED' AS issue, id, brid AS branchid, productname, effectivefrom
FROM rdproduct
WHERE effectivefrom > CURRENT_DATE;

SELECT 'FD_FUTURE_DATED' AS issue, id, branchid, productname, effectivefrom
FROM fdproduct
WHERE effectivefrom > CURRENT_DATE;

SELECT 'SAVING_FUTURE_DATED' AS issue, id, branchid, productname, effectivefrom
FROM savingproduct
WHERE effectivefrom > CURRENT_DATE;

-- ──────────────────────────────────────────────────────────
-- 10. SAVINGPRODUCT / FDPRODUCT UNIQUE NAME CLASH
--     These tables have GLOBALLY unique productname/productcode
--     (no branch qualifier). If migration tried to insert the
--     same names for a second branch, those rows were silently
--     skipped and only the first branch's product IDs exist.
-- ──────────────────────────────────────────────────────────
SELECT 'SAVING_NAME_BRANCHES' AS issue,
       productname, productcode, COUNT(*) AS branch_count,
       STRING_AGG(branchid::text, ', ') AS in_branches
FROM savingproduct
GROUP BY productname, productcode
ORDER BY productname;

SELECT 'FD_NAME_BRANCHES' AS issue,
       productname, productcode, COUNT(*) AS branch_count,
       STRING_AGG(branchid::text, ', ') AS in_branches
FROM fdproduct
GROUP BY productname, productcode
ORDER BY productname;

-- ──────────────────────────────────────────────────────────
-- 11. PRODUCT BRANCH CROSS-CHECK
--     For each branch that has accounts of a given type,
--     check whether that branch also has products of the same type.
-- ──────────────────────────────────────────────────────────
WITH acct_branches AS (
    SELECT branchid, acctypeid FROM accountmaster GROUP BY branchid, acctypeid
),
prod_branches AS (
    SELECT brid AS branchid, 5 AS acctypeid FROM rdproduct
    UNION ALL
    SELECT branchid, 6 FROM fdproduct
    UNION ALL
    SELECT branchid, 2 FROM savingproduct
    UNION ALL
    SELECT brid, 1 FROM loanproduct
)
SELECT 'BRANCH_MISSING_PRODUCT' AS issue,
       ab.branchid,
       ab.acctypeid,
       CASE ab.acctypeid
           WHEN 1 THEN 'Loan'
           WHEN 2 THEN 'Saving'
           WHEN 5 THEN 'RD'
           WHEN 6 THEN 'FD'
       END AS type_name,
       (SELECT COUNT(*) FROM accountmaster WHERE branchid = ab.branchid AND acctypeid = ab.acctypeid) AS account_count
FROM acct_branches ab
LEFT JOIN prod_branches pb ON pb.branchid = ab.branchid AND pb.acctypeid = ab.acctypeid
WHERE pb.branchid IS NULL
  AND ab.acctypeid IN (1, 2, 5, 6)  -- only types that use products
ORDER BY ab.branchid, ab.acctypeid;

-- ──────────────────────────────────────────────────────────
-- 12. VOUCHERS: which branch do they belong to?
--     Reports join vouchers to accounts by branch — if branch IDs
--     differ, vouchers are invisible.
-- ──────────────────────────────────────────────────────────
SELECT 'VOUCHER_BRANCH_DIST' AS section, brid AS branchid, COUNT(*) AS voucher_count
FROM voucher
GROUP BY brid
ORDER BY brid;

-- ──────────────────────────────────────────────────────────
-- 13. VOUCHERCREDITDEBITDETAILS branch consistency
--     Each detail row should belong to the same branch as its voucher.
-- ──────────────────────────────────────────────────────────
SELECT 'VOUCHER_DETAIL_BRANCH_MISMATCH' AS issue, COUNT(*) AS count
FROM vouchercreditdebitdetails vd
JOIN voucher v ON v.id = vd.voucherid AND v.brid != vd.brid;

-- ──────────────────────────────────────────────────────────
-- 14. SUMMARY: count issues per category
-- ──────────────────────────────────────────────────────────
SELECT 'SUMMARY' AS section, issue_type, count FROM (
    SELECT 'RD accounts with no product'    AS issue_type, COUNT(*) AS count
    FROM accountmaster a
    LEFT JOIN rdproduct rp ON rp.id = a.generalproductid AND rp.brid = a.branchid
    WHERE a.acctypeid = 5 AND a.generalproductid IS NOT NULL AND rp.id IS NULL

    UNION ALL

    SELECT 'FD accounts with no product', COUNT(*)
    FROM accountmaster a
    LEFT JOIN fdproduct fp ON fp.id = a.generalproductid AND fp.branchid = a.branchid
    WHERE a.acctypeid = 6 AND a.generalproductid IS NOT NULL AND fp.id IS NULL

    UNION ALL

    SELECT 'Saving accounts with no product', COUNT(*)
    FROM accountmaster a
    LEFT JOIN savingproduct sp ON sp.id = a.generalproductid AND sp.branchid = a.branchid
    WHERE a.acctypeid = 2 AND a.generalproductid IS NOT NULL AND sp.id IS NULL

    UNION ALL

    SELECT 'Loan accounts with no product', COUNT(*)
    FROM accountmaster a
    LEFT JOIN loanproduct lp ON lp.id = a.generalproductid AND lp.brid = a.branchid
    WHERE a.acctypeid = 1 AND a.generalproductid IS NOT NULL AND lp.id IS NULL

    UNION ALL

    SELECT 'Accounts with bad member ref', COUNT(*)
    FROM accountmaster a
    LEFT JOIN member m ON m.id = a.memberid AND m.branchid = a.memberbranchid
    WHERE a.memberid IS NOT NULL AND m.id IS NULL

    UNION ALL

    SELECT 'Members with orphan branch', COUNT(*)
    FROM member WHERE branchid NOT IN (SELECT id FROM branchmaster)

    UNION ALL

    SELECT 'RD products future-dated', COUNT(*)
    FROM rdproduct WHERE effectivefrom > CURRENT_DATE

    UNION ALL

    SELECT 'FD products future-dated', COUNT(*)
    FROM fdproduct WHERE effectivefrom > CURRENT_DATE

    UNION ALL

    SELECT 'Saving products future-dated', COUNT(*)
    FROM savingproduct WHERE effectivefrom > CURRENT_DATE

) sub
ORDER BY count DESC;

-- ──────────────────────────────────────────────────────────
-- 15. INTEREST RATE TABLES — are they populated?
--     Empty rows here = interest posting returns 0 or fails.
-- ──────────────────────────────────────────────────────────
SELECT 'SAVING_INT_RULES'   AS table_name, COUNT(*) AS row_count FROM savingproductinterestrules
UNION ALL
SELECT 'SAVING_INT_SLAB',     COUNT(*) FROM savingproductinterestslab
UNION ALL
SELECT 'FD_INT_RULES',        COUNT(*) FROM fdproductinterestrules
UNION ALL
SELECT 'FD_PRODUCT_SLAB',     COUNT(*) FROM fdproductslab
UNION ALL
SELECT 'RD_SLAB',             COUNT(*) FROM rdslab
UNION ALL
SELECT 'RD_SLAB_DETAIL',      COUNT(*) FROM rdslabdetail
UNION ALL
SELECT 'LOAN_SLAB',           COUNT(*) FROM loanslab
UNION ALL
SELECT 'LOAN_SLAB_DETAIL',    COUNT(*) FROM loanslabdetail
UNION ALL
SELECT 'LOAN_PRODUCT_RECOVERY',COUNT(*) FROM loanproductrecovery
ORDER BY table_name;

-- Per-product interest rule counts
SELECT 'SAVING_INT_RULES_PER_PRODUCT' AS section,
       productid, COUNT(*) AS rules
FROM savingproductinterestrules GROUP BY productid ORDER BY productid;

SELECT 'FD_INT_RULES_PER_PRODUCT' AS section,
       fdproductid, COUNT(*) AS rules
FROM fdproductinterestrules GROUP BY fdproductid ORDER BY fdproductid;

-- ──────────────────────────────────────────────────────────
-- 16. BRANCH-WISE RULE intexpaccid VALIDITY
--     intexpaccid must reference an existing accounthead row.
--     If it doesn't exist, interest voucher creation will fail.
-- ──────────────────────────────────────────────────────────
SELECT 'SAV_BWR_INTEXP_INVALID' AS issue,
       bwr.productid, bwr.intexpaccid,
       ah.id IS NOT NULL AS head_exists,
       ah.showinreport
FROM savprodbranchwiserule bwr
LEFT JOIN accounthead ah ON ah.id = bwr.intexpaccid AND ah.branchid = bwr.branchid
ORDER BY bwr.productid;

SELECT 'FD_BWR_INTEXP_INVALID' AS issue,
       bwr.fdproductid, bwr.intexpaccid,
       ah.id IS NOT NULL AS head_exists,
       ah.showinreport
FROM fdproductbranchwiserule bwr
LEFT JOIN accounthead ah ON ah.id = bwr.intexpaccid AND ah.branchid = bwr.branchid
ORDER BY bwr.fdproductid;

SELECT 'RD_BWR_INTEXP_INVALID' AS issue,
       bwr.rdproductid, bwr.intexpaccid,
       ah.id IS NOT NULL AS head_exists,
       ah.showinreport
FROM rdproductbranchwiserule bwr
LEFT JOIN accounthead ah ON ah.id = bwr.intexpaccid AND ah.branchid = bwr.branchid
ORDER BY bwr.rdproductid;

SELECT 'LOAN_BWR_INTEXP_INVALID' AS issue,
       bwr.productid,
       bwr.intaccid, bwr.expaccid,
       ah1.id IS NOT NULL AS intacc_exists,
       ah2.id IS NOT NULL AS expacc_exists
FROM loanproductbranchwiserule bwr
LEFT JOIN accounthead ah1 ON ah1.id = bwr.intaccid AND ah1.branchid = bwr.brid
LEFT JOIN accounthead ah2 ON ah2.id = bwr.expaccid AND ah2.branchid = bwr.brid
ORDER BY bwr.productid;

-- ──────────────────────────────────────────────────────────
-- 17. LOAN ACCOUNT BALANCE DETAIL — required for interest calc
--     If empty, loan interest cannot be calculated.
-- ──────────────────────────────────────────────────────────
SELECT 'LOAN_BAL_DETAIL_COUNT' AS section, COUNT(*) AS row_count
FROM loanaccountbalancedetail;

SELECT 'LOAN_ACCTS_WITHOUT_BAL_DETAIL' AS issue, COUNT(*) AS count
FROM accountmaster a
LEFT JOIN loanaccountbalancedetail bd ON bd.accountid = a.id AND bd.branchid = a.branchid
WHERE a.acctypeid = 1 AND bd.accountid IS NULL;

-- ──────────────────────────────────────────────────────────
-- 18. MASTER TABLE POPULATION CHECK
--     Empty masters cause "not found" errors when loading
--     account edit forms (caste, category, relation lookups).
-- ──────────────────────────────────────────────────────────
SELECT 'MASTER_COUNTS' AS section, master, row_count FROM (
    SELECT 'category'       AS master, COUNT(*) AS row_count FROM category      WHERE branchid = 1
    UNION ALL
    SELECT 'caste',          COUNT(*) FROM caste         WHERE branchid = 1
    UNION ALL
    SELECT 'relation',       COUNT(*) FROM relation
    UNION ALL
    SELECT 'occupation',     COUNT(*) FROM occupation    WHERE branchid = 1
    UNION ALL
    SELECT 'village',        COUNT(*) FROM village       WHERE branchid = 1
    UNION ALL
    SELECT 'station',        COUNT(*) FROM station       WHERE brid = 1
    UNION ALL
    SELECT 'zone',           COUNT(*) FROM zone          WHERE branchid = 1
    UNION ALL
    SELECT 'member',         COUNT(*) FROM member        WHERE branchid = 1
) sub ORDER BY master;

-- ──────────────────────────────────────────────────────────
-- 19. LOAN PRODUCT BRANCH-WISE RULE — interest rate check
-- ──────────────────────────────────────────────────────────
SELECT 'LOAN_BWR' AS section,
       bwr.productid, lp.productname,
       bwr.interestrate, bwr.penalrate,
       bwr.intaccid, bwr.expaccid,
       bwr.brid AS branchid
FROM loanproductbranchwiserule bwr
JOIN loanproduct lp ON lp.id = bwr.productid AND lp.brid = bwr.brid
ORDER BY bwr.productid;

-- ──────────────────────────────────────────────────────────
-- 20. SAVING PRODUCT BRANCH-WISE RULE — interest rate check
-- ──────────────────────────────────────────────────────────
SELECT 'SAV_BWR' AS section,
       bwr.productid, sp.productname,
       bwr.intexpaccid,
       bwr.branchid
FROM savprodbranchwiserule bwr
JOIN savingproduct sp ON sp.id = bwr.productid AND sp.branchid = bwr.branchid
ORDER BY bwr.productid;

-- ──────────────────────────────────────────────────────────
-- 21. ACCOUNTS WITH ORPHANED MEMBER (root cause of edit errors)
--     These accounts exist but their member row is missing.
--     Opening/editing these accounts will fail.
-- ──────────────────────────────────────────────────────────
SELECT 'ORPHANED_ACCOUNT_COUNT' AS issue,
       a.acctypeid,
       CASE a.acctypeid WHEN 1 THEN 'Loan' WHEN 2 THEN 'Saving'
           WHEN 3 THEN 'General' WHEN 4 THEN 'ShareMoney'
           WHEN 5 THEN 'RD' WHEN 6 THEN 'FD' END AS type_name,
       COUNT(*) AS orphaned_count
FROM accountmaster a
LEFT JOIN member m ON m.id = a.memberid AND m.branchid = a.memberbranchid
WHERE a.memberid IS NOT NULL AND m.id IS NULL
GROUP BY a.acctypeid
ORDER BY a.acctypeid;

-- List first 20 orphaned accounts (to help identify which members to re-migrate)
SELECT 'ORPHANED_ACCOUNTS_SAMPLE' AS section,
       a.id AS account_id, a.accountnumber, a.accountname,
       a.acctypeid, a.memberid, a.memberbranchid
FROM accountmaster a
LEFT JOIN member m ON m.id = a.memberid AND m.branchid = a.memberbranchid
WHERE a.memberid IS NOT NULL AND m.id IS NULL
ORDER BY a.memberid, a.id
LIMIT 20;
