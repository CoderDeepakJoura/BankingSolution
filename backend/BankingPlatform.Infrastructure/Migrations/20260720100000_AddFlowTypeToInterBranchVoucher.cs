using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    public partial class AddFlowTypeToInterBranchVoucher : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "flowtype",
                table: "interbranchvoucher",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "BranchToBranch");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "flowtype",
                table: "interbranchvoucher");
        }
    }
}
