using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    public partial class AddOpeningBalanceToFDDetail : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "openingbalance",
                table: "fdaccountdetail",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "openingbalancetype",
                table: "fdaccountdetail",
                type: "character varying(5)",
                maxLength: 5,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "openingbalance", table: "fdaccountdetail");
            migrationBuilder.DropColumn(name: "openingbalancetype", table: "fdaccountdetail");
        }
    }
}
