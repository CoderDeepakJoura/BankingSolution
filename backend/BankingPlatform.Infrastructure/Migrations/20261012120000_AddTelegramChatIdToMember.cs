using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    public partial class AddTelegramChatIdToMember : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "telegramchatid",
                table: "member",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "telegramchatid",
                table: "member");
        }
    }
}
