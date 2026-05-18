using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIntCalcMethodToLoanProductDefinition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "intcalcmethod",
                table: "loanproductdefinition",
                type: "character varying(12)",
                maxLength: 12,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "auditlog",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(type: "integer", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    username = table.Column<string>(type: "text", nullable: false),
                    action = table.Column<string>(type: "text", nullable: false),
                    module = table.Column<string>(type: "text", nullable: false),
                    entityname = table.Column<string>(type: "text", nullable: false),
                    entityid = table.Column<string>(type: "text", nullable: true),
                    oldvalue = table.Column<string>(type: "text", nullable: true),
                    newvalue = table.Column<string>(type: "text", nullable: true),
                    ipaddress = table.Column<string>(type: "text", nullable: true),
                    workingdate = table.Column<string>(type: "text", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_auditlog", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "voucherrecintdetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    vacccrdrid = table.Column<int>(type: "integer", nullable: false),
                    voucherid = table.Column<int>(type: "integer", nullable: false),
                    voucherno = table.Column<int>(type: "integer", nullable: false),
                    entrydate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    valuedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    intcatid = table.Column<int>(type: "integer", nullable: false),
                    pamt = table.Column<double>(type: "double precision", nullable: true),
                    accid = table.Column<int>(type: "integer", nullable: false),
                    intdr = table.Column<double>(type: "double precision", nullable: false),
                    intcr = table.Column<double>(type: "double precision", nullable: false),
                    vouchermainstatus = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_voucherrecintdetail", x => new { x.id, x.brid });
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auditlog");

            migrationBuilder.DropTable(
                name: "voucherrecintdetail");

            migrationBuilder.DropColumn(
                name: "intcalcmethod",
                table: "loanproductdefinition");
        }
    }
}
