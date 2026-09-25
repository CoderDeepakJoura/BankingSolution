using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVoucherPrintSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auditlog");

            migrationBuilder.AddColumn<int>(
                name: "failedloginattempts",
                table: "user",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "lastseenversion",
                table: "user",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "lockoutuntil",
                table: "user",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "sessionstamp",
                table: "user",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "daysinayear",
                table: "savingproductbranchwiserule",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<int>(
                name: "zoneid2",
                table: "memberlocationdetails",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "villageid2",
                table: "memberlocationdetails",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "thanaid2",
                table: "memberlocationdetails",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "tehsil2",
                table: "memberlocationdetails",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "po2",
                table: "memberlocationdetails",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "entrytype",
                table: "loanaccountbalancedetail",
                type: "character varying(5)",
                maxLength: 5,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "voucherid",
                table: "loanaccountbalancedetail",
                type: "integer",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "slabid",
                table: "fdaccountdetail",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<decimal>(
                name: "openingbalance",
                table: "fdaccountdetail",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "openingbalancetype",
                table: "fdaccountdetail",
                type: "character varying(5)",
                maxLength: 5,
                nullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "isaccclosed",
                table: "accountmaster",
                type: "boolean",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.CreateTable(
                name: "accservicedetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    accid = table.Column<int>(type: "integer", nullable: false),
                    serviceid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_accservicedetail", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "bankfdaccountdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    accid = table.Column<int>(type: "integer", nullable: false),
                    fdamount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    fddate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    fdmaturitydate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    maturityamount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ltdno = table.Column<string>(type: "text", nullable: false),
                    fdstatus = table.Column<int>(type: "integer", nullable: false),
                    fdperiodmonths = table.Column<int>(type: "integer", nullable: false),
                    fdperioddays = table.Column<int>(type: "integer", nullable: false),
                    intrate = table.Column<double>(type: "double precision", nullable: false),
                    intcompinterval = table.Column<int>(type: "integer", nullable: false),
                    serialno = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    tdsamount = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bankfdaccountdetail", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "bankfdaccountopeningbalance",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    accountid = table.Column<int>(type: "integer", nullable: false),
                    fdaccdetid = table.Column<int>(type: "integer", nullable: false),
                    balance = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    balancetype = table.Column<string>(type: "text", nullable: false),
                    headcode = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bankfdaccountopeningbalance", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "bankfdaccountopeningtds",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    accountid = table.Column<int>(type: "integer", nullable: false),
                    fdaccdetid = table.Column<int>(type: "integer", nullable: false),
                    balance = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    headcode = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bankfdaccountopeningtds", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "bankfdinterestincomesetting",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    headcode = table.Column<long>(type: "bigint", nullable: false),
                    intincomeaccid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bankfdinterestincomesetting", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "bfdheadtdsaccsettings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    headcode = table.Column<long>(type: "bigint", nullable: false),
                    tdsaccid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bfdheadtdsaccsettings", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "billbook",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    billnoprefix = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    billnofrom = table.Column<int>(type: "integer", nullable: false),
                    billnogeneration = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_billbook", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "employeeattendance",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    empid = table.Column<int>(type: "integer", nullable: false),
                    attmonth = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    atttype = table.Column<int>(type: "integer", nullable: false),
                    el = table.Column<decimal>(type: "numeric", nullable: false),
                    cl = table.Column<decimal>(type: "numeric", nullable: false),
                    mlsl = table.Column<decimal>(type: "numeric", nullable: false),
                    lwp = table.Column<decimal>(type: "numeric", nullable: false),
                    remarks = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_employeeattendance", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "employeedesignation",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    alias = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    description = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    empgradeid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("employeedesignation_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "employeemaster",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    firstname = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    lastname = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    designationid = table.Column<int>(type: "integer", nullable: false),
                    emptype = table.Column<int>(type: "integer", nullable: false),
                    genderid = table.Column<int>(type: "integer", nullable: false),
                    dob = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    address = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    joiningdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    memberid = table.Column<int>(type: "integer", nullable: false),
                    memberbranchid = table.Column<int>(type: "integer", nullable: false),
                    remarks = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    emailid = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    currentbranchid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("employeemaster_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "expensecategory",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    description = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    descriptionsl = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_expensecategory", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "fdtdsslab",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    namesl = table.Column<string>(type: "text", nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    withpancard = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_fdtdsslab", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "fdtdsslabdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    slabid = table.Column<int>(type: "integer", nullable: false),
                    fromamount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    toamount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    intrate = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_fdtdsslabdetail", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "gstservicedetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    stockmainid = table.Column<int>(type: "integer", nullable: false),
                    serviceid = table.Column<int>(type: "integer", nullable: false),
                    taxid = table.Column<int>(type: "integer", nullable: false),
                    amount = table.Column<decimal>(type: "numeric", nullable: false),
                    netamount = table.Column<decimal>(type: "numeric", nullable: false),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_gstservicedetail", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "gstsetting",
                columns: table => new
                {
                    brid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    roundoffexpaccid = table.Column<int>(type: "integer", nullable: false),
                    roundoffincaccid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_gstsetting", x => x.brid);
                });

            migrationBuilder.CreateTable(
                name: "interbranchvoucher",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    vouchertype = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    flowtype = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    narration = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    entrydate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    frombrid = table.Column<int>(type: "integer", nullable: false),
                    destbrid = table.Column<int>(type: "integer", nullable: false),
                    destaccid = table.Column<int>(type: "integer", nullable: false),
                    destaccno = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    destaccname = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    destmemberid = table.Column<int>(type: "integer", nullable: true),
                    step1voucherid = table.Column<int>(type: "integer", nullable: true),
                    step1brid = table.Column<int>(type: "integer", nullable: true),
                    step1draccid = table.Column<int>(type: "integer", nullable: true),
                    step1draccname = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    step1drheadcode = table.Column<long>(type: "bigint", nullable: true),
                    step1craccid = table.Column<int>(type: "integer", nullable: true),
                    step1craccname = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    step1crheadcode = table.Column<long>(type: "bigint", nullable: true),
                    step1date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    step1workingdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    step1userid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    step2voucherid = table.Column<int>(type: "integer", nullable: true),
                    step2brid = table.Column<int>(type: "integer", nullable: true),
                    step2draccid = table.Column<int>(type: "integer", nullable: true),
                    step2draccname = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    step2drheadcode = table.Column<long>(type: "bigint", nullable: true),
                    step2craccid = table.Column<int>(type: "integer", nullable: true),
                    step2craccname = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    step2crheadcode = table.Column<long>(type: "bigint", nullable: true),
                    step2date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    step2workingdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    step2userid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    step3voucherid = table.Column<int>(type: "integer", nullable: true),
                    step3brid = table.Column<int>(type: "integer", nullable: true),
                    step3draccid = table.Column<int>(type: "integer", nullable: true),
                    step3draccname = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    step3drheadcode = table.Column<long>(type: "bigint", nullable: true),
                    step3craccid = table.Column<int>(type: "integer", nullable: true),
                    step3craccname = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    step3crheadcode = table.Column<long>(type: "bigint", nullable: true),
                    step3date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    step3workingdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    step3userid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_interbranchvoucher", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "loanexpense",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    loanproductid = table.Column<int>(type: "integer", nullable: false),
                    draccountid = table.Column<int>(type: "integer", nullable: false),
                    expensecategoryid = table.Column<int>(type: "integer", nullable: false),
                    expenseamount = table.Column<decimal>(type: "numeric", nullable: false),
                    totaltax = table.Column<decimal>(type: "numeric", nullable: false),
                    netamount = table.Column<decimal>(type: "numeric", nullable: false),
                    remarks = table.Column<string>(type: "text", nullable: true),
                    craccounttypeid = table.Column<int>(type: "integer", nullable: false),
                    craccountid = table.Column<int>(type: "integer", nullable: false),
                    stockmainid = table.Column<int>(type: "integer", nullable: true),
                    voucherid = table.Column<int>(type: "integer", nullable: true),
                    voucherno = table.Column<int>(type: "integer", nullable: false),
                    addedby = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loanexpense", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "monthlysalary",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    salarymonth = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    processdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    sessionid = table.Column<int>(type: "integer", nullable: false),
                    processedby = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("monthlysalary_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "monthlysalarycompdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    monthlysalaryempid = table.Column<int>(type: "integer", nullable: false),
                    compid = table.Column<int>(type: "integer", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    isdeduction = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("monthlysalarycompdetail_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "monthlysalaryempdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    monthlysalaryid = table.Column<int>(type: "integer", nullable: false),
                    empid = table.Column<int>(type: "integer", nullable: false),
                    totalgross = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    totaldeduction = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    netpay = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("monthlysalaryempdetail_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "nextbillnumber",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    brsessid = table.Column<int>(type: "integer", nullable: false),
                    fkid = table.Column<int>(type: "integer", nullable: false),
                    nextbillno = table.Column<int>(type: "integer", nullable: false),
                    fktype = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_nextbillnumber", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "npaplancategory",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    parentid = table.Column<int>(type: "integer", nullable: true),
                    isgroup = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    planid = table.Column<int>(type: "integer", nullable: true),
                    periodfrom = table.Column<int>(type: "integer", nullable: true),
                    periodto = table.Column<int>(type: "integer", nullable: true),
                    provisioningperc = table.Column<double>(type: "double precision", nullable: true),
                    intmaxperiod = table.Column<int>(type: "integer", nullable: true),
                    description = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    descriptionsl = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    seqno = table.Column<int>(type: "integer", nullable: true),
                    ishoupdated = table.Column<short>(type: "smallint", nullable: true),
                    allprinoverdue = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_npaplancategory", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "npaplanmaster",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ishoupdated = table.Column<short>(type: "smallint", nullable: true),
                    calnpadate = table.Column<int>(type: "integer", nullable: false),
                    ovrdueperiodorinst = table.Column<int>(type: "integer", nullable: false),
                    calnpafromloandate = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_npaplanmaster", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "otherbranchaccounts",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    otherbrid = table.Column<int>(type: "integer", nullable: false),
                    accid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_otherbranchaccounts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "salarycompempwise",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    empid = table.Column<int>(type: "integer", nullable: false),
                    compid = table.Column<int>(type: "integer", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    isactive = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("salarycompempwise_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "salarycomponent",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    alias = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    seqno = table.Column<int>(type: "integer", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    iseditable = table.Column<short>(type: "smallint", nullable: false),
                    formulaecode = table.Column<string>(type: "character varying(1)", maxLength: 1, nullable: false),
                    defineamount = table.Column<short>(type: "smallint", nullable: false),
                    isallowance = table.Column<short>(type: "smallint", nullable: false),
                    isdeduction = table.Column<short>(type: "smallint", nullable: false),
                    accid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("salarycomponent_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "service",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    sac = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    otherreceipts = table.Column<decimal>(type: "numeric", nullable: false),
                    deductrefunds = table.Column<decimal>(type: "numeric", nullable: false),
                    penalties = table.Column<decimal>(type: "numeric", nullable: false),
                    isincludetax = table.Column<bool>(type: "boolean", nullable: false),
                    purchaseaccid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_service", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "servicetaxrule",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    serviceid = table.Column<int>(type: "integer", nullable: false),
                    applicabledate = table.Column<DateTime>(type: "timestamp", nullable: false),
                    taxid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_servicetaxrule", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "servicetaxtypedet",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    serviceid = table.Column<int>(type: "integer", nullable: false),
                    date = table.Column<DateTime>(type: "timestamp", nullable: false),
                    taxtypeid = table.Column<int>(type: "integer", nullable: false),
                    perc = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_servicetaxtypedet", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "smdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    stateid = table.Column<int>(type: "integer", nullable: false),
                    supplytypeid = table.Column<int>(type: "integer", nullable: false),
                    stockmainid = table.Column<int>(type: "integer", nullable: false),
                    gstino = table.Column<string>(type: "text", nullable: true),
                    fkid = table.Column<int>(type: "integer", nullable: true),
                    fkbrid = table.Column<int>(type: "integer", nullable: false),
                    fktypeid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_smdetail", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "stockbillbookdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    stockmainid = table.Column<int>(type: "integer", nullable: false),
                    billbookid = table.Column<int>(type: "integer", nullable: false),
                    billno = table.Column<int>(type: "integer", nullable: false),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    draccid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_stockbillbookdetail", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "stockmain",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    vmid = table.Column<int>(type: "integer", nullable: true),
                    narration = table.Column<string>(type: "text", nullable: true),
                    taxgroupid = table.Column<int>(type: "integer", nullable: false),
                    isrc = table.Column<short>(type: "smallint", nullable: true),
                    totalamount = table.Column<decimal>(type: "numeric", nullable: false),
                    roundamount = table.Column<decimal>(type: "numeric", nullable: true),
                    transtypeid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_stockmain", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "stocktaxdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    stockmainid = table.Column<int>(type: "integer", nullable: false),
                    taxtypeid = table.Column<int>(type: "integer", nullable: false),
                    taxperc = table.Column<decimal>(type: "numeric", nullable: false),
                    taxamt = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_stocktaxdetail", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "superusersettings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    allowsavinginterestchange = table.Column<bool>(type: "boolean", nullable: false),
                    allowfdinterestchange = table.Column<bool>(type: "boolean", nullable: false),
                    allowrdinterestchange = table.Column<bool>(type: "boolean", nullable: false),
                    allowloaninterestchange = table.Column<bool>(type: "boolean", nullable: false),
                    enableibtransactions = table.Column<bool>(type: "boolean", nullable: false),
                    allowgstdeduction = table.Column<bool>(type: "boolean", nullable: false),
                    showbankfdmodule = table.Column<bool>(type: "boolean", nullable: false),
                    showpayrollmodule = table.Column<bool>(type: "boolean", nullable: false),
                    enforcesinglesession = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("superusersettings_pkey", x => new { x.id, x.branchid });
                });

            migrationBuilder.CreateTable(
                name: "tax",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    namesl = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    taxcode = table.Column<int>(type: "integer", nullable: false),
                    introductiondate = table.Column<DateTime>(type: "date", nullable: false),
                    taxaccountid = table.Column<int>(type: "integer", nullable: false),
                    alias = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    aliassl = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    taxpercentage = table.Column<float>(type: "real", nullable: false),
                    parenttaxid = table.Column<int>(type: "integer", nullable: false),
                    evaluatedon = table.Column<int>(type: "integer", nullable: false),
                    oldtaxid = table.Column<int>(type: "integer", nullable: false),
                    tcid = table.Column<int>(type: "integer", nullable: false),
                    taxgroupid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_tax", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "taxdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    taxid = table.Column<int>(type: "integer", nullable: false),
                    detaildate = table.Column<DateTime>(type: "date", nullable: false),
                    taxtypeid = table.Column<int>(type: "integer", nullable: false),
                    nratio = table.Column<float>(type: "real", nullable: false),
                    dratio = table.Column<float>(type: "real", nullable: false),
                    evaluatedon = table.Column<int>(type: "integer", nullable: false),
                    percentage = table.Column<float>(type: "real", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_taxdetail", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "taxgroup",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    descriptionsl = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    printingformat = table.Column<int>(type: "integer", nullable: true),
                    isstatmandatory = table.Column<bool>(type: "boolean", nullable: false),
                    isshippingmandatory = table.Column<bool>(type: "boolean", nullable: false),
                    isbillingmandatory = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_taxgroup", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "taxgrouptype",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    taxgroupid = table.Column<int>(type: "integer", nullable: false),
                    taxtypeid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_taxgrouptype", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "taxtype",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    descriptionsl = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    appliedin = table.Column<int>(type: "integer", nullable: true),
                    isut = table.Column<short>(type: "smallint", nullable: true),
                    calculatedfrom = table.Column<int>(type: "integer", nullable: false),
                    seqno = table.Column<int>(type: "integer", nullable: false),
                    inaccid = table.Column<int>(type: "integer", nullable: false),
                    outaccid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_taxtype", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "userfavourites",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    path = table.Column<string>(type: "text", nullable: false),
                    label = table.Column<string>(type: "text", nullable: false),
                    category = table.Column<string>(type: "text", nullable: false),
                    sortorder = table.Column<int>(type: "integer", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_userfavourites", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "voucherbfddetail",
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
                    valuedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    voucherdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    vouchermainstatus = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_voucherbfddetail", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "voucherprintsettings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    vouchertype = table.Column<int>(type: "integer", nullable: false),
                    vouchersubtype = table.Column<int>(type: "integer", nullable: false),
                    isenabled = table.Column<bool>(type: "boolean", nullable: false),
                    copies = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("voucherprintsettings_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "uq_voucherprintsettings",
                table: "voucherprintsettings",
                columns: new[] { "branchid", "vouchertype", "vouchersubtype" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "accservicedetail");

            migrationBuilder.DropTable(
                name: "bankfdaccountdetail");

            migrationBuilder.DropTable(
                name: "bankfdaccountopeningbalance");

            migrationBuilder.DropTable(
                name: "bankfdaccountopeningtds");

            migrationBuilder.DropTable(
                name: "bankfdinterestincomesetting");

            migrationBuilder.DropTable(
                name: "bfdheadtdsaccsettings");

            migrationBuilder.DropTable(
                name: "billbook");

            migrationBuilder.DropTable(
                name: "employeeattendance");

            migrationBuilder.DropTable(
                name: "employeedesignation");

            migrationBuilder.DropTable(
                name: "employeemaster");

            migrationBuilder.DropTable(
                name: "expensecategory");

            migrationBuilder.DropTable(
                name: "fdtdsslab");

            migrationBuilder.DropTable(
                name: "fdtdsslabdetail");

            migrationBuilder.DropTable(
                name: "gstservicedetail");

            migrationBuilder.DropTable(
                name: "gstsetting");

            migrationBuilder.DropTable(
                name: "interbranchvoucher");

            migrationBuilder.DropTable(
                name: "loanexpense");

            migrationBuilder.DropTable(
                name: "monthlysalary");

            migrationBuilder.DropTable(
                name: "monthlysalarycompdetail");

            migrationBuilder.DropTable(
                name: "monthlysalaryempdetail");

            migrationBuilder.DropTable(
                name: "nextbillnumber");

            migrationBuilder.DropTable(
                name: "npaplancategory");

            migrationBuilder.DropTable(
                name: "npaplanmaster");

            migrationBuilder.DropTable(
                name: "otherbranchaccounts");

            migrationBuilder.DropTable(
                name: "salarycompempwise");

            migrationBuilder.DropTable(
                name: "salarycomponent");

            migrationBuilder.DropTable(
                name: "service");

            migrationBuilder.DropTable(
                name: "servicetaxrule");

            migrationBuilder.DropTable(
                name: "servicetaxtypedet");

            migrationBuilder.DropTable(
                name: "smdetail");

            migrationBuilder.DropTable(
                name: "stockbillbookdetail");

            migrationBuilder.DropTable(
                name: "stockmain");

            migrationBuilder.DropTable(
                name: "stocktaxdetail");

            migrationBuilder.DropTable(
                name: "superusersettings");

            migrationBuilder.DropTable(
                name: "tax");

            migrationBuilder.DropTable(
                name: "taxdetail");

            migrationBuilder.DropTable(
                name: "taxgroup");

            migrationBuilder.DropTable(
                name: "taxgrouptype");

            migrationBuilder.DropTable(
                name: "taxtype");

            migrationBuilder.DropTable(
                name: "userfavourites");

            migrationBuilder.DropTable(
                name: "voucherbfddetail");

            migrationBuilder.DropTable(
                name: "voucherprintsettings");

            migrationBuilder.DropColumn(
                name: "failedloginattempts",
                table: "user");

            migrationBuilder.DropColumn(
                name: "lastseenversion",
                table: "user");

            migrationBuilder.DropColumn(
                name: "lockoutuntil",
                table: "user");

            migrationBuilder.DropColumn(
                name: "sessionstamp",
                table: "user");

            migrationBuilder.DropColumn(
                name: "daysinayear",
                table: "savingproductbranchwiserule");

            migrationBuilder.DropColumn(
                name: "entrytype",
                table: "loanaccountbalancedetail");

            migrationBuilder.DropColumn(
                name: "voucherid",
                table: "loanaccountbalancedetail");

            migrationBuilder.DropColumn(
                name: "openingbalance",
                table: "fdaccountdetail");

            migrationBuilder.DropColumn(
                name: "openingbalancetype",
                table: "fdaccountdetail");

            migrationBuilder.AlterColumn<int>(
                name: "zoneid2",
                table: "memberlocationdetails",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "villageid2",
                table: "memberlocationdetails",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "thanaid2",
                table: "memberlocationdetails",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "tehsil2",
                table: "memberlocationdetails",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "po2",
                table: "memberlocationdetails",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "slabid",
                table: "fdaccountdetail",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "isaccclosed",
                table: "accountmaster",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "auditlog",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    action = table.Column<string>(type: "text", nullable: false),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    entityid = table.Column<string>(type: "text", nullable: true),
                    entityname = table.Column<string>(type: "text", nullable: false),
                    ipaddress = table.Column<string>(type: "text", nullable: true),
                    module = table.Column<string>(type: "text", nullable: false),
                    newvalue = table.Column<string>(type: "text", nullable: true),
                    oldvalue = table.Column<string>(type: "text", nullable: true),
                    userid = table.Column<string>(type: "text", nullable: false),
                    username = table.Column<string>(type: "text", nullable: false),
                    workingdate = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_auditlog", x => x.id);
                });
        }
    }
}
