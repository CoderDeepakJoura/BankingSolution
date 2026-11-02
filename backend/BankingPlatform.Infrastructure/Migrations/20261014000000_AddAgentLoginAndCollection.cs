using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    public partial class AddAgentLoginAndCollection : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // agentlogin
            migrationBuilder.CreateTable(
                name: "agentlogin",
                columns: table => new
                {
                    id                  = table.Column<int>(type: "integer", nullable: false)
                                               .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid            = table.Column<int>(type: "integer", nullable: false),
                    agentmasterid       = table.Column<int>(type: "integer", nullable: false),
                    username            = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    passwordhash        = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    issuperagent        = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    isactive            = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    refreshtoken        = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    refreshtokenexpiry  = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    createdat           = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("agentlogin_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_agentlogin_username",
                table: "agentlogin",
                column: "username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_agentlogin_branch_agent",
                table: "agentlogin",
                columns: new[] { "branchid", "agentmasterid" });

            // agentcollection
            migrationBuilder.CreateTable(
                name: "agentcollection",
                columns: table => new
                {
                    id             = table.Column<int>(type: "integer", nullable: false)
                                          .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branchid       = table.Column<int>(type: "integer", nullable: false),
                    agentid        = table.Column<int>(type: "integer", nullable: false),
                    accountid      = table.Column<int>(type: "integer", nullable: false),
                    acctype        = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    amount         = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    collectiondate = table.Column<DateTime>(type: "date", nullable: false),
                    isposted       = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    voucherid      = table.Column<int>(type: "integer", nullable: true),
                    notes          = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    createdat      = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("agentcollection_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_agentcollection_agent_date",
                table: "agentcollection",
                columns: new[] { "agentid", "collectiondate" });

            migrationBuilder.CreateIndex(
                name: "ix_agentcollection_branch_date_type",
                table: "agentcollection",
                columns: new[] { "branchid", "collectiondate", "acctype" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "agentcollection");
            migrationBuilder.DropTable(name: "agentlogin");
        }
    }
}
