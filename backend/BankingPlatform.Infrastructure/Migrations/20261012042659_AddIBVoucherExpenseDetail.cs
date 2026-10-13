using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BankingPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIBVoucherExpenseDetail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ibvoucherexpensedetail",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ibvoucherid = table.Column<int>(type: "integer", nullable: false),
                    loanproductid = table.Column<int>(type: "integer", nullable: false),
                    expensecategoryid = table.Column<int>(type: "integer", nullable: false),
                    expenseamount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    totaltax = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    netamount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    remarks = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    craccounttypeid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ibvoucherexpensedetail", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ibvoucherexpensedetail");
        }
    }
}
