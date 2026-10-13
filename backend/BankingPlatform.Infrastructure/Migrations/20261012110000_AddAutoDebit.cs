using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    public partial class AddAutoDebit : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // SuperUserSettings — Telegram + auto-debit config columns
            migrationBuilder.AddColumn<string>(
                name: "telegramchatid",
                table: "superusersettings",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "enableautodebit",
                table: "superusersettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "autodebitrunhour",
                table: "superusersettings",
                type: "integer",
                nullable: false,
                defaultValue: 2);

            migrationBuilder.AddColumn<int>(
                name: "autodebitrunminute",
                table: "superusersettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "autodebitprocessrdkist",
                table: "superusersettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "autodebitprocessloanrecovery",
                table: "superusersettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            // autodebitaccount
            migrationBuilder.CreateTable(
                name: "autodebitaccount",
                columns: table => new
                {
                    id          = table.Column<int>(type: "integer", nullable: false)
                                       .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid    = table.Column<int>(type: "integer", nullable: false),
                    accountid   = table.Column<int>(type: "integer", nullable: false),
                    accounttype = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    isactive    = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    createdat   = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    notes       = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("autodebitaccount_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_autodebitaccount_branch_account",
                table: "autodebitaccount",
                columns: new[] { "branchid", "accountid", "accounttype" },
                unique: true);

            // autodebitrun
            migrationBuilder.CreateTable(
                name: "autodebitrun",
                columns: table => new
                {
                    id            = table.Column<int>(type: "integer", nullable: false)
                                         .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid      = table.Column<int>(type: "integer", nullable: false),
                    rundate       = table.Column<DateTime>(type: "date", nullable: false),
                    starttime     = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    endtime       = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    totalaccounts = table.Column<int>(type: "integer", nullable: false),
                    successcount  = table.Column<int>(type: "integer", nullable: false),
                    failcount     = table.Column<int>(type: "integer", nullable: false),
                    status        = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    telegramsent  = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("autodebitrun_pkey", x => x.id);
                });

            // autodebitrundetail
            migrationBuilder.CreateTable(
                name: "autodebitrundetail",
                columns: table => new
                {
                    id           = table.Column<int>(type: "integer", nullable: false)
                                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    runid        = table.Column<int>(type: "integer", nullable: false),
                    branchid     = table.Column<int>(type: "integer", nullable: false),
                    accountid    = table.Column<int>(type: "integer", nullable: false),
                    accounttype  = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    accountno    = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    accountname  = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    amount       = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    status       = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    errormessage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    voucherid    = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("autodebitrundetail_pkey", x => x.id);
                    table.ForeignKey(
                        name: "fk_autodebitrundetail_run",
                        column: x => x.runid,
                        principalTable: "autodebitrun",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_autodebitrundetail_runid",
                table: "autodebitrundetail",
                column: "runid");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "autodebitrundetail");
            migrationBuilder.DropTable(name: "autodebitrun");
            migrationBuilder.DropTable(name: "autodebitaccount");

            migrationBuilder.DropColumn(name: "telegramchatid",              table: "superusersettings");
            migrationBuilder.DropColumn(name: "enableautodebit",             table: "superusersettings");
            migrationBuilder.DropColumn(name: "autodebitrunhour",            table: "superusersettings");
            migrationBuilder.DropColumn(name: "autodebitrunminute",          table: "superusersettings");
            migrationBuilder.DropColumn(name: "autodebitprocessrdkist",      table: "superusersettings");
            migrationBuilder.DropColumn(name: "autodebitprocessloanrecovery",table: "superusersettings");
        }
    }
}
