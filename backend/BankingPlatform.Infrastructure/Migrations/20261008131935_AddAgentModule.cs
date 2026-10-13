using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAgentModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "copies",
                table: "voucherprintsettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "showagentmodule",
                table: "superusersettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "printreceiptsetting",
                table: "printingsettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "startreceiptno",
                table: "printingsettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "educationqual",
                table: "employeemaster",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "esicaccountno",
                table: "employeemaster",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "hoacno",
                table: "employeemaster",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "isleave",
                table: "employeemaster",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "lastincrementdate",
                table: "employeemaster",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "leavedate",
                table: "employeemaster",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "maritalstatus",
                table: "employeemaster",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "pfaccountno",
                table: "employeemaster",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "relation",
                table: "employeemaster",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "relativename",
                table: "employeemaster",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "savingaccountid",
                table: "employeemaster",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "station",
                table: "employeemaster",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "uanno",
                table: "employeemaster",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "accountagent",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    accountid = table.Column<int>(type: "integer", nullable: false),
                    acctype = table.Column<int>(type: "integer", nullable: false),
                    agentid = table.Column<int>(type: "integer", nullable: false),
                    fromdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    todate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_accountagent", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "agentlevel",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    parentlevelid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_agentlevel", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "agentmaster",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    agentlevelid = table.Column<int>(type: "integer", nullable: true),
                    phone = table.Column<string>(type: "text", nullable: false),
                    address = table.Column<string>(type: "text", nullable: false),
                    isactive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_agentmaster", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "empgrade",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_empgrade", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "employeeleaveallotment",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    employeeid = table.Column<int>(type: "integer", nullable: false),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    leavetype = table.Column<string>(type: "text", nullable: false),
                    noofdays = table.Column<int>(type: "integer", nullable: false),
                    allotmentdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_employeeleaveallotment", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "payrollsettings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    salaryaccid = table.Column<int>(type: "integer", nullable: false),
                    startdayofmonth = table.Column<int>(type: "integer", nullable: false),
                    daysinmonth = table.Column<int>(type: "integer", nullable: false),
                    cpfheadcode = table.Column<string>(type: "text", nullable: false),
                    rdheadcode = table.Column<string>(type: "text", nullable: false),
                    maxsalaryforpf = table.Column<decimal>(type: "numeric", nullable: false),
                    extraemployeepf = table.Column<bool>(type: "boolean", nullable: false),
                    extraemployerpf = table.Column<bool>(type: "boolean", nullable: false),
                    maxfpf = table.Column<decimal>(type: "numeric", nullable: false),
                    employeresicperc = table.Column<decimal>(type: "numeric", nullable: false),
                    esiclimit = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_payrollsettings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "payrollsettingsloancomp",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    payrollsettingsid = table.Column<int>(type: "integer", nullable: false),
                    loanproductid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_payrollsettingsloancomp", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "receiptnotracker",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    lastreceiptno = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_receiptnotracker", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "accountagent");

            migrationBuilder.DropTable(
                name: "agentlevel");

            migrationBuilder.DropTable(
                name: "agentmaster");

            migrationBuilder.DropTable(
                name: "empgrade");

            migrationBuilder.DropTable(
                name: "employeeleaveallotment");

            migrationBuilder.DropTable(
                name: "payrollsettings");

            migrationBuilder.DropTable(
                name: "payrollsettingsloancomp");

            migrationBuilder.DropTable(
                name: "receiptnotracker");

            migrationBuilder.DropColumn(
                name: "copies",
                table: "voucherprintsettings");

            migrationBuilder.DropColumn(
                name: "showagentmodule",
                table: "superusersettings");

            migrationBuilder.DropColumn(
                name: "printreceiptsetting",
                table: "printingsettings");

            migrationBuilder.DropColumn(
                name: "startreceiptno",
                table: "printingsettings");

            migrationBuilder.DropColumn(
                name: "educationqual",
                table: "employeemaster");

            migrationBuilder.DropColumn(
                name: "esicaccountno",
                table: "employeemaster");

            migrationBuilder.DropColumn(
                name: "hoacno",
                table: "employeemaster");

            migrationBuilder.DropColumn(
                name: "isleave",
                table: "employeemaster");

            migrationBuilder.DropColumn(
                name: "lastincrementdate",
                table: "employeemaster");

            migrationBuilder.DropColumn(
                name: "leavedate",
                table: "employeemaster");

            migrationBuilder.DropColumn(
                name: "maritalstatus",
                table: "employeemaster");

            migrationBuilder.DropColumn(
                name: "pfaccountno",
                table: "employeemaster");

            migrationBuilder.DropColumn(
                name: "relation",
                table: "employeemaster");

            migrationBuilder.DropColumn(
                name: "relativename",
                table: "employeemaster");

            migrationBuilder.DropColumn(
                name: "savingaccountid",
                table: "employeemaster");

            migrationBuilder.DropColumn(
                name: "station",
                table: "employeemaster");

            migrationBuilder.DropColumn(
                name: "uanno",
                table: "employeemaster");
        }
    }
}
