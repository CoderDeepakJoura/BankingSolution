using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    public partial class AddPayrollMasterTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "empgrade",
                columns: table => new
                {
                    id = table.Column<int>(nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(nullable: false),
                    code = table.Column<string>(maxLength: 20, nullable: false, defaultValue: ""),
                    description = table.Column<string>(maxLength: 150, nullable: false, defaultValue: "")
                },
                constraints: table => { table.PrimaryKey("pk_empgrade", x => x.id); });

            migrationBuilder.CreateTable(
                name: "payrollsettings",
                columns: table => new
                {
                    id = table.Column<int>(nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(nullable: false),
                    salaryaccid = table.Column<int>(nullable: false, defaultValue: 0),
                    startdayofmonth = table.Column<int>(nullable: false, defaultValue: 1),
                    daysinmonth = table.Column<int>(nullable: false, defaultValue: 0),
                    cpfheadcode = table.Column<string>(maxLength: 100, nullable: false, defaultValue: ""),
                    rdheadcode = table.Column<string>(maxLength: 100, nullable: false, defaultValue: ""),
                    maxsalaryforpf = table.Column<decimal>(type: "numeric(12,2)", nullable: false, defaultValue: 15000m),
                    extraemployeepf = table.Column<bool>(nullable: false, defaultValue: false),
                    extraemployerpf = table.Column<bool>(nullable: false, defaultValue: false),
                    maxfpf = table.Column<decimal>(type: "numeric(12,2)", nullable: false, defaultValue: 0m),
                    employeresicperc = table.Column<decimal>(type: "numeric(6,4)", nullable: false, defaultValue: 3.25m),
                    esiclimit = table.Column<decimal>(type: "numeric(12,2)", nullable: false, defaultValue: 21000m)
                },
                constraints: table => { table.PrimaryKey("pk_payrollsettings", x => x.id); });

            migrationBuilder.CreateTable(
                name: "payrollsettingsloancomp",
                columns: table => new
                {
                    id = table.Column<int>(nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid = table.Column<int>(nullable: false),
                    payrollsettingsid = table.Column<int>(nullable: false),
                    loanproductid = table.Column<int>(nullable: false)
                },
                constraints: table => { table.PrimaryKey("pk_payrollsettingsloancomp", x => x.id); });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "payrollsettingsloancomp");
            migrationBuilder.DropTable(name: "payrollsettings");
            migrationBuilder.DropTable(name: "empgrade");
        }
    }
}
