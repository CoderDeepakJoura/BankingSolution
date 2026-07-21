using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    public partial class AddLastSeenVersionToUser : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "lastseenversion",
                table: "user",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "0.0.0");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "lastseenversion",
                table: "user");
        }
    }
}
