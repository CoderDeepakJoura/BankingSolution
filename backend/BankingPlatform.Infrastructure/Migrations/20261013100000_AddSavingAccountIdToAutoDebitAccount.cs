using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    public partial class AddSavingAccountIdToAutoDebitAccount : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "savingaccountid",
                table: "autodebitaccount",
                type: "integer",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "savingaccountid",
                table: "autodebitaccount");
        }
    }
}
