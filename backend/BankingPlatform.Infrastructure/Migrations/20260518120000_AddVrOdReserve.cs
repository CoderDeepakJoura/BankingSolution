using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVrOdReserve : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "vrodreserve",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    vacccrdrid = table.Column<int>(type: "integer", nullable: true),
                    voucherid = table.Column<int>(type: "integer", nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    accid = table.Column<int>(type: "integer", nullable: false),
                    debit = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    credit = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    productid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_vrodreserve", x => new { x.id, x.brid });
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "vrodreserve");
        }
    }
}
