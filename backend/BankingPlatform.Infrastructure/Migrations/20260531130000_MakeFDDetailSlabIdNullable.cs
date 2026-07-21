using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    public partial class MakeFDDetailSlabIdNullable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_fdaccountdetail_fdinterestslab",
                table: "fdaccountdetail");

            migrationBuilder.AlterColumn<int>(
                name: "slabid",
                table: "fdaccountdetail",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "fk_fdaccountdetail_fdinterestslab",
                table: "fdaccountdetail",
                columns: new[] { "slabid", "branchid" },
                principalTable: "fdinterestslab",
                principalColumns: new[] { "id", "branchid" },
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_fdaccountdetail_fdinterestslab",
                table: "fdaccountdetail");

            migrationBuilder.AlterColumn<int>(
                name: "slabid",
                table: "fdaccountdetail",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldNullable: true,
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "fk_fdaccountdetail_fdinterestslab",
                table: "fdaccountdetail",
                columns: new[] { "slabid", "branchid" },
                principalTable: "fdinterestslab",
                principalColumns: new[] { "id", "branchid" },
                onDelete: ReferentialAction.Restrict);
        }
    }
}
