using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    public partial class AddDaysInAYearToSavingBranchWiseRule : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "daysinayear",
                table: "savingproductbranchwiserule",
                type: "integer",
                nullable: false,
                defaultValue: 365);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "daysinayear", table: "savingproductbranchwiserule");
        }
    }
}
