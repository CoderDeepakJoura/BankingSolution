using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNPATables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "npaplanmaster",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    brid = table.Column<int>(type: "integer", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ishoupdated = table.Column<short>(type: "smallint", nullable: true),
                    calnpadate = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    ovrduePeriodorinst = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    calnpafromloandate = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_npaplanmaster", x => new { x.id, x.brid });
                });

            migrationBuilder.CreateTable(
                name: "npaplancategory",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
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
                    allprinoverdue = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_npaplancategory", x => new { x.id, x.brid });
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "npaplanmaster");
            migrationBuilder.DropTable(name: "npaplancategory");
        }
    }
}
