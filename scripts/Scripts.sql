-- =============================================================================
-- BankingPlatform — Master Setup Script (PostgreSQL)
-- =============================================================================
-- SAFE TO RUN ANY TIME.  Every statement is idempotent:
--   • CREATE TABLE   IF NOT EXISTS  → skips if table already exists
--   • CREATE INDEX   IF NOT EXISTS  → skips if index already exists
--   • ALTER TABLE    ADD COLUMN IF NOT EXISTS → skips if column already exists
--   • CREATE OR REPLACE FUNCTION/TRIGGER → always updates to latest version
--
-- HOW TO USE:
--   1. New database  : run everything — it creates the full schema.
--   2. Existing DB   : run everything — new tables/columns are added,
--                      existing data is untouched.
--   3. Added a column: add an ALTER TABLE … ADD COLUMN IF NOT EXISTS line
--                      in the "INCREMENTAL COLUMN ADDITIONS" section at bottom.
--   4. Added a table : add a CREATE TABLE IF NOT EXISTS block anywhere above
--                      the INCREMENTAL section (respecting FK order).
-- =============================================================================


-- =============================================================================
-- SECTION 1 : SIMPLE LOOKUP / REFERENCE TABLES  (no cross-table FKs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public."user" (
    id        INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid  INT            NOT NULL,
    username  VARCHAR(255)   NOT NULL,
    password  VARCHAR(255),
    issu      INT            DEFAULT 0,
    isbranchsu INT           DEFAULT 0,
    isauthorized INT         DEFAULT 0,
    usertype  INT,
    CONSTRAINT users_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS public.zone (
    id         INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid   INTEGER        NOT NULL,
    zonename   VARCHAR(255)   NOT NULL,
    zonenamesl VARCHAR(255),
    zonecode   VARCHAR(255)   NOT NULL,
    CONSTRAINT zones_pkey PRIMARY KEY (id, branchid)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_zone_id_zonename_zonecode"
    ON public.zone (id, zonename, zonecode);

CREATE TABLE IF NOT EXISTS thana (
    id         INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid   INTEGER        NOT NULL DEFAULT 1,
    thananame  VARCHAR(255)   NOT NULL,
    thananamesl VARCHAR(255),
    thanacode  VARCHAR(255)   NOT NULL,
    CONSTRAINT thana_pkey PRIMARY KEY (id, branchid)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_thana_id_thananame_thanacode"
    ON public.thana (id, thananame, thanacode);

CREATE TABLE IF NOT EXISTS postoffice (
    id              INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid        INTEGER        NOT NULL DEFAULT 1,
    postofficename  VARCHAR(255)   NOT NULL,
    postofficenamesl VARCHAR(255),
    postofficecode  VARCHAR(255)   NOT NULL,
    CONSTRAINT postoffice_pkey PRIMARY KEY (id, branchid)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_postoffice_id_postofficename_postofficecode"
    ON public.postoffice (id, postofficename, postofficecode);

CREATE TABLE IF NOT EXISTS tehsil (
    id          INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid    INTEGER        NOT NULL DEFAULT 1,
    tehsilname  VARCHAR(255)   NOT NULL,
    tehsilnamesl VARCHAR(255),
    tehsilcode  VARCHAR(255)   NOT NULL,
    CONSTRAINT tehsil_pkey PRIMARY KEY (id, branchid)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_tehsil_id_tehsilname_tehsilcode"
    ON public.tehsil (id, tehsilname, tehsilcode);

CREATE TABLE IF NOT EXISTS category (
    id           INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid     INTEGER        NOT NULL DEFAULT 1,
    categoryname VARCHAR(255)   NOT NULL,
    categorynamesl VARCHAR(255),
    CONSTRAINT category_pkey PRIMARY KEY (id, branchid)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_category_id_categoryname"
    ON public.category (id, categoryname);

CREATE TABLE IF NOT EXISTS caste (
    id          INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid    INTEGER        NOT NULL,
    categoryid  INTEGER        NOT NULL,
    description VARCHAR(255)   NOT NULL,
    descriptionsl VARCHAR(255),
    CONSTRAINT caste_pkey PRIMARY KEY (id, branchid)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_caste_id_castedescription"
    ON public.caste (id, description);

CREATE TABLE IF NOT EXISTS occupation (
    id           INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid     INTEGER        NOT NULL DEFAULT 1,
    description  VARCHAR(255)   NOT NULL,
    descriptionsl VARCHAR(255),
    CONSTRAINT occupation_pkey PRIMARY KEY (id, branchid)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_occupation_id_description"
    ON public.occupation (id, description);

CREATE TABLE IF NOT EXISTS relation (
    id            INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    description   VARCHAR(255)   NOT NULL,
    descriptionsl VARCHAR(255)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_relation_id_relationdescription"
    ON public.relation (id);

CREATE TABLE IF NOT EXISTS patwar (
    id           INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid     INTEGER        NOT NULL DEFAULT 1,
    description  VARCHAR(255)   NOT NULL,
    descriptionsl VARCHAR(255),
    CONSTRAINT patwar_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS state (
    id        INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    statecode VARCHAR(10)    NOT NULL,
    statename VARCHAR(50)    NOT NULL
);

CREATE TABLE IF NOT EXISTS errorlog (
    id           INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid     INTEGER        NOT NULL,
    userid       INT            NOT NULL,
    errormessage VARCHAR(2000)  NOT NULL,
    stacktrace   VARCHAR(4000)  NOT NULL,
    innerexception VARCHAR(4000),
    errordatetime TIMESTAMP(3)  NOT NULL,
    functionname VARCHAR(255)   NOT NULL,
    screenname   VARCHAR(255)   NOT NULL,
    CONSTRAINT error_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS refreshtoken (
    id               SERIAL PRIMARY KEY,
    token            TEXT                        NOT NULL,
    userid           INTEGER                     NOT NULL,
    branchid         INTEGER                     NOT NULL,
    claimssnapshot   TEXT                        NOT NULL,
    expiresat        TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    isrevoked        BOOLEAN                     NOT NULL,
    createdat        TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    replacedbytoken  TEXT NULL
);


-- =============================================================================
-- SECTION 2 : CORE MASTER TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS branchmaster (
    id                         INT GENERATED ALWAYS AS IDENTITY,
    branchmaster_societyid     INT           NOT NULL,
    branchmaster_code          VARCHAR(20)   NOT NULL,
    branchmaster_name          VARCHAR(200)  NOT NULL,
    branchmaster_namesl        VARCHAR(250),
    branchmaster_addressline   VARCHAR(200)  NOT NULL,
    branchmaster_addresslinesl VARCHAR(250),
    branchmaster_addresstype   INT           NOT NULL,
    branchmaster_stationid     INT           NOT NULL,
    branchmaster_phoneprefix1  VARCHAR(5)    NOT NULL,
    branchmaster_phoneno1      VARCHAR(20)   NOT NULL,
    branchmaster_phonetype1    INT           NOT NULL,
    branchmaster_phoneprefix2  VARCHAR(5),
    branchmaster_phoneno2      VARCHAR(20),
    branchmaster_phonetype2    INT,
    branchmaster_ismainbranch  SMALLINT      NOT NULL,
    branchmaster_seqno         INT,
    branchmaster_emailid       VARCHAR(50)   NOT NULL,
    branchmaster_pincode       VARCHAR(50)   NOT NULL,
    branchmaster_tehsilid      INT           NOT NULL,
    branchmaster_gstino        VARCHAR(25)   NOT NULL,
    branchmaster_gstnoissueddate TIMESTAMP(3) NOT NULL,
    branchmaster_stateid       INT           NOT NULL,
    CONSTRAINT branchmaster_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS accountheadtype (
    id          INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid    INTEGER        NOT NULL DEFAULT 1,
    description VARCHAR(255)   NOT NULL,
    descriptionsl VARCHAR(255),
    categoryid  INT            NOT NULL,
    CONSTRAINT accountheadtype_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS accounthead (
    id               INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid         INTEGER        NOT NULL DEFAULT 1,
    name             VARCHAR(255)   NOT NULL,
    namesl           VARCHAR(255),
    headcode         BIGINT         NOT NULL,
    accountheadtypeid INT           NOT NULL,
    parentid         INT            NULL,
    isannexure       SMALLINT       NULL,
    showinreport     SMALLINT       NULL,
    CONSTRAINT accounthead_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS daybeginendinfo (
    id           INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid     INT            NOT NULL,
    workingdate  TIMESTAMP(3)   NOT NULL,
    lateststatus INT            NOT NULL,
    remarks      VARCHAR(250)   NOT NULL,
    CONSTRAINT daybeginendinfo_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS daybeginendinfodetail (
    id                INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid          INT            NOT NULL,
    daybeginendinfoid INT            NOT NULL,
    entrydatetime     TIMESTAMP(3)   NOT NULL,
    userid            INT            NOT NULL,
    status            INT            NOT NULL,
    CONSTRAINT daybeginendinfodetail_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT daybeginendinfodetail_daybeginendinfo_fkey
        FOREIGN KEY (daybeginendinfoid, branchid)
        REFERENCES daybeginendinfo (id, branchid)
);

CREATE TABLE IF NOT EXISTS village (
    id           INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid     INT            NOT NULL,
    villagename  VARCHAR(100)   NOT NULL,
    villagenamesl VARCHAR(100),
    zoneid       INT            NOT NULL,
    thanaid      INT            NOT NULL,
    postofficeid INT            NOT NULL,
    tehsilid     INT            NOT NULL,
    pincode      INT            NOT NULL DEFAULT 0,
    patwarid     INT            NOT NULL,
    CONSTRAINT village_pkey PRIMARY KEY (id, branchid)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_village_id_name"
    ON public.village (id, villagename);

CREATE TABLE IF NOT EXISTS branchsession (
    id          INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid    INT            NOT NULL,
    sessionfrom INT            NOT NULL,
    sessionto   INT            NOT NULL,
    fromdate    TIMESTAMP(3)   NOT NULL,
    todate      TIMESTAMP(3)   NOT NULL,
    iscurrent   BOOLEAN        NOT NULL DEFAULT FALSE,
    isfirst     BOOLEAN        NOT NULL DEFAULT FALSE,
    CONSTRAINT branchsession_pkey PRIMARY KEY (id, branchid)
);
CREATE INDEX IF NOT EXISTS idx_branch_session_branch_id
    ON branchsession (branchid);


-- =============================================================================
-- SECTION 3 : SETTINGS TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS generalsettings (
    id                          INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid                    INTEGER        NOT NULL DEFAULT 1,
    admissionfeeaccountid       INT            NOT NULL,
    admissionfeeamount          NUMERIC(18,2)  NOT NULL,
    defaultcashaccountid        INT            NOT NULL,
    minimummemberage            INT            NOT NULL,
    sharemoneypercentageforloan NUMERIC(5,2)   NOT NULL,
    bankfdmaturityreminder      BOOLEAN        NOT NULL DEFAULT FALSE,
    bankfdmaturityreminderdays  INT,
    CONSTRAINT generalsettings_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS accountsettings (
    id                  INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid            INTEGER        NOT NULL DEFAULT 1,
    accountverification BOOLEAN        NOT NULL DEFAULT FALSE,
    memberkyc           BOOLEAN        NOT NULL DEFAULT FALSE,
    savingaccountlength INT            NOT NULL,
    loanaccountlength   INT            NOT NULL,
    fdaccountlength     INT            NOT NULL,
    rdaccountlength     INT            NOT NULL,
    shareaccountlength  INT            NOT NULL,
    CONSTRAINT accountsettings_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS vouchersettings (
    id                    INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid              INTEGER        NOT NULL DEFAULT 1,
    voucherprinting       BOOLEAN        NOT NULL DEFAULT FALSE,
    singlevoucherentry    BOOLEAN        NOT NULL DEFAULT FALSE,
    vouchernumbersetting  INT            NOT NULL DEFAULT 1,
    autoverification      BOOLEAN        NOT NULL DEFAULT FALSE,
    receiptnosetting      BOOLEAN        NOT NULL DEFAULT FALSE,
    CONSTRAINT vouchersettings_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS tdssettings (
    id                        INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid                  INTEGER        NOT NULL DEFAULT 1,
    bankfdtdsapplicability    BOOLEAN        NOT NULL DEFAULT FALSE,
    bankfdtdsrate             NUMERIC(5,2)   NOT NULL DEFAULT 0.00,
    bankfdtdsdeductionfrequency INT          NOT NULL DEFAULT 1,
    bankfdtdsledgeraccountid  INT            NOT NULL DEFAULT 0,
    CONSTRAINT tdssettings_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS printingsettings (
    id                    INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid              INTEGER        NOT NULL DEFAULT 1,
    fdreceiptsetting      BOOLEAN        NOT NULL DEFAULT FALSE,
    rdcertificatesetting  BOOLEAN        NOT NULL DEFAULT FALSE,
    CONSTRAINT printingsettings_pkey PRIMARY KEY (id, branchid)
);


-- =============================================================================
-- SECTION 4 : MEMBER TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS member (
    id                   INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid             INT            NOT NULL,
    defareabrId          INT            NOT NULL,
    membertype           INT,
    nominalmembershipno  VARCHAR(20),
    permanentmembershipno VARCHAR(20),
    membername           VARCHAR(100)   NOT NULL,
    membernamesl         VARCHAR(100),
    relativename         VARCHAR(100)   NOT NULL,
    relativenamesl       VARCHAR(100),
    relationid           INT            NOT NULL,
    gender               INT            NOT NULL,
    dob                  TIMESTAMP(3)   NOT NULL,
    casteid              INT            NOT NULL,
    categoryid           INT            NOT NULL,
    joiningdate          TIMESTAMP(3)   NOT NULL,
    occupationid         INT            NOT NULL,
    phoneprefix1         VARCHAR(5)     NOT NULL,
    phonetype1           INT            NOT NULL,
    phoneno1             VARCHAR(20)    NOT NULL,
    phoneprefix2         VARCHAR(5),
    phonetype2           INT,
    phoneno2             VARCHAR(20),
    memberstatus         INT            NOT NULL,
    memberstatusdate     TIMESTAMP(3)   NOT NULL,
    email1               VARCHAR(100),
    email2               VARCHAR(100),
    CONSTRAINT member_pkey PRIMARY KEY (id, branchid)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_member_id_brid"
    ON public.member (id, branchid);

CREATE TABLE IF NOT EXISTS membernomineedetails (
    id                  INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid            INT            NOT NULL,
    memberid            INT            NOT NULL,
    nomineename         VARCHAR(100)   NOT NULL,
    nomrelativename     VARCHAR(100),
    relationid          INT            NOT NULL,
    relationwithmember  INT            NOT NULL,
    age                 INT            NOT NULL,
    dob                 TIMESTAMP(3)   NOT NULL,
    isminor             SMALLINT,
    nameofguardian      VARCHAR(100),
    nameofguardiansl    VARCHAR(100),
    nominationdate      TIMESTAMP(3),
    aadhaarcardno       VARCHAR(25)    NOT NULL,
    pancardno           VARCHAR(25),
    percentageshare     NUMERIC(5,2)   NOT NULL,
    CONSTRAINT membernomineedetails_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_membernomineedetails_member
        FOREIGN KEY (memberid, branchid)
        REFERENCES member (id, branchid) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_MemberNomineeDetails_id_brid"
    ON public.membernomineedetails (id, branchid);

CREATE TABLE IF NOT EXISTS memberlocationdetails (
    id           INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid     INT            NOT NULL,
    memberid     INT            NOT NULL,
    addressline1 VARCHAR(150)   NOT NULL,
    addresslinesl1 VARCHAR(150),
    addressline2 VARCHAR(150),
    addresslinesl2 VARCHAR(150),
    villageid1   INT            NOT NULL,
    villageid2   INT,
    po1          INT            NOT NULL,
    po2          INT,
    tehsil1      INT            NOT NULL,
    tehsil2      INT,
    thanaid1     INT            NOT NULL,
    thanaid2     INT,
    zoneid1      INT            NOT NULL,
    zoneid2      INT,
    CONSTRAINT memberlocationdetails_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_memberlocationdetails_member
        FOREIGN KEY (memberid, branchid)
        REFERENCES member (id, branchid) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_MemberLocationDetails_id_brid"
    ON public.memberlocationdetails (id, branchid);

CREATE TABLE IF NOT EXISTS memberdocdetails (
    id             INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid       INT            NOT NULL,
    memberid       INT            NOT NULL,
    pancardno      VARCHAR(20)    NOT NULL,
    aadhaarcardno  VARCHAR(20)    NOT NULL,
    memberpicext   VARCHAR(10)    NOT NULL,
    membersignext  VARCHAR(10)    NOT NULL,
    CONSTRAINT memberdocdetails_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_memberdocdetails_member
        FOREIGN KEY (memberid, branchid)
        REFERENCES member (id, branchid) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_MemberDocDetails_id_brid"
    ON public.memberdocdetails (id, branchid);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_MemberDocDetails_MemberId_BranchId"
    ON public.memberdocdetails (memberid, branchid);


-- =============================================================================
-- SECTION 5 : ACCOUNT MASTER & RELATED
-- =============================================================================

CREATE TABLE IF NOT EXISTS accountmaster (
    id               INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid         INT            NOT NULL,
    headid           INT            NOT NULL,
    headcode         BIGINT         NOT NULL,
    acctypeid        INT            NOT NULL,
    generalproductid INT,
    accountnumber    VARCHAR(50)    NOT NULL,
    accprefix        VARCHAR(20),
    accsuffix        INT,
    accountname      VARCHAR(100),
    accountnamesl    VARCHAR(100),
    memberid         INT,
    memberbranchid   INT,
    accopeningdate   DATE,
    isaccclosed      BOOLEAN,
    closingdate      DATE,
    closingremarks   VARCHAR(255),
    isaccaddedmanually SMALLINT,
    isjointaccount   SMALLINT,
    issuspenseaccount SMALLINT,
    relativename     VARCHAR(100),
    gender           INT,
    phoneno1         VARCHAR(20),
    email            VARCHAR(100),
    addressline      VARCHAR(150),
    dob              TIMESTAMP(3),
    addedusing       VARCHAR(2),
    CONSTRAINT accountmaster_pkey PRIMARY KEY (id, branchid)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_accountmaster_id_branchid_accname_"
    ON public.accountmaster (id, branchid, accountname);

CREATE TABLE IF NOT EXISTS accgstinfo (
    id       INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid INT            NOT NULL,
    accid    INT            NOT NULL,
    stateid  INT            NOT NULL,
    gstinno  VARCHAR(20)    NOT NULL,
    CONSTRAINT accgstinfo_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS accopeningbalance (
    id              INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid        INTEGER        NOT NULL,
    accountid       INT            NOT NULL,
    openingamount   NUMERIC(18,2)  NOT NULL,
    entrytype       VARCHAR(10)    NOT NULL,
    overdueamount   NUMERIC(18,2),
    openinginterest NUMERIC(18,2),
    acctypeid       INT,
    overduedate     TIMESTAMP(3),
    openingnoofkist INT,
    fdintpayable    NUMERIC(18,2),
    tdsamount       NUMERIC(18,2),
    CONSTRAINT accopeningbalance_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS accountnomineeinfo (
    id                  INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid            INTEGER        NOT NULL,
    accountid           INTEGER        NOT NULL,
    nomineename         VARCHAR(255)   NOT NULL,
    nomineedob          TIMESTAMP(3)   NOT NULL,
    relationwithaccholder INT          NOT NULL,
    addressline         VARCHAR(500)   NOT NULL,
    nomineedate         TIMESTAMP(3)   NOT NULL,
    isminor             SMALLINT       NOT NULL,
    nameofguardian      VARCHAR(255),
    CONSTRAINT accountnomineeinfo_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_accountnomineeinfo_accountmaster
        FOREIGN KEY (accountid, branchid)
        REFERENCES accountmaster (id, branchid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accountdocdetails (
    id        INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid  INT            NOT NULL,
    accountid INT            NOT NULL,
    picext    VARCHAR(10)    NOT NULL,
    signext   VARCHAR(10)    NOT NULL,
    CONSTRAINT accountdocdetails_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_accountdocdetails_accountmaster
        FOREIGN KEY (accountid, branchid)
        REFERENCES accountmaster (id, branchid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jointaccountinfo (
    id                         INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid                   INT            NOT NULL,
    accountname                VARCHAR(255)   NOT NULL,
    relationwithaccholder      INT            NOT NULL,
    dob                        TIMESTAMP(3)   NOT NULL,
    addressline                VARCHAR(500)   NOT NULL,
    gender                     INT            NOT NULL,
    memberid                   INT            NOT NULL,
    memberbrid                 INT            NOT NULL,
    jointwithaccountid         INT            NOT NULL,
    jointaccholderaccountnumber VARCHAR(50)   NOT NULL,
    CONSTRAINT jointaccountinfo_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_jointaccountinfo_accountmaster
        FOREIGN KEY (jointwithaccountid, branchid)
        REFERENCES accountmaster (id, branchid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jointaccountwithdrawalinfo (
    id                                      INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid                                INT         NOT NULL,
    accountid                               INT         NOT NULL,
    minimumpersonsrequiredforwithdrawal     INT         NOT NULL,
    jointaccountholdercompulsoryforwithdrawal SMALLINT  NOT NULL,
    CONSTRAINT jointaccountwithdrawalinfo_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_jointaccountwithdrawalinfo_accountmaster
        FOREIGN KEY (accountid, branchid)
        REFERENCES accountmaster (id, branchid) ON DELETE CASCADE
);


-- =============================================================================
-- SECTION 6 : VOUCHER TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS voucher (
    id               INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid             INT            NOT NULL,
    voucherno        INT            NOT NULL,
    vouchertype      INT            NOT NULL,
    vouchersubtype   INT            NOT NULL,
    voucherdate      TIMESTAMP(3)   NOT NULL,
    actualtime       TIMESTAMP(3)   NULL,
    vouchernarration VARCHAR(500)   NULL,
    voucherstatus    VARCHAR(2)     NOT NULL,
    addedby          INT            NULL,
    modifiedby       INT            NULL,
    verifiedby       INT            NULL,
    otherbrid        INT            NULL,
    CONSTRAINT voucher_pkey PRIMARY KEY (id, brid)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_voucher_id_brid"
    ON public.voucher (id, brid);

CREATE TABLE IF NOT EXISTS vouchercreditdebitdetails (
    id               INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid             INT            NOT NULL,
    voucherid        INT            NOT NULL,
    accountid        INT            NOT NULL,
    accheadcode      BIGINT         NOT NULL,
    voucheramount    NUMERIC(24,2)  NOT NULL,
    voucherentrytype VARCHAR(2)     NOT NULL,
    narration        VARCHAR(300)   NULL,
    entrystatus      VARCHAR(10)    NOT NULL,
    valuedate        TIMESTAMP(3)   NOT NULL,
    voucherseqno     INT            NOT NULL,
    voucherstatus    VARCHAR(10)    NULL,
    hcl1             INT            NOT NULL,
    hcl2             INT            NOT NULL,
    hcl3             INT            NOT NULL,
    intdr            NUMERIC(24,2)  NULL,
    intcr            NUMERIC(24,2)  NULL,
    expenseamt       NUMERIC(24,2)  NULL,
    CONSTRAINT vouchercreditdebitdetails_pkey PRIMARY KEY (id, brid),
    CONSTRAINT fk_vouchercreditdebitdetails_voucher
        FOREIGN KEY (voucherid, brid)
        REFERENCES voucher (id, brid) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_VoucherCreditDebitDetails_id_brid"
    ON public.vouchercreditdebitdetails (id, brid);

CREATE TABLE IF NOT EXISTS vouchersavingdetail (
    id                INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid              INT            NOT NULL,
    vacccrdrid        INT            NULL,
    operation         VARCHAR(3)     NULL,
    accid             INT            NULL,
    amt               NUMERIC(24,2)  NULL,
    chequebookid      INT            NULL,
    chequeno          INT            NULL,
    valuedate         TIMESTAMP(3)   NULL,
    voucherdate       TIMESTAMP(3)   NULL,
    vouchermainstatus VARCHAR(2)     NULL,
    voucherid         INT,
    CONSTRAINT vouchersavingdetail_pkey PRIMARY KEY (id, brid)
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_vouchersavingdetail_id_brid"
    ON public.vouchersavingdetail (id, brid);

CREATE TABLE IF NOT EXISTS voucherrecintdetail (
    id                INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid              INT            NOT NULL,
    vacccrdrid        INT            NOT NULL,
    voucherid         INT            NOT NULL,
    voucherno         INT            NOT NULL,
    entrydate         TIMESTAMP(3)   NOT NULL,
    valuedate         TIMESTAMP(3)   NOT NULL,
    intcatid          INT            NOT NULL,
    pamt              FLOAT          NULL,
    accid             INT            NOT NULL,
    intdr             FLOAT          NOT NULL,
    intcr             FLOAT          NOT NULL,
    vouchermainstatus VARCHAR(2)     NULL,
    CONSTRAINT voucherrecintdetail_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS vrodreserve (
    id          INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid        INT              NOT NULL,
    vacccrdrid  INT              NULL,
    voucherid   INT              NULL,
    date        TIMESTAMP        NOT NULL,
    accid       INT              NOT NULL,
    debit       NUMERIC(18,2)    NOT NULL DEFAULT 0,
    credit      NUMERIC(18,2)    NOT NULL DEFAULT 0,
    productid   INT              NOT NULL,
    CONSTRAINT pk_vrodreserve PRIMARY KEY (id, brid)
);


-- =============================================================================
-- SECTION 6b : NPA TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS npaplanmaster (
    id                   INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid                 INT             NOT NULL,
    code                 VARCHAR(50)     NOT NULL,
    description          VARCHAR(500)    NULL,
    ishoupdated          SMALLINT        NULL,
    calnpadate           INT             NOT NULL DEFAULT 0,
    ovrduePeriodorinst   INT             NOT NULL DEFAULT 1,
    calnpafromloandate   SMALLINT        NOT NULL DEFAULT 0,
    CONSTRAINT pk_npaplanmaster PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS npaplancategory (
    id               INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid             INT             NOT NULL,
    parentid         INT             NULL,
    isgroup          VARCHAR(2)      NULL,
    planid           INT             NULL,
    periodfrom       INT             NULL,
    periodto         INT             NULL,
    provisioningperc FLOAT           NULL,
    intmaxperiod     INT             NULL,
    description      VARCHAR(100)    NULL,
    descriptionsl    VARCHAR(100)    NULL,
    seqno            INT             NULL,
    ishoupdated      SMALLINT        NULL,
    allprinoverdue   SMALLINT        NOT NULL DEFAULT 0,
    CONSTRAINT pk_npaplancategory PRIMARY KEY (id, brid)
);

-- =============================================================================
-- SECTION 6c : LOAN EXPENSE CATEGORY
-- =============================================================================

CREATE TABLE IF NOT EXISTS expensecategory (
    id            INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid          INT           NOT NULL,
    code          VARCHAR(20)   NULL,
    description   VARCHAR(100)  NULL,
    descriptionsl VARCHAR(200)  NULL,
    CONSTRAINT expensecategory_pkey PRIMARY KEY (id, brid),
    CONSTRAINT uq_expensecategory_code        UNIQUE (brid, code),
    CONSTRAINT uq_expensecategory_description UNIQUE (brid, description)
);

-- =============================================================================
-- SECTION 6d : GST TAX TYPE
-- =============================================================================

CREATE TABLE IF NOT EXISTS taxtype (
    id              INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid            INT           NOT NULL,
    description     VARCHAR(50)   NULL,
    descriptionsl   VARCHAR(100)  NULL,
    code            VARCHAR(10)   NULL,
    appliedin       INT           NULL,
    isut            SMALLINT      NULL,
    calculatedfrom  INT           NOT NULL DEFAULT 1,
    seqno           INT           NOT NULL DEFAULT 1,
    inaccid         INT           NOT NULL DEFAULT 0,
    outaccid        INT           NOT NULL DEFAULT 0,
    CONSTRAINT taxtype_pkey PRIMARY KEY (id, brid),
    CONSTRAINT uq_taxtype_code        UNIQUE (brid, code),
    CONSTRAINT uq_taxtype_description UNIQUE (brid, description)
);

-- =============================================================================
-- SECTION 6e : GST TAX GROUP
-- =============================================================================

CREATE TABLE IF NOT EXISTS taxgroup (
    id                  INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid                INT           NOT NULL,
    description         VARCHAR(50)   NOT NULL,
    descriptionsl       VARCHAR(50)   NULL,
    code                VARCHAR(10)   NULL,
    printingformat      INT           NULL,
    isstatmandatory     BOOLEAN       NOT NULL DEFAULT FALSE,
    isshippingmandatory BOOLEAN       NOT NULL DEFAULT FALSE,
    isbillingmandatory  BOOLEAN       NOT NULL DEFAULT FALSE,
    CONSTRAINT taxgroup_pkey PRIMARY KEY (id, brid),
    CONSTRAINT uq_taxgroup_code        UNIQUE (brid, code),
    CONSTRAINT uq_taxgroup_description UNIQUE (brid, description)
);

CREATE TABLE IF NOT EXISTS taxgrouptype (
    id          INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid        INT NOT NULL,
    taxgroupid  INT NOT NULL,
    taxtypeid   INT NOT NULL,
    CONSTRAINT taxgrouptype_pkey PRIMARY KEY (id, brid)
);

-- =============================================================================
-- SECTION 6f : GST TAX MASTER
-- =============================================================================

CREATE TABLE IF NOT EXISTS tax (
    id              INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid            INT           NOT NULL,
    name            VARCHAR(100)  NOT NULL,
    namesl          VARCHAR(100)  NULL,
    taxcode         INT           NOT NULL DEFAULT 0,
    introductiondate DATE         NOT NULL,
    taxaccountid    INT           NOT NULL DEFAULT 0,
    alias           VARCHAR(30)   NOT NULL,
    aliassl         VARCHAR(50)   NULL,
    taxpercentage   FLOAT         NOT NULL DEFAULT 0,
    parenttaxid     INT           NOT NULL DEFAULT 0,
    evaluatedon     INT           NOT NULL DEFAULT 1,
    oldtaxid        INT           NOT NULL DEFAULT 0,
    tcid            INT           NOT NULL DEFAULT 0,
    taxgroupid      INT           NULL,
    CONSTRAINT tax_pkey PRIMARY KEY (id, brid),
    CONSTRAINT uq_tax_name  UNIQUE (brid, name),
    CONSTRAINT uq_tax_alias UNIQUE (brid, alias)
);

CREATE TABLE IF NOT EXISTS taxdetail (
    id          INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid        INT   NOT NULL,
    taxid       INT   NOT NULL,
    detaildate  DATE  NOT NULL,
    taxtypeid   INT   NOT NULL,
    nratio      FLOAT NOT NULL DEFAULT 1,
    dratio      FLOAT NOT NULL DEFAULT 1,
    evaluatedon INT   NOT NULL DEFAULT 1,
    percentage  FLOAT NOT NULL DEFAULT 0,
    CONSTRAINT taxdetail_pkey PRIMARY KEY (id, brid)
);

-- =============================================================================
-- SECTION 6g : GST BILL BOOK
-- =============================================================================

CREATE TABLE IF NOT EXISTS billbook (
    id                INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid              INT          NOT NULL,
    description       VARCHAR(100) NOT NULL,
    billnoprefix      VARCHAR(5)   NULL,
    billnofrom        INT          NOT NULL DEFAULT 1,
    billnogeneration  SMALLINT     NOT NULL DEFAULT 1,
    CONSTRAINT billbook_pkey PRIMARY KEY (id, brid),
    CONSTRAINT uq_billbook_description UNIQUE (brid, description)
);

-- Section 6h: GST Setting
CREATE TABLE IF NOT EXISTS gstsetting (
    brid               INT NOT NULL,
    roundoffexpaccid   INT NOT NULL,
    roundoffincaccid   INT NOT NULL,
    CONSTRAINT gstsetting_pkey PRIMARY KEY (brid),
    CONSTRAINT chk_gstsetting_diff_accounts CHECK (roundoffexpaccid <> roundoffincaccid)
);

-- =============================================================================
-- SECTION 6i: SERVICE MASTER TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS service (
    id              INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid            INT             NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    sac             VARCHAR(20)     NOT NULL,
    otherreceipts   DECIMAL(18,2)   NOT NULL DEFAULT 0,
    deductrefunds   DECIMAL(18,2)   NOT NULL DEFAULT 0,
    penalties       DECIMAL(18,2)   NOT NULL DEFAULT 0,
    isincludetax    BOOLEAN         NOT NULL DEFAULT FALSE,
    purchaseaccid   INT             NOT NULL,
    CONSTRAINT service_pkey PRIMARY KEY (id, brid),
    CONSTRAINT uq_service_name UNIQUE (brid, name)
);

CREATE TABLE IF NOT EXISTS servicetaxrule (
    id              INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid            INT             NOT NULL,
    serviceid       INT             NOT NULL,
    applicabledate  TIMESTAMP(3)    NOT NULL,
    taxid           INT             NOT NULL,
    CONSTRAINT servicetaxrule_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS accservicedetail (
    id          INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid        INT NOT NULL,
    accid       INT NOT NULL,
    serviceid   INT NOT NULL,
    CONSTRAINT accservicedetail_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS servicetaxtypedet (
    id          INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid        INT             NOT NULL,
    serviceid   INT             NOT NULL,
    date        TIMESTAMP(3)    NOT NULL,
    taxtypeid   INT             NOT NULL,
    perc        DECIMAL(18,2)   NOT NULL DEFAULT 0,
    CONSTRAINT servicetaxtypedet_pkey PRIMARY KEY (id, brid)
);

-- =============================================================================
-- SECTION 7 : SAVING PRODUCT TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS savingproduct (
    id                            INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid                      INTEGER        NOT NULL DEFAULT 1,
    productname                   VARCHAR(255)   NOT NULL UNIQUE,
    productcode                   VARCHAR(10)    NOT NULL UNIQUE,
    effectivefrom                 TIMESTAMP(3)   NOT NULL,
    effectivetill                 TIMESTAMP(3),
    isnomineemandatoryinaccmasters BOOLEAN        NOT NULL DEFAULT FALSE,
    CONSTRAINT savingproduct_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS savingproductrules (
    id                 INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid           INTEGER        NOT NULL,
    savingsproductid   INTEGER        NOT NULL,
    acstatementfrequency INTEGER      NOT NULL,
    acretentiondays    INTEGER        NOT NULL,
    minbalanceamt      DECIMAL(18,2)  NOT NULL,
    createddate        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifieddate       TIMESTAMP      NULL,
    CONSTRAINT savingproductrules_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_savingproductrules_savingproduct
        FOREIGN KEY (savingsproductid, branchid)
        REFERENCES savingproduct (id, branchid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savingproductpostingheads (
    id                   INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid             INTEGER        NOT NULL,
    savingsproductid     INTEGER        NOT NULL,
    principalbalheadcode INTEGER        NOT NULL,
    suspendedbalheadcode INTEGER        NOT NULL,
    intpayableheadcode   INTEGER        NOT NULL,
    CONSTRAINT savingproductpostingheads_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_savingproductpostingheads_savingproduct
        FOREIGN KEY (savingsproductid, branchid)
        REFERENCES savingproduct (id, branchid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savingproductinterestrules (
    id                       INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid                 INTEGER        NOT NULL,
    savingsproductid         INTEGER        NOT NULL,
    applicabledate           DATE           NOT NULL,
    rateappliedmethod        INTEGER        NOT NULL,
    intapplicabledate        DATE           NOT NULL,
    calculationmethod        INTEGER        NOT NULL,
    interestrateminvalue     DECIMAL(5,2)   NOT NULL,
    interestratemaxvalue     DECIMAL(5,2)   NOT NULL,
    interestvariationminvalue DECIMAL(5,2)  NOT NULL,
    interestvariationmaxvalue DECIMAL(5,2)  NOT NULL,
    minpostingintamt         DECIMAL(18,2)  NOT NULL,
    minbalforposting         DECIMAL(18,2)  NOT NULL,
    intpostinginterval       INTEGER        NOT NULL,
    intpostingdate           INTEGER        NOT NULL,
    compoundinterval         INTEGER        NOT NULL,
    intcompounddate          INTEGER        NOT NULL,
    actiononintposting       INTEGER        NOT NULL,
    CONSTRAINT savingproductinterestrules_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_savingproductinterestrules_savingproduct
        FOREIGN KEY (savingsproductid, branchid)
        REFERENCES savingproduct (id, branchid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savingproductbranchwiserule (
    id                      INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid                INTEGER        NOT NULL,
    savingproductid         INTEGER        NOT NULL,
    intexpaccount           INTEGER        NOT NULL,
    depwithdrawlimitinterval INT,
    depwithdrawlimit        NUMERIC(18,2),
    CONSTRAINT savingproductbranchwiserule_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS savinginterestslab (
    id             INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid       INTEGER        NOT NULL,
    slabname       VARCHAR(255)   NOT NULL UNIQUE,
    savingproductid INTEGER       NOT NULL,
    applicabledate TIMESTAMP(3)   NOT NULL,
    CONSTRAINT savinginterestslab_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS savinginterestslabdetail (
    id              INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid        INTEGER        NOT NULL,
    savingintslabid INTEGER        NOT NULL,
    fromamount      NUMERIC(18,2)  NOT NULL,
    toamount        NUMERIC(18,2)  NOT NULL,
    interestrate    NUMERIC(5,2)   NOT NULL,
    CONSTRAINT savinginterestslabdetail_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_savinginterestslabdetail_savinginterestslab
        FOREIGN KEY (savingintslabid, branchid)
        REFERENCES savinginterestslab (id, branchid) ON DELETE CASCADE
);


-- =============================================================================
-- SECTION 8 : FD PRODUCT TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS fdproduct (
    id                         INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid                   INTEGER        NOT NULL DEFAULT 1,
    productname                VARCHAR(255)   NOT NULL UNIQUE,
    productcode                VARCHAR(10)    NOT NULL UNIQUE,
    effectivefrom              TIMESTAMP(3)   NOT NULL,
    effectivetill              TIMESTAMP(3),
    isseparatefdaccountallowed BOOLEAN,
    CONSTRAINT fdproduct_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS fdproductrules (
    id                        INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid                  INTEGER        NOT NULL DEFAULT 1,
    productid                 INT            NOT NULL,
    intaccounttype            INT            NOT NULL,
    fdmaturityreminderinmonths INT,
    fdmaturityreminderindays  INT,
    CONSTRAINT fdproductrules_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS fdproductpostingheads (
    id                   INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid             INTEGER        NOT NULL DEFAULT 1,
    productid            INT            NOT NULL,
    principalbalheadcode BIGINT         NOT NULL,
    suspendedbalheadcode BIGINT         NOT NULL,
    intpayableheadcode   BIGINT         NOT NULL,
    CONSTRAINT fdproductpostingheads_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS fdproductinterestrules (
    id                              INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid                        INTEGER        NOT NULL DEFAULT 1,
    productid                       INT            NOT NULL,
    applicabledate                  TIMESTAMP(3)   NOT NULL,
    interestapplicableon            INT            NOT NULL,
    interestrateminvalue            INT            NOT NULL,
    interestratemaxvalue            INT            NOT NULL,
    interestvariationminvalue       INT            NOT NULL,
    interestvariationmaxvalue       INT            NOT NULL,
    actiononintposting              SMALLINT       NOT NULL,
    postmaturityintratecalculationtype SMALLINT    NOT NULL,
    prematuritycalculationtype      SMALLINT       NOT NULL,
    maturityduenoticeindays         INT            NOT NULL,
    intpostinginterval              INT            NOT NULL,
    intpostingdate                  INT            NOT NULL,
    CONSTRAINT fdproductinterestrules_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS fdproductbranchwiserule (
    id                       INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid                 INTEGER        NOT NULL,
    fdproductid              INTEGER        NOT NULL,
    interestcalculationmethod INTEGER       NOT NULL,
    daysinayear              INTEGER        NOT NULL,
    accnogeneration          INTEGER        NOT NULL,
    intexpenseaccount        INTEGER        NOT NULL,
    closingchargesaccount    INTEGER        NOT NULL,
    intpayableaccount        INTEGER        NOT NULL,
    CONSTRAINT fdproductbranchwiserule_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS fdinterestslab (
    id                  INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid            INTEGER        NOT NULL,
    slabname            VARCHAR(255)   NOT NULL,
    fdproductid         INTEGER        NOT NULL,
    fromdays            INTEGER        NOT NULL,
    todays              INTEGER        NOT NULL,
    compoundinginterval INTEGER        NOT NULL,
    CONSTRAINT fdinterestslab_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS fdinterestslabinfo (
    id            INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid      INTEGER        NOT NULL,
    fdproductid   INTEGER        NOT NULL,
    applicabledate TIMESTAMP(3)  NOT NULL,
    CONSTRAINT fdinterestslabinfo_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_fdinterestslabinfo_fdproduct
        FOREIGN KEY (fdproductid, branchid)
        REFERENCES fdproduct (id, branchid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fdinterestslabdetail (
    id             INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid       INTEGER        NOT NULL,
    fdintslabinfoid INTEGER       NOT NULL,
    fdintslabid    INTEGER        NOT NULL,
    agefrom        NUMERIC(5,2)   NOT NULL,
    ageto          NUMERIC(5,2)   NOT NULL,
    interestrate   NUMERIC(5,2)   NOT NULL,
    CONSTRAINT fdinterestslabdetail_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS fdaccountdetail (
    id                   INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid             INTEGER        NOT NULL,
    accountid            INTEGER        NOT NULL,
    fdamount             NUMERIC(18,2)  NOT NULL,
    fddate               TIMESTAMP(3)   NOT NULL,
    fdmaturitydate       TIMESTAMP(3)   NOT NULL,
    maturityamount       NUMERIC(18,2)  NOT NULL,
    ltdno                INTEGER        NOT NULL,
    fdstatus             INTEGER        NOT NULL,
    fdperiodmonths       INTEGER        NOT NULL,
    fdperioddays         INTEGER        NOT NULL,
    slabid               INTEGER        NOT NULL,
    intrate              NUMERIC(18,4)  NOT NULL,
    intcompinterval      INTEGER        NOT NULL,
    serialno             INTEGER        NOT NULL,
    voucherdate          TIMESTAMP(3)   NOT NULL,
    interestpaidinterval INTEGER        NULL,
    interestpaidamount   NUMERIC(18,2)  NULL,
    misaccid             INTEGER        NULL,
    CONSTRAINT fdaccountdetail_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_fdaccountdetail_accountmaster
        FOREIGN KEY (accountid, branchid)
        REFERENCES accountmaster (id, branchid) ON DELETE CASCADE,
    CONSTRAINT fk_fdaccountdetail_fdinterestslab
        FOREIGN KEY (slabid, branchid)
        REFERENCES fdinterestslab (id, branchid) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS voucherfddetail (
    id                INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid              INTEGER        NOT NULL,
    voucherid         INTEGER        NOT NULL,
    vacccrdrid        INTEGER        NOT NULL,
    fdaccid           INTEGER        NOT NULL,
    fdaccdetid        INTEGER        NOT NULL,
    amountcr          NUMERIC(18,2)  NOT NULL DEFAULT 0,
    amountdr          NUMERIC(18,2)  NOT NULL DEFAULT 0,
    operation         VARCHAR(5)     NOT NULL,
    valuedate         TIMESTAMP(3)   NULL,
    voucherdate       TIMESTAMP(3)   NULL,
    intdr             NUMERIC(18,2)  NULL,
    intcr             NUMERIC(18,2)  NULL,
    vouchermainstatus VARCHAR(2)     NULL,
    CONSTRAINT voucherfddetail_pkey PRIMARY KEY (id, brid),
    CONSTRAINT fk_voucherfddetail_accountmaster
        FOREIGN KEY (fdaccid, brid)
        REFERENCES accountmaster (id, branchid) ON DELETE CASCADE,
    CONSTRAINT fk_voucherfddetail_voucher
        FOREIGN KEY (voucherid, brid)
        REFERENCES voucher (id, brid) ON DELETE RESTRICT
);


-- =============================================================================
-- SECTION 9 : RD PRODUCT TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS rdproduct (
    id            INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid          INT            NOT NULL,
    productname   VARCHAR(255)   NOT NULL,
    productnamesl VARCHAR(255)   NOT NULL,
    productcode   VARCHAR(10)    NOT NULL,
    effectivefrom TIMESTAMP(3)   NOT NULL,
    CONSTRAINT rdproduct_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS rdproductdefinition (
    id                   INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid                 INT         NOT NULL,
    rdproductid          INT         NULL,
    docplanid            INT         NULL,
    minperiodlimitmonths INT         NULL,
    maxperiodlimitmonths INT         NULL,
    CONSTRAINT rdproductdefinition_pkey PRIMARY KEY (id, brid),
    CONSTRAINT rdproductdefinition_rdproduct_fkey
        FOREIGN KEY (rdproductid, brid)
        REFERENCES rdproduct (id, brid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rdproductinterestrules (
    id                       INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL,
    brid                     INT             NOT NULL,
    productid                INT             NULL,
    date                     TIMESTAMP(3)    NULL,
    intratefrom              FLOAT           NULL,
    intrateto                FLOAT           NULL,
    intvariationforaccless   FLOAT           NULL,
    intvariationforaccexceed FLOAT           NULL,
    intpostinginterval       INT             NULL,
    intcompoundinginterval   INT             NULL,
    actonintposting          INT             NULL,
    intrateonpremat          FLOAT           NULL,
    postmaturityintrate      FLOAT           NULL,
    minlockinperioddays      INT             NULL,
    CONSTRAINT rdproductinterestrules_pkey PRIMARY KEY (id, brid),
    CONSTRAINT rdproductinterestrules_rdproduct_fkey
        FOREIGN KEY (productid, brid)
        REFERENCES rdproduct (id, brid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rdproductposting (
    id                   INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL,
    brid                 INT         NOT NULL,
    rdproductid          INT         NULL,
    principalbalheadcode BIGINT      NULL,
    intpayableheadcode   BIGINT      NULL,
    CONSTRAINT rdproductposting_pkey PRIMARY KEY (id, brid),
    CONSTRAINT rdproductposting_rdproduct_fkey
        FOREIGN KEY (rdproductid, brid)
        REFERENCES rdproduct (id, brid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rdproductbranchwiserule (
    id                INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid              INT             NOT NULL,
    rdproductid       INT             NOT NULL,
    intformula        INT             NOT NULL,
    accnogeneration   VARCHAR(2)      NULL,
    printcertificate  SMALLINT        NULL,
    intexpaccid       INT             NULL,
    penaltyincaccid   INT             NULL,
    closingchargesacc INT             NULL,
    kistaftermaturity SMALLINT        DEFAULT 0 NULL,
    paymentdatetype   SMALLINT        NULL,
    noofdayormonth    INT             NULL,
    CONSTRAINT rdproductbranchwiserule_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS rdinterestslab (
    id             INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid       INTEGER        NOT NULL,
    rdproductid    INTEGER        NOT NULL,
    slabname       VARCHAR(50)    NOT NULL,
    applicabledate TIMESTAMP(3)   NOT NULL,
    CONSTRAINT rdinterestslab_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS rdinterestslabdetail (
    id           INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid     INTEGER        NOT NULL,
    rdintslabid  INTEGER        NOT NULL,
    slabno       INTEGER        NOT NULL,
    fromamount   NUMERIC(18,2)  NOT NULL DEFAULT 0,
    toamount     NUMERIC(18,2)  NOT NULL,
    kistinterval VARCHAR(20)    NOT NULL,
    periodfrom   INTEGER        NOT NULL,
    periodto     INTEGER        NOT NULL,
    interestrate NUMERIC(5,2)   NOT NULL,
    CONSTRAINT rdinterestslabdetail_pkey PRIMARY KEY (id, branchid),
    CONSTRAINT fk_rdinterestslabdetail_rdinterestslab
        FOREIGN KEY (rdintslabid, branchid)
        REFERENCES rdinterestslab (id, branchid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rdaccountdetail (
    id                  INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid                INT                 NOT NULL,
    accid               INT                 NULL,
    rdnumber            INT                 NULL,
    rddate              TIMESTAMP(3)        NULL,
    rdamount            NUMERIC(18,2)       NULL,
    noofmonths          INT                 NULL,
    rdslabid            INT                 NULL,
    interestrate        DOUBLE PRECISION    NULL,
    maturitydate        TIMESTAMP(3)        NULL,
    kistamt             NUMERIC(18,2)       NULL,
    kistinterval        INT                 NULL,
    firstkistdate       TIMESTAMP(3)        NULL,
    penaltyamt          NUMERIC(18,2)       NULL,
    status              INT                 NULL,
    maturityamt         NUMERIC(18,0)       NULL,
    noofdays            INT                 NULL,
    maturedon           TIMESTAMP(3)        NULL,
    prematuredon        TIMESTAMP(3)        NULL,
    compoundinginterval INT                 NULL,
    CONSTRAINT rdaccountdetail_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS voucherrddetail (
    id                INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid              INT                 NOT NULL,
    vacccrdrid        INT                 NOT NULL,
    rdaccid           INT                 NOT NULL,
    rdaccdetid        INT                 NOT NULL,
    amountcr          DOUBLE PRECISION    NOT NULL,
    amountdr          DOUBLE PRECISION    NOT NULL,
    operation         VARCHAR(5)          NOT NULL,
    valuedate         TIMESTAMP(3)        NULL,
    voucherdate       TIMESTAMP(3)        NULL,
    othrefaccid       INT                 NULL,
    penalamt          NUMERIC(24,2)       NULL,
    penalaccid        INT                 NULL,
    intdr             DOUBLE PRECISION    NULL,
    intcr             DOUBLE PRECISION    NULL,
    vouchermainstatus VARCHAR(2)          NULL,
    voucherid         INT                 NULL,
    CONSTRAINT voucherrddetail_pkey PRIMARY KEY (id, brid),
    CONSTRAINT fk_voucherrddetail_voucher
        FOREIGN KEY (voucherid, brid)
        REFERENCES voucher (id, brid) ON DELETE RESTRICT
);


-- =============================================================================
-- SECTION 10 : LOAN PRODUCT TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS loanproduct (
    id            INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid          INT            NOT NULL,
    code          VARCHAR(3)     NOT NULL,
    productname   VARCHAR(50)    NOT NULL,
    namesl        VARCHAR(75)    NULL,
    effectivefrom TIMESTAMP(3)   NOT NULL,
    CONSTRAINT loanproduct_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanproductadvancement (
    id                     INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid                   INT            NOT NULL,
    productid              INT            NOT NULL,
    disbursmentmode        VARCHAR(50)    NOT NULL,
    maxnoofdisbursments    INT            NOT NULL,
    minloanamount          NUMERIC(24,2)  NOT NULL,
    maxloanamount          NUMERIC(24,2)  NOT NULL,
    issharemoneyreq        VARCHAR(2)     NOT NULL,
    borrowertypeids        VARCHAR(50)    NULL,
    loanperiodtype         VARCHAR(2)     NULL,
    loanamtperonsecurityfd NUMERIC(24,2)  NULL,
    overdraftlimit         SMALLINT       NOT NULL DEFAULT 0,
    loanamtperonsecurityrd NUMERIC(24,2)  NULL,
    CONSTRAINT loanproductadvancement_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanproductdefinition (
    id                  INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid                INT            NOT NULL,
    docplanid           INT            NULL,
    productid           INT            NOT NULL,
    typeid              INT            NOT NULL,
    categoryid          INT            NULL,
    securityids         VARCHAR(50)    NOT NULL,
    secreviewfreqperiod INT            NOT NULL,
    intformulae         INT            NULL,
    actonintposting     INT            NULL,
    intschedule         INT            NULL,
    CONSTRAINT loanproductdefinition_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanproductmarginmoneyrule (
    id               INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid             INT            NOT NULL,
    advid            INT            NOT NULL,
    ratioorperc      INT            NOT NULL,
    loanproportion   FLOAT          NOT NULL,
    marginproportion FLOAT          NOT NULL,
    mmpercentage     FLOAT          NOT NULL,
    ishoupdated      SMALLINT       NULL,
    CONSTRAINT loanproductmarginmoneyrule_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanproductposting (
    id                       INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid                     INT            NOT NULL,
    productid                INT            NOT NULL,
    principalbalheadcode     BIGINT         NOT NULL,
    miscincheadcode          BIGINT         NOT NULL,
    minballeftlimitheadcode  BIGINT         NOT NULL,
    minbalgivenlimitheadcode BIGINT         NOT NULL,
    expheadcode              BIGINT         NOT NULL,
    recoverableIntheadcode   BIGINT         NULL,
    CONSTRAINT loanproductposting_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanproductrecovery (
    id                    INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid                  INT            NOT NULL,
    productid             INT            NOT NULL,
    recoverymode          VARCHAR(50)    NOT NULL,
    recoveryseq           VARCHAR(50)    NOT NULL,
    minballeftlimit       FLOAT          NOT NULL,
    minbalgivenlimit      FLOAT          NOT NULL,
    applyovrinton         VARCHAR(5)     NULL,
    intrecoveredinadvance SMALLINT       NULL,
    intpostinginterval    INT            NULL,
    ishoupdated           SMALLINT       NULL,
    stdoverdueonkistdate  SMALLINT       NULL,
    recoveryadjustmentseq INT            NOT NULL DEFAULT 1,
    CONSTRAINT loanproductrecovery_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanproductsecurity (
    id     INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid   INT            NOT NULL,
    "Desc" VARCHAR(50)    NULL,
    descsl VARCHAR(100)   NULL,
    CONSTRAINT loanproductsecurity_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanproductsharemoneyrule (
    id              INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid            INT            NOT NULL,
    advid           INT            NULL,
    farmertypeid    INT            NULL,
    ratioorperc     INT            NULL,
    loanproportion  FLOAT          NULL,
    shareproportion FLOAT          NULL,
    smpercentage    FLOAT          NULL,
    CONSTRAINT loanproductsharemoneyrule_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanproductbranchwiserule (
    id                       INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid                 INT            NOT NULL,
    loanproductid            INT            NOT NULL,
    mclplanid                INT            NULL,
    npaplanid                INT            NULL,
    legalplanid              INT            NULL,
    operatedby               VARCHAR(2)     NULL,
    accnoornnamefirst        VARCHAR(2)     NULL,
    temprecaccid             INT            NULL,
    currentrecoverableintacc INT            NULL,
    intincomeacc             INT            NULL,
    overduerecoverableintacc INT            NULL,
    isapplyoverint           SMALLINT       NOT NULL DEFAULT 0,
    ovrintprovacc            INT            NOT NULL DEFAULT 0,
    intwrtdepositpledge      INT            NULL,
    ovrintfromopendate       SMALLINT       NOT NULL DEFAULT 0,
    actonexpposting          INT            NULL,
    CONSTRAINT loanproductbranchwiserule_pkey PRIMARY KEY (id, branchid)
);


-- =============================================================================
-- SECTION 11 : LOAN ACCOUNT TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS loanslab (
    id            INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid          INT            NOT NULL,
    name          VARCHAR(50)    NULL,
    namesl        VARCHAR(50)    NULL,
    date          TIMESTAMP(3)   NULL,
    loanproductid INT            NULL,
    CONSTRAINT loanslab_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanslabdetail (
    id               INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid             INT              NOT NULL,
    slabid           INT              NULL,
    fromamount       NUMERIC(18,2)    NULL,
    toamount         NUMERIC(18,2)    NULL,
    periodfrom       INT              NULL,
    periodto         INT              NULL,
    periodfroomindays INT             NULL,
    periodtoindays   INT              NULL,
    stdintrate       DOUBLE PRECISION NULL,
    penalintrate     DOUBLE PRECISION NULL,
    CONSTRAINT loanslabdetail_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS accountkistdetail (
    id                   INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid                 INT              NOT NULL,
    accountid            INT              NOT NULL,
    loanamountpassed     DOUBLE PRECISION NULL,
    loanperiod           INT              NULL,
    slabid               INT              NULL,
    standardinterestrate DOUBLE PRECISION NULL,
    overdueinterestrate  DOUBLE PRECISION NULL,
    loandate             TIMESTAMP(3)     NOT NULL,
    kistinterval         INT              NULL,
    kistfirstdate        TIMESTAMP(3)     NOT NULL,
    kistamount           DOUBLE PRECISION NULL,
    kistprinpart         DOUBLE PRECISION NULL,
    kistintpart          DOUBLE PRECISION NULL,
    loanno               VARCHAR(20)      NULL,
    kistwithinterest     VARCHAR(2)       NULL,
    status               VARCHAR(2)       NULL,
    loanperiodindays     INT              NULL,
    kistintervalindays   INT              NULL,
    kislintamt           DOUBLE PRECISION NULL,
    marginmoney          DOUBLE PRECISION NULL,
    CONSTRAINT accountkistdetail_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS accountlimitdetail (
    id                      INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid                    INT              NOT NULL,
    accountid               INT              NOT NULL,
    loanno                  VARCHAR(20)      NOT NULL,
    loandate                TIMESTAMP(3)     NOT NULL,
    loanamountpassed        DOUBLE PRECISION NOT NULL,
    loanlimitperiodinmonths INT              NOT NULL,
    loanlimitperiodindays   INT              NOT NULL,
    slabid                  INT              NOT NULL,
    standardinterestrate    DOUBLE PRECISION NOT NULL,
    overdueinterestrate     DOUBLE PRECISION NOT NULL,
    CONSTRAINT accountlimitdetail_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS accountkistschedule (
    id           INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid         INT              NOT NULL,
    loanaccid    INT              NULL,
    kistnumber   INT              NULL,
    date         TIMESTAMP(3)     NULL,
    kistamount   NUMERIC(24,2)    NULL,
    principalamt NUMERIC(24,2)    NULL,
    interestamt  NUMERIC(24,2)    NULL,
    CONSTRAINT accountkistschedule_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanaccopeningbalance (
    id              INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    branchid        INT              NOT NULL,
    accid           INT              NULL,
    totalbalance    NUMERIC(24,2)    NULL,
    baltype         VARCHAR(2)       NULL,
    overduebal      NUMERIC(24,0)    NULL,
    overbaltype     VARCHAR(2)       NULL,
    openint         NUMERIC(24,0)    NULL,
    openinttype     VARCHAR(2)       NULL,
    openoverint     NUMERIC(24,0)    NULL,
    openoverinttype VARCHAR(2)       NULL,
    headcode        BIGINT           NULL,
    overduedate     TIMESTAMP(3)     NULL,
    CONSTRAINT loanaccopeningbalance_pkey PRIMARY KEY (id, branchid)
);

CREATE TABLE IF NOT EXISTS loanaccountbalancedetail (
    id            INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid          INT              NOT NULL,
    loanopenbalid INT              NOT NULL,
    accountid     INT              NOT NULL,
    amountdr      NUMERIC(24,2)    NOT NULL,
    amountcr      NUMERIC(24,2)    NOT NULL,
    intdr         NUMERIC(24,2)    NOT NULL,
    intcr         NUMERIC(24,2)    NOT NULL,
    date          TIMESTAMP(3)     NOT NULL,
    valuedate     TIMESTAMP(3)     NOT NULL,
    status        VARCHAR(5)       NULL,
    headcode      BIGINT           NULL,
    CONSTRAINT loanaccountbalancedetail_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanaccountrecoveryinterest (
    id            INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid          INT              NOT NULL,
    baldetailid   INT              NOT NULL,
    intcategoryid INT              NOT NULL,
    amountdr      NUMERIC(24,2)    NOT NULL,
    amountcr      NUMERIC(24,2)    NOT NULL,
    accid         INT              NOT NULL,
    entrydate     TIMESTAMP(3)     NULL,
    valuedate     TIMESTAMP(3)     NULL,
    CONSTRAINT loanaccountrecoveryinterest_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanaccfdpledge (
    id           INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid         INT              NOT NULL,
    loanaccid    INT              NULL,
    fdaccid      INT              NULL,
    fdaccdetid   INT              NULL,
    lateststatus INT              NULL,
    date         TIMESTAMP(3)     NULL,
    CONSTRAINT loanaccfdpledge_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanaccfdpledgedetail (
    id             INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid           INT              NOT NULL,
    laccfdpledgeid INT              NULL,
    date           TIMESTAMP(3)     NULL,
    status         INT              NULL,
    CONSTRAINT loanaccfdpledgedetail_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanaccrdpledge (
    id           INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid         INT              NOT NULL,
    loanaccid    INT              NULL,
    rdaccid      INT              NULL,
    rdaccdetid   INT              NULL,
    lateststatus INT              NULL,
    date         TIMESTAMP(3)     NULL,
    CONSTRAINT loanaccrdpledge_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanaccrdpledgedetail (
    id             INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid           INT              NOT NULL,
    laccrdpledgeid INT              NULL,
    date           TIMESTAMP(3)     NULL,
    status         INT              NULL,
    ishoupdated    SMALLINT         NULL,
    CONSTRAINT loanaccrdpledgedetail_pkey PRIMARY KEY (id, brid)
);

CREATE TABLE IF NOT EXISTS loanguarwitness (
    id            INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
    brid          INT              NOT NULL,
    loanaccid     INT              NULL,
    date          TIMESTAMP(3)     NULL,
    guar1memid    INT              NULL,
    guar1membrid  INT              NOT NULL DEFAULT 0,
    guar2memid    INT              NULL,
    guar2membrid  INT              NOT NULL DEFAULT 0,
    witness1memid INT              NULL,
    wit1membrid   INT              NULL,
    witness2memid INT              NULL,
    wit2membrid   INT              NOT NULL DEFAULT 0,
    CONSTRAINT loanguarwitness_pkey PRIMARY KEY (id, brid)
);


-- =============================================================================
-- SECTION 12 : AUDIT LOG  (immutable — DB-level trigger enforces it)
-- =============================================================================

CREATE TABLE IF NOT EXISTS auditlog (
    id         SERIAL          PRIMARY KEY,
    branchid   INT             NOT NULL,
    userid     VARCHAR(50)     NOT NULL DEFAULT '',
    username   VARCHAR(100)    NOT NULL DEFAULT '',
    action     VARCHAR(20)     NOT NULL,
    module     VARCHAR(100)    NOT NULL DEFAULT '',
    entityname VARCHAR(100)    NOT NULL,
    entityid   VARCHAR(200)    NULL,
    oldvalue   TEXT            NULL,
    newvalue   TEXT            NULL,
    ipaddress  VARCHAR(50)     NULL,
    workingdate VARCHAR(20)    NULL,
    createdat  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditlog_branchid   ON auditlog (branchid);
CREATE INDEX IF NOT EXISTS idx_auditlog_createdat  ON auditlog (createdat DESC);
CREATE INDEX IF NOT EXISTS idx_auditlog_entityname ON auditlog (entityname);
CREATE INDEX IF NOT EXISTS idx_auditlog_userid     ON auditlog (userid);

CREATE OR REPLACE FUNCTION fn_prevent_auditlog_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log records are immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_auditlog_immutable
BEFORE UPDATE OR DELETE ON auditlog
FOR EACH ROW EXECUTE FUNCTION fn_prevent_auditlog_modification();


-- =============================================================================
-- SECTION 13 : INCREMENTAL COLUMN ADDITIONS
-- =============================================================================
-- Put every new column you add to an existing table here.
-- Pattern:  ALTER TABLE tablename ADD COLUMN IF NOT EXISTS colname type;
-- Safe to run repeatedly — does nothing if the column already exists.
-- Keep newest additions at the BOTTOM of this section.
-- =============================================================================

-- accountmaster
-- ALTER TABLE accountmaster ADD COLUMN IF NOT EXISTS membershipno VARCHAR(50) NULL;

-- ── ADD NEW COLUMNS BELOW THIS LINE ──────────────────────────────────────────

-- loanproductdefinition: interest calculation method ('Schedule' | 'Balance' | 'MinBalance')
ALTER TABLE loanproductdefinition ADD COLUMN IF NOT EXISTS intcalcmethod VARCHAR(12) DEFAULT 'Schedule';
