using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    public partial class AddEntryTypeToLoanBalanceDetail : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "entrytype",
                table: "loanaccountbalancedetail",
                type: "character varying(5)",
                maxLength: 5,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "entrytype",
                table: "loanaccountbalancedetail");
        }
    }
}
