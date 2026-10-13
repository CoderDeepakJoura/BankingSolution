using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPenaltyAmountToInterBranchVoucher : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "penaltyamount",
                table: "interbranchvoucher",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "penaltyamount",
                table: "interbranchvoucher");
        }
    }
}
