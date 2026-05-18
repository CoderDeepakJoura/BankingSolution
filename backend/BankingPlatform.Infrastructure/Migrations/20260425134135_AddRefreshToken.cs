using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRefreshToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "jointaccholderaccountnumber",
                table: "jointaccountinfo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "addedusing",
                table: "accountmaster",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "accountkistdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    accountid = table.Column<int>(type: "integer", nullable: false),
                    loanamountpassed = table.Column<double>(type: "double precision", nullable: true),
                    loanperiod = table.Column<int>(type: "integer", nullable: true),
                    slabid = table.Column<int>(type: "integer", nullable: true),
                    standardinterestrate = table.Column<double>(type: "double precision", nullable: true),
                    overdueinterestrate = table.Column<double>(type: "double precision", nullable: true),
                    loandate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    kistinterval = table.Column<int>(type: "integer", nullable: true),
                    kistfirstdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    kistamount = table.Column<double>(type: "double precision", nullable: true),
                    kistprinpart = table.Column<double>(type: "double precision", nullable: true),
                    kistintpart = table.Column<double>(type: "double precision", nullable: true),
                    loanno = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    kistwithinterest = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    status = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    loanperiodindays = table.Column<int>(type: "integer", nullable: true),
                    kistintervalindays = table.Column<int>(type: "integer", nullable: true),
                    kislintamt = table.Column<double>(type: "double precision", nullable: true),
                    marginmoney = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_accountkistdetail", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "accountkistschedule",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    loanaccid = table.Column<int>(type: "integer", nullable: true),
                    kistnumber = table.Column<int>(type: "integer", nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    kistamount = table.Column<decimal>(type: "numeric(24,2)", nullable: true),
                    principalamt = table.Column<decimal>(type: "numeric(24,2)", nullable: true),
                    interestamt = table.Column<decimal>(type: "numeric(24,2)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_accountkistschedule", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "accountlimitdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    accountid = table.Column<int>(type: "integer", nullable: false),
                    loanno = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    loandate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    loanamountpassed = table.Column<double>(type: "double precision", nullable: false),
                    loanlimitperiodinmonths = table.Column<int>(type: "integer", nullable: false),
                    loanlimitperiodindays = table.Column<int>(type: "integer", nullable: false),
                    slabid = table.Column<int>(type: "integer", nullable: false),
                    standardinterestrate = table.Column<double>(type: "double precision", nullable: false),
                    overdueinterestrate = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_accountlimitdetail", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "branchsession",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    sessionfrom = table.Column<int>(type: "integer", nullable: false),
                    sessionto = table.Column<int>(type: "integer", nullable: false),
                    fromdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    todate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    iscurrent = table.Column<bool>(type: "boolean", nullable: false),
                    isfirst = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("branchsession_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "fdaccountdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    accountid = table.Column<int>(type: "integer", nullable: false),
                    fdamount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    fddate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    fdmaturitydate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    maturityamount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ltdno = table.Column<int>(type: "integer", nullable: false),
                    fdstatus = table.Column<int>(type: "integer", nullable: false),
                    fdperiodmonths = table.Column<int>(type: "integer", nullable: false),
                    fdperioddays = table.Column<int>(type: "integer", nullable: false),
                    slabid = table.Column<int>(type: "integer", nullable: false),
                    intrate = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    intcompinterval = table.Column<int>(type: "integer", nullable: false),
                    serialno = table.Column<int>(type: "integer", nullable: false),
                    voucherdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    interestpaidinterval = table.Column<int>(type: "integer", nullable: true),
                    interestpaidamount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    misaccid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("fdaccountdetail_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "fdinterestslab",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    slabname = table.Column<string>(type: "text", nullable: false),
                    fdproductid = table.Column<int>(type: "integer", nullable: false),
                    fromdays = table.Column<int>(type: "integer", nullable: false),
                    todays = table.Column<int>(type: "integer", nullable: false),
                    compoundinginterval = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("fdinterestslab_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "fdinterestslabdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    fdintslabinfoid = table.Column<int>(type: "integer", nullable: false),
                    fdintslabid = table.Column<int>(type: "integer", nullable: false),
                    agefrom = table.Column<decimal>(type: "numeric", nullable: false),
                    ageto = table.Column<decimal>(type: "numeric", nullable: false),
                    interestrate = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("fdinterestslabdetail_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "fdinterestslabinfo",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    fdproductid = table.Column<int>(type: "integer", nullable: false),
                    applicabledate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("fdinterestslabinfo_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "loanaccfdpledge",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    loanaccid = table.Column<int>(type: "integer", nullable: true),
                    fdaccid = table.Column<int>(type: "integer", nullable: true),
                    fdaccdetid = table.Column<int>(type: "integer", nullable: true),
                    lateststatus = table.Column<int>(type: "integer", nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loanaccfdpledge", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "loanaccfdpledgedetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    laccfdpledgeid = table.Column<int>(type: "integer", nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loanaccfdpledgedetail", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "loanaccopeningbalance",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    accid = table.Column<int>(type: "integer", nullable: true),
                    totalbalance = table.Column<decimal>(type: "numeric(24,2)", nullable: true),
                    baltype = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    overduebal = table.Column<decimal>(type: "numeric(24,0)", nullable: true),
                    overbaltype = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    openint = table.Column<decimal>(type: "numeric(24,0)", nullable: true),
                    openinttype = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    openoverint = table.Column<decimal>(type: "numeric(24,0)", nullable: true),
                    openoverinttype = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    headcode = table.Column<long>(type: "bigint", nullable: true),
                    overduedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loanaccopeningbalance", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "loanaccountbalancedetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    loanopenbalid = table.Column<int>(type: "integer", nullable: false),
                    accountid = table.Column<int>(type: "integer", nullable: false),
                    amountdr = table.Column<decimal>(type: "numeric(24,2)", nullable: false),
                    amountcr = table.Column<decimal>(type: "numeric(24,2)", nullable: false),
                    intdr = table.Column<decimal>(type: "numeric(24,2)", nullable: false),
                    intcr = table.Column<decimal>(type: "numeric(24,2)", nullable: false),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    valuedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    headcode = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loanaccountbalancedetail", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "loanaccountrecoveryinterest",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    baldetailid = table.Column<int>(type: "integer", nullable: false),
                    intcategoryid = table.Column<int>(type: "integer", nullable: false),
                    amountdr = table.Column<decimal>(type: "numeric(24,2)", nullable: false),
                    amountcr = table.Column<decimal>(type: "numeric(24,2)", nullable: false),
                    accid = table.Column<int>(type: "integer", nullable: false),
                    entrydate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    valuedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loanaccountrecoveryinterest", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "loanaccrdpledge",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    loanaccid = table.Column<int>(type: "integer", nullable: true),
                    rdaccid = table.Column<int>(type: "integer", nullable: true),
                    rdaccdetid = table.Column<int>(type: "integer", nullable: true),
                    lateststatus = table.Column<int>(type: "integer", nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loanaccrdpledge", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "loanaccrdpledgedetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    laccrdpledgeid = table.Column<int>(type: "integer", nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: true),
                    ishoupdated = table.Column<short>(type: "smallint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loanaccrdpledgedetail", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "loanguarwitness",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    loanaccid = table.Column<int>(type: "integer", nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    guar1memid = table.Column<int>(type: "integer", nullable: true),
                    guar1membrid = table.Column<int>(type: "integer", nullable: false),
                    guar2memid = table.Column<int>(type: "integer", nullable: true),
                    guar2membrid = table.Column<int>(type: "integer", nullable: false),
                    witness1memid = table.Column<int>(type: "integer", nullable: true),
                    wit1membrid = table.Column<int>(type: "integer", nullable: true),
                    witness2memid = table.Column<int>(type: "integer", nullable: true),
                    wit2membrid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loanguarwitness", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "loanproduct",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    productname = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    namesl = table.Column<string>(type: "character varying(75)", maxLength: 75, nullable: true),
                    effectivefrom = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("loanproduct_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "loanproductadvancement",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    productid = table.Column<int>(type: "integer", nullable: false),
                    disbursmentmode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    maxnoofdisbursments = table.Column<int>(type: "integer", nullable: false),
                    minloanamount = table.Column<decimal>(type: "numeric(24,2)", nullable: false),
                    maxloanamount = table.Column<decimal>(type: "numeric(24,2)", nullable: false),
                    issharemoneyreq = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    loanperiodtype = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    overdraftlimit = table.Column<short>(type: "smallint", nullable: false),
                    loanamtperonsecurityrd = table.Column<decimal>(type: "numeric(24,2)", nullable: true),
                    loanamtperonsecurityfd = table.Column<decimal>(type: "numeric(24,2)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("loanproductadvancement_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "loanproductbranchwiserule",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    loanproductid = table.Column<int>(type: "integer", nullable: false),
                    mclplanid = table.Column<int>(type: "integer", nullable: true),
                    npaplanid = table.Column<int>(type: "integer", nullable: true),
                    legalplanid = table.Column<int>(type: "integer", nullable: true),
                    operatedby = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    accnoornamefirst = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    temprecaccid = table.Column<int>(type: "integer", nullable: true),
                    currentrecoverableintacc = table.Column<int>(type: "integer", nullable: true),
                    intincomeacc = table.Column<int>(type: "integer", nullable: true),
                    overduerecoverableintacc = table.Column<int>(type: "integer", nullable: true),
                    isapplyoverint = table.Column<short>(type: "smallint", nullable: false),
                    ovrintprovacc = table.Column<int>(type: "integer", nullable: false),
                    intwrtdepositpledge = table.Column<int>(type: "integer", nullable: true),
                    ovrintfromopendate = table.Column<short>(type: "smallint", nullable: false),
                    actonexpposting = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("loanproductbranchwiserule_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "loanproductdefinition",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    productid = table.Column<int>(type: "integer", nullable: false),
                    typeid = table.Column<int>(type: "integer", nullable: false),
                    categoryid = table.Column<int>(type: "integer", nullable: true),
                    securityids = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    secreviewfreqperiod = table.Column<int>(type: "integer", nullable: false),
                    docplanid = table.Column<int>(type: "integer", nullable: true),
                    intschedule = table.Column<int>(type: "integer", nullable: true),
                    intformulae = table.Column<int>(type: "integer", nullable: true),
                    actonintposting = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("loanproductdefinition_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "loanproductmarginmoneyrule",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    advid = table.Column<int>(type: "integer", nullable: false),
                    ratioorperc = table.Column<int>(type: "integer", nullable: false),
                    loanproportion = table.Column<double>(type: "double precision", nullable: false),
                    marginproportion = table.Column<double>(type: "double precision", nullable: false),
                    mmpercentage = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("loanproductmarginmoneyrule_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "loanproductposting",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    productid = table.Column<int>(type: "integer", nullable: false),
                    principalbalheadcode = table.Column<long>(type: "bigint", nullable: false),
                    miscincheadcode = table.Column<long>(type: "bigint", nullable: false),
                    minballeftlimitheadcode = table.Column<long>(type: "bigint", nullable: false),
                    minbalgivenlimitheadcode = table.Column<long>(type: "bigint", nullable: false),
                    expheadcode = table.Column<long>(type: "bigint", nullable: false),
                    recoverableintheadcode = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("loanproductposting_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "loanproductrecovery",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    productid = table.Column<int>(type: "integer", nullable: false),
                    recoverymode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    recoveryseq = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    minballeftlimit = table.Column<double>(type: "double precision", nullable: false),
                    minbalgivenlimit = table.Column<double>(type: "double precision", nullable: false),
                    applyovrinton = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    intrecoveredinadvance = table.Column<short>(type: "smallint", nullable: true),
                    intpostinginterval = table.Column<int>(type: "integer", nullable: true),
                    stdoverdueonkistdate = table.Column<short>(type: "smallint", nullable: true),
                    recoveryadjustmentseq = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("loanproductrecovery_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "loanslab",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    namesl = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    loanproductid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loanslab", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "loanslabdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    slabid = table.Column<int>(type: "integer", nullable: false),
                    fromamount = table.Column<decimal>(type: "numeric", nullable: false),
                    toamount = table.Column<decimal>(type: "numeric", nullable: false),
                    periodfrom = table.Column<int>(type: "integer", nullable: true),
                    periodto = table.Column<int>(type: "integer", nullable: true),
                    periodfromindays = table.Column<int>(type: "integer", nullable: true),
                    periodtoindays = table.Column<int>(type: "integer", nullable: true),
                    stdintrate = table.Column<double>(type: "double precision", nullable: true),
                    penalintrate = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loanslabdetail", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "rdaccountdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    accid = table.Column<int>(type: "integer", nullable: true),
                    rdnumber = table.Column<int>(type: "integer", nullable: true),
                    rddate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    rdamount = table.Column<decimal>(type: "numeric", nullable: false),
                    noofmonths = table.Column<int>(type: "integer", nullable: true),
                    rdslabid = table.Column<int>(type: "integer", nullable: true),
                    interestrate = table.Column<double>(type: "double precision", nullable: true),
                    maturitydate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    kistamt = table.Column<decimal>(type: "numeric", nullable: true),
                    kistinterval = table.Column<int>(type: "integer", nullable: true),
                    firstkistdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    penaltyamt = table.Column<decimal>(type: "numeric", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: true),
                    maturityamt = table.Column<decimal>(type: "numeric", nullable: true),
                    noofdays = table.Column<int>(type: "integer", nullable: true),
                    compoundinginterval = table.Column<int>(type: "integer", nullable: true),
                    maturedon = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    prematuredon = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("rdaccountdetail_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "rdinterestslab",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    slabname = table.Column<string>(type: "text", nullable: false),
                    rdproductid = table.Column<int>(type: "integer", nullable: false),
                    applicabledate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("rdinterestslab_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "rdinterestslabdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    rdintslabid = table.Column<int>(type: "integer", nullable: false),
                    slabno = table.Column<int>(type: "integer", nullable: false),
                    fromamount = table.Column<decimal>(type: "numeric", nullable: false),
                    toamount = table.Column<decimal>(type: "numeric", nullable: false),
                    kistinterval = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    periodfrom = table.Column<int>(type: "integer", nullable: false),
                    periodto = table.Column<int>(type: "integer", nullable: false),
                    interestrate = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("rdinterestslabdetail_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "rdproduct",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    productname = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    productnamesl = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    productcode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    effectivefrom = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("rdproduct_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "rdproductbranchwiserule",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    rdproductid = table.Column<int>(type: "integer", nullable: false),
                    intformula = table.Column<int>(type: "integer", nullable: false),
                    accnogeneration = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    printcertificate = table.Column<short>(type: "smallint", nullable: true),
                    intexpaccid = table.Column<int>(type: "integer", nullable: true),
                    penaltyincaccid = table.Column<int>(type: "integer", nullable: true),
                    closingchargesacc = table.Column<int>(type: "integer", nullable: true),
                    kistaftermaturity = table.Column<short>(type: "smallint", nullable: true),
                    paymentdatetype = table.Column<short>(type: "smallint", nullable: true),
                    noofdayormonth = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("rdproductbranchwiserule_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "rdproductdefinition",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    rdproductid = table.Column<int>(type: "integer", nullable: true),
                    docplanid = table.Column<int>(type: "integer", nullable: true),
                    minperiodlimitmonths = table.Column<int>(type: "integer", nullable: true),
                    maxperiodlimitmonths = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("rdproductdefinition_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "rdproductinterestrules",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    productid = table.Column<int>(type: "integer", nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    intratefrom = table.Column<double>(type: "double precision", nullable: true),
                    intrateto = table.Column<double>(type: "double precision", nullable: true),
                    intvariationforaccless = table.Column<double>(type: "double precision", nullable: true),
                    intvariationforaccexceed = table.Column<double>(type: "double precision", nullable: true),
                    intpostinginterval = table.Column<int>(type: "integer", nullable: true),
                    intcompoundinginterval = table.Column<int>(type: "integer", nullable: true),
                    actonintposting = table.Column<int>(type: "integer", nullable: true),
                    intrateonpremat = table.Column<double>(type: "double precision", nullable: true),
                    postmaturityintrate = table.Column<double>(type: "double precision", nullable: true),
                    minlockinperioddays = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("rdproductinterestrules_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "rdproductposting",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    rdproductid = table.Column<int>(type: "integer", nullable: true),
                    principalbalheadcode = table.Column<long>(type: "bigint", nullable: true),
                    intpayableheadcode = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("rdproductposting_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "refreshtoken",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    token = table.Column<string>(type: "text", nullable: false),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    claimssnapshot = table.Column<string>(type: "text", nullable: false),
                    expiresat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    isrevoked = table.Column<bool>(type: "boolean", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    replacedbytoken = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_refreshtoken", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "voucherfddetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    voucherid = table.Column<int>(type: "integer", nullable: false),
                    vacccrdrid = table.Column<int>(type: "integer", nullable: false),
                    fdaccid = table.Column<int>(type: "integer", nullable: false),
                    fdaccdetid = table.Column<int>(type: "integer", nullable: false),
                    amountcr = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    amountdr = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    operation = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    valuedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    voucherdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    intdr = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    intcr = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    vouchermainstatus = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("voucherfddetail_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "voucherrddetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    vacccrdrid = table.Column<int>(type: "integer", nullable: false),
                    rdaccid = table.Column<int>(type: "integer", nullable: false),
                    rdaccdetid = table.Column<int>(type: "integer", nullable: false),
                    amountcr = table.Column<double>(type: "double precision", nullable: false),
                    amountdr = table.Column<double>(type: "double precision", nullable: false),
                    operation = table.Column<string>(type: "text", nullable: false),
                    valuedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    voucherdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    othrefaccid = table.Column<int>(type: "integer", nullable: true),
                    penalamt = table.Column<decimal>(type: "numeric", nullable: true),
                    penalaccid = table.Column<int>(type: "integer", nullable: true),
                    intdr = table.Column<double>(type: "double precision", nullable: true),
                    intcr = table.Column<double>(type: "double precision", nullable: true),
                    vouchermainstatus = table.Column<string>(type: "text", nullable: true),
                    voucherid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("voucherrddetail_pkey", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "vouchersavingdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    vacccrdrid = table.Column<int>(type: "integer", nullable: false),
                    operation = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
                    accid = table.Column<int>(type: "integer", nullable: true),
                    amt = table.Column<decimal>(type: "numeric", nullable: true),
                    chequebookid = table.Column<int>(type: "integer", nullable: true),
                    chequeno = table.Column<int>(type: "integer", nullable: true),
                    valuedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    voucherdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    vouchermainstatus = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    voucherid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_vouchersavingdetail", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_branchsession_id_branchid",
                table: "branchsession",
                columns: new[] { "id", "branchid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_fdaccountdetail_id_branchid",
                table: "fdaccountdetail",
                columns: new[] { "id", "branchid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_voucherfddetail_id_brid",
                table: "voucherfddetail",
                columns: new[] { "id", "brid" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "accountkistdetail");

            migrationBuilder.DropTable(
                name: "accountkistschedule");

            migrationBuilder.DropTable(
                name: "accountlimitdetail");

            migrationBuilder.DropTable(
                name: "branchsession");

            migrationBuilder.DropTable(
                name: "fdaccountdetail");

            migrationBuilder.DropTable(
                name: "fdinterestslab");

            migrationBuilder.DropTable(
                name: "fdinterestslabdetail");

            migrationBuilder.DropTable(
                name: "fdinterestslabinfo");

            migrationBuilder.DropTable(
                name: "loanaccfdpledge");

            migrationBuilder.DropTable(
                name: "loanaccfdpledgedetail");

            migrationBuilder.DropTable(
                name: "loanaccopeningbalance");

            migrationBuilder.DropTable(
                name: "loanaccountbalancedetail");

            migrationBuilder.DropTable(
                name: "loanaccountrecoveryinterest");

            migrationBuilder.DropTable(
                name: "loanaccrdpledge");

            migrationBuilder.DropTable(
                name: "loanaccrdpledgedetail");

            migrationBuilder.DropTable(
                name: "loanguarwitness");

            migrationBuilder.DropTable(
                name: "loanproduct");

            migrationBuilder.DropTable(
                name: "loanproductadvancement");

            migrationBuilder.DropTable(
                name: "loanproductbranchwiserule");

            migrationBuilder.DropTable(
                name: "loanproductdefinition");

            migrationBuilder.DropTable(
                name: "loanproductmarginmoneyrule");

            migrationBuilder.DropTable(
                name: "loanproductposting");

            migrationBuilder.DropTable(
                name: "loanproductrecovery");

            migrationBuilder.DropTable(
                name: "loanslab");

            migrationBuilder.DropTable(
                name: "loanslabdetail");

            migrationBuilder.DropTable(
                name: "rdaccountdetail");

            migrationBuilder.DropTable(
                name: "rdinterestslab");

            migrationBuilder.DropTable(
                name: "rdinterestslabdetail");

            migrationBuilder.DropTable(
                name: "rdproduct");

            migrationBuilder.DropTable(
                name: "rdproductbranchwiserule");

            migrationBuilder.DropTable(
                name: "rdproductdefinition");

            migrationBuilder.DropTable(
                name: "rdproductinterestrules");

            migrationBuilder.DropTable(
                name: "rdproductposting");

            migrationBuilder.DropTable(
                name: "refreshtoken");

            migrationBuilder.DropTable(
                name: "voucherfddetail");

            migrationBuilder.DropTable(
                name: "voucherrddetail");

            migrationBuilder.DropTable(
                name: "vouchersavingdetail");

            migrationBuilder.DropColumn(
                name: "jointaccholderaccountnumber",
                table: "jointaccountinfo");

            migrationBuilder.DropColumn(
                name: "addedusing",
                table: "accountmaster");
        }
    }
}
