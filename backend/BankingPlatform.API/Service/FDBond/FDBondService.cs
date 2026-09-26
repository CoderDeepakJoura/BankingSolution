using BankingPlatform.Infrastructure.DbContexts;
using BankingPlatform.Infrastructure.Models.AccMasters;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace BankingPlatform.API.Service.FDBond
{
    public record FDBondDetailDTO(
        int FdDetailId,
        int AccountId,
        string AccountNo,
        decimal FdAmount,
        DateTime FdDate,
        DateTime MaturityDate,
        decimal MaturityAmount,
        decimal IntRate,
        int PeriodMonths,
        int PeriodDays,
        int LtdNo,
        int FdStatus
    );

    public class FDBondService
    {
        private readonly BankingDbContext _db;
        public FDBondService(BankingDbContext db) => _db = db;

        public async Task<List<FDBondDetailDTO>> GetFdDetailsForAccountAsync(int branchId, int accountId)
        {
            var acc = await _db.accountmaster.AsNoTracking()
                .FirstOrDefaultAsync(a => a.ID == accountId && a.BranchId == branchId);
            if (acc == null) return new();

            var details = await _db.fdaccountdetail.AsNoTracking()
                .Where(d => d.AccountId == accountId && d.BranchId == branchId)
                .OrderByDescending(d => d.Id)
                .ToListAsync();

            return details.Select(d => new FDBondDetailDTO(
                d.Id, accountId,
                $"{acc.AccPrefix}-{acc.AccSuffix}",
                d.FDAmount, d.FDDate, d.FDMaturityDate, d.MaturityAmount,
                d.IntRate, d.FDPeriodMonths, d.FDPeriodDays, d.LTDNo, d.FDStatus
            )).ToList();
        }

        public async Task<byte[]?> GenerateBondAsync(int branchId, int fdDetailId)
        {
            var fdDetail = await _db.fdaccountdetail.AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == fdDetailId && d.BranchId == branchId);
            if (fdDetail == null) return null;

            var account = await _db.accountmaster.AsNoTracking()
                .FirstOrDefaultAsync(a => a.ID == fdDetail.AccountId && a.BranchId == branchId);
            if (account == null) return null;

            var member = account.MemberId.HasValue
                ? await _db.member.AsNoTracking()
                    .FirstOrDefaultAsync(m => m.Id == account.MemberId.Value && m.BranchId == (account.MemberBranchID ?? branchId))
                : null;

            var nominee = await _db.accountnomineeinfo.AsNoTracking()
                .Where(n => n.AccountId == fdDetail.AccountId && n.BranchId == branchId)
                .OrderBy(n => n.Id)
                .FirstOrDefaultAsync();

            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            string accountNo = $"{account.AccPrefix}-{account.AccSuffix}";
            string memberName = member?.MemberName ?? account.AccountName ?? "";
            string relativeName = member?.RelativeName ?? account.RelativeName ?? "";
            int relationId = member?.RelationId ?? 0;
            string relationLabel = relationId switch { 1 => "S/O", 2 => "D/O", 3 => "W/O", 4 => "H/O", _ => "C/O" };
            string fullName = string.IsNullOrWhiteSpace(relativeName)
                ? memberName
                : $"{memberName} {relationLabel} {relativeName}";
            string memberNo = member?.PermanentMembershipNo ?? member?.NominalMembershipNo ?? "—";
            string memberAddress = account.AddressLine ?? "";
            int memberType = member?.MemberType ?? 0;
            string customerType = memberType == 1 ? "Nominal Member" : "Permanent Member";
            string nomineeName = nominee?.NomineeName ?? "—";
            string branchName = branch?.branchmaster_name ?? "";
            string branchAddress = branch?.branchmaster_addressline ?? "";
            string branchCode = branch?.branchmaster_code ?? "";

            string period = fdDetail.FDPeriodDays > 0
                ? $"{fdDetail.FDPeriodDays} Days"
                : $"{fdDetail.FDPeriodMonths} Months";

            return BuildPdf(
                branchName, branchAddress, branchCode,
                fdDetail.LTDNo, fdDetail.FDDate,
                fullName, memberNo, accountNo, nomineeName, memberAddress, customerType,
                fdDetail.FDAmount, fdDetail.FDDate, fdDetail.IntRate, period,
                fdDetail.FDMaturityDate, fdDetail.MaturityAmount
            );
        }

        private static byte[] BuildPdf(
            string branchName, string branchAddress, string branchCode,
            int receiptNo, DateTime receiptDate,
            string memberName, string memberNo, string accountNo, string nominee,
            string address, string customerType,
            decimal depositAmount, DateTime depositDate, decimal intRate, string period,
            DateTime maturityDate, decimal maturityAmount)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            const string Blue    = "#1e40af";
            const string Gray    = "#374151";
            const string LtGray  = "#6b7280";
            const string Border  = "#d1d5db";
            const string PageBg  = "#f3f4f6";
            const string LabelBg = "#e5e7eb";
            const string White   = "#ffffff";
            const string MatBg   = "#eef2ff";

            string amtStr   = "₹" + depositAmount.ToString("N2");
            string matStr   = "₹" + maturityAmount.ToString("N2");
            string matWords = "Rupees " + NumberToWords((long)Math.Floor(maturityAmount)) + " Only";

            IContainer LabelCell(IContainer c) =>
                c.Background(LabelBg).BorderBottom(0.5f).BorderRight(0.5f).BorderColor(Border).Padding(4);
            IContainer ValueCell(IContainer c) =>
                c.Background(White).BorderBottom(0.5f).BorderRight(0.5f).BorderColor(Border).Padding(4);

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.ContinuousSize(PageSizes.A4.Width);
                    page.Margin(0);
                    page.Background(PageBg);
                    page.Content().Padding(12).Column(col =>
                    {
                        // ── Header ───────────────────────────────────────
                        col.Item().Background(White).BorderBottom(1).BorderColor(Blue)
                            .PaddingHorizontal(14).PaddingVertical(10).Row(r =>
                        {
                            r.RelativeItem().Column(c =>
                            {
                                c.Item().Text(branchName).FontSize(13).Bold().FontColor(Blue);
                                c.Item().Text(branchAddress).FontSize(8).FontColor(LtGray);
                            });
                            r.ConstantItem(220).AlignRight().Column(c =>
                            {
                                c.Item().Text("FIXED DEPOSIT RECEIPT").FontSize(12).Bold().FontColor(Blue);
                                c.Item().Text($"Branch Code: {branchCode}").FontSize(8).FontColor(LtGray);
                            });
                        });

                        // ── Receipt No + Date ─────────────────────────────
                        col.Item().Background(LabelBg).BorderBottom(0.5f).BorderColor(Border)
                            .PaddingHorizontal(14).PaddingVertical(5).Row(r =>
                        {
                            r.RelativeItem().Text($"Receipt No: {receiptNo}").FontSize(9).Bold().FontColor(Gray);
                            r.ConstantItem(200).AlignRight().Text($"Date: {receiptDate:dd-MMM-yyyy}").FontSize(9).FontColor(Gray);
                        });

                        col.Item().Background(White).PaddingHorizontal(14).PaddingTop(10).Column(body =>
                        {
                            // ── DEPOSITOR / MEMBER DETAILS ────────────────
                            body.Item().PaddingBottom(4)
                                .Text("DEPOSITOR / MEMBER DETAILS").FontSize(9).Bold().FontColor(Blue);

                            body.Item().Border(0.5f).BorderColor(Border).Table(t =>
                            {
                                t.ColumnsDefinition(c => { c.RelativeColumn(3); c.RelativeColumn(4); c.RelativeColumn(3); c.RelativeColumn(4); });

                                t.Cell().Element(LabelCell).Text("Member Name").FontSize(8).FontColor(LtGray);
                                t.Cell().ColumnSpan(3).Element(ValueCell).Text(memberName).FontSize(8).Bold().FontColor(Gray);

                                t.Cell().Element(LabelCell).Text("Member No.").FontSize(8).FontColor(LtGray);
                                t.Cell().Element(ValueCell).Text(memberNo).FontSize(8).Bold().FontColor(Gray);
                                t.Cell().Element(LabelCell).Text("A/C / FD No.").FontSize(8).FontColor(LtGray);
                                t.Cell().Element(ValueCell).Text(accountNo).FontSize(8).Bold().FontColor(Blue);

                                t.Cell().Element(LabelCell).Text("Nominee").FontSize(8).FontColor(LtGray);
                                t.Cell().Element(ValueCell).Text(nominee).FontSize(8).Bold().FontColor(Gray);
                                t.Cell().Element(LabelCell).Text("Customer Type").FontSize(8).FontColor(LtGray);
                                t.Cell().Element(ValueCell).Text(customerType).FontSize(8).Bold().FontColor(Gray);

                                t.Cell().Element(LabelCell).Text("Address").FontSize(8).FontColor(LtGray);
                                t.Cell().ColumnSpan(3).Element(ValueCell).Text(address).FontSize(8).FontColor(Gray);
                            });

                            body.Item().PaddingTop(10);

                            // ── DEPOSIT DETAILS ───────────────────────────
                            body.Item().PaddingBottom(4)
                                .Text("DEPOSIT DETAILS").FontSize(9).Bold().FontColor(Blue);

                            body.Item().Border(0.5f).BorderColor(Border).Table(t =>
                            {
                                t.ColumnsDefinition(c => { c.RelativeColumn(1); c.RelativeColumn(2); c.RelativeColumn(1); c.RelativeColumn(2); });

                                t.Cell().Element(LabelCell).Text("Deposit Amount").FontSize(8).FontColor(LtGray);
                                t.Cell().Element(ValueCell).Text(amtStr).FontSize(8).Bold().FontColor(Gray);
                                t.Cell().Element(LabelCell).Text("Deposit Date").FontSize(8).FontColor(LtGray);
                                t.Cell().Element(ValueCell).Text(depositDate.ToString("dd-MMM-yyyy")).FontSize(8).Bold().FontColor(Gray);

                                t.Cell().Element(LabelCell).Text("Interest Rate").FontSize(8).FontColor(LtGray);
                                t.Cell().Element(ValueCell).Text($"{intRate:F2}% p.a.").FontSize(8).Bold().FontColor(Gray);
                                t.Cell().Element(LabelCell).Text("Deposit Period").FontSize(8).FontColor(LtGray);
                                t.Cell().Element(ValueCell).Text(period).FontSize(8).Bold().FontColor(Gray);

                                t.Cell().Element(LabelCell).Text("Maturity Date").FontSize(8).FontColor(LtGray);
                                t.Cell().ColumnSpan(3).Element(ValueCell).Text(maturityDate.ToString("dd-MMM-yyyy")).FontSize(8).Bold().FontColor(Gray);
                            });

                            body.Item().PaddingTop(10);

                            // ── MATURITY VALUE ────────────────────────────
                            body.Item().Background(MatBg).Border(1).BorderColor(Blue).Padding(10).Row(r =>
                            {
                                r.RelativeItem().Column(c =>
                                {
                                    c.Item().Text("MATURITY VALUE").FontSize(8).Bold().FontColor(LtGray);
                                    c.Item().Text(matStr).FontSize(20).Bold().FontColor(Blue);
                                    c.Item().Text(matWords).FontSize(8).Italic().FontColor(LtGray);
                                });
                            });

                            body.Item().PaddingTop(6)
                                .Text("Terms & Conditions: This Fixed Deposit is subject to the rules and regulations of the society. Interest is subject to TDS as per applicable income tax rules. Premature withdrawal may attract penalty.")
                                .FontSize(7).Italic().FontColor(LtGray);

                            body.Item().PaddingTop(14).PaddingBottom(14).Row(r =>
                            {
                                r.RelativeItem().Column(c =>
                                {
                                    c.Item().PaddingBottom(20).Text(" ");
                                    c.Item().BorderTop(0.5f).BorderColor(Border).PaddingTop(4)
                                        .Text("Customer Signature").FontSize(8).FontColor(LtGray);
                                });
                                r.ConstantItem(40);
                                r.RelativeItem().Column(c =>
                                {
                                    c.Item().PaddingBottom(20).Text(" ");
                                    c.Item().BorderTop(0.5f).BorderColor(Border).PaddingTop(4)
                                        .AlignRight().Text("Authorized Signatory").FontSize(8).FontColor(LtGray);
                                });
                            });
                        });

                        // ── Footer ────────────────────────────────────────
                        col.Item().Background(White).BorderTop(0.5f).BorderColor(Border)
                            .PaddingHorizontal(14).PaddingVertical(5)
                            .Text("Computer Generated Fixed Deposit Receipt  |  Customer Copy")
                            .FontSize(7).FontColor(LtGray).AlignCenter();
                    });
                });
            }).GeneratePdf();
        }

        private static string NumberToWords(long number)
        {
            if (number == 0) return "Zero";
            if (number < 0) return "Minus " + NumberToWords(-number);
            string[] ones = { "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
                              "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
                              "Seventeen", "Eighteen", "Nineteen" };
            string[] tens = { "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };
            string words = "";
            if (number >= 10000000) { words += NumberToWords(number / 10000000) + " Crore "; number %= 10000000; }
            if (number >= 100000)   { words += NumberToWords(number / 100000)   + " Lakh ";  number %= 100000; }
            if (number >= 1000)     { words += NumberToWords(number / 1000)     + " Thousand "; number %= 1000; }
            if (number >= 100)      { words += ones[number / 100] + " Hundred "; number %= 100; }
            if (number >= 20)       { words += tens[number / 10]; number %= 10; if (number > 0) words += "-" + ones[number]; }
            else if (number > 0)    { words += ones[number]; }
            return words.Trim();
        }
    }
}
