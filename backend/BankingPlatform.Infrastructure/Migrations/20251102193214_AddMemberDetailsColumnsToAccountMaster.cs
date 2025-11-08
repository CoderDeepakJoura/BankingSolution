using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberDetailsColumnsToAccountMaster : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ✅ ONLY add the 6 columns to existing accountmaster table
            // DO NOT create any new tables

            migrationBuilder.AddColumn<string>(
                name: "relativename",
                table: "accountmaster",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "gender",
                table: "accountmaster",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "phoneno1",
                table: "accountmaster",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "email",
                table: "accountmaster",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "addressline",
                table: "accountmaster",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "dob",
                table: "accountmaster",
                type: "timestamp without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ✅ Remove the columns we added
            migrationBuilder.DropColumn(
                name: "relativename",
                table: "accountmaster");

            migrationBuilder.DropColumn(
                name: "gender",
                table: "accountmaster");

            migrationBuilder.DropColumn(
                name: "phoneno1",
                table: "accountmaster");

            migrationBuilder.DropColumn(
                name: "email",
                table: "accountmaster");

            migrationBuilder.DropColumn(
                name: "addressline",
                table: "accountmaster");

            migrationBuilder.DropColumn(
                name: "dob",
                table: "accountmaster");
        }
    }
}
