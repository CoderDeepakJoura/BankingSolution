using BankingPlatform.Infrastructure.DbContexts;
using BankingPlatform.Infrastructure.Models.Settings;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace BankingPlatform.API.Service.Receipt
{
    public class ReceiptService
    {
        private readonly BankingDbContext _db;
        public ReceiptService(BankingDbContext db) => _db = db;

        // voucherType/subType combinations supported:
        //   2/2  = Saving Deposit
        //   5/10 = Loan Recovery
        //   4/8  = RD Kist
        //   4/16 = RD Multiple Kist
        public async Task<(byte[] Pdf, int ReceiptNo)?> GenerateReceiptAsync(int branchId, int voucherType, int voucherSubType, int voucherNo)
        {
            // OrderByDescending so that if multiple sessions share the same voucherNo, we get the latest
            var voucher = await _db.voucher.AsNoTracking()
                .Where(v => v.BrID == branchId && v.VoucherNo == voucherNo
                    && v.VoucherType == voucherType && v.VoucherSubType == voucherSubType)
                .OrderByDescending(v => v.VoucherDate)
                .FirstOrDefaultAsync();
            if (voucher == null) return null;

            // Compute next receipt number: MAX(lastFromTable + 1, startReceiptNoFrom)
            var tracker = await _db.receiptnotracker.FirstOrDefaultAsync(r => r.brid == branchId);
            var printSettings = await _db.printingsettings.FirstOrDefaultAsync(p => p.branchid == branchId);
            int startFrom = printSettings?.startReceiptNoFrom ?? 1;
            int lastFromTable = tracker?.lastReceiptNo ?? 0;
            int nextReceiptNo = Math.Max(lastFromTable + 1, startFrom);

            if (tracker == null)
                _db.receiptnotracker.Add(new ReceiptNoTracker { brid = branchId, lastReceiptNo = nextReceiptNo });
            else
                tracker.lastReceiptNo = nextReceiptNo;
            await _db.SaveChangesAsync();

            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            // For loan recovery the customer account is on the Dr side; for all others it's Cr
            bool isLoanRecovery = voucherType == 5 && voucherSubType == 10;
            string customerSide = isLoanRecovery ? "Dr" : "Cr";

            var customerEntry = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(d => d.VoucherID == voucher.Id && d.BrId == branchId && d.VoucherEntryType == customerSide)
                .FirstOrDefaultAsync();

            string memberName = "";
            string accountDisplay = "";
            if (customerEntry != null)
            {
                var account = await _db.accountmaster.AsNoTracking()
                    .FirstOrDefaultAsync(a => a.ID == customerEntry.AccountId && a.BranchId == branchId);
                if (account != null)
                {
                    // Loan recovery: show account number; others: show prefix/suffix
                    if (isLoanRecovery)
                        accountDisplay = account.AccountNumber ?? "";
                    else
                        accountDisplay = !string.IsNullOrWhiteSpace(account.AccPrefix)
                            ? $"{account.AccPrefix}/{account.AccSuffix}"
                            : account.AccountNumber ?? "";

                    if (account.MemberId.HasValue)
                    {
                        var member = await _db.member.AsNoTracking()
                            .FirstOrDefaultAsync(m => m.Id == account.MemberId.Value && m.BranchId == (account.MemberBranchID ?? branchId));
                        memberName = member?.MemberName ?? account.AccountName ?? "";
                    }
                    else
                    {
                        memberName = account.AccountName ?? "";
                    }
                }
            }

            // Sum all credit amounts as the receipt amount
            var entries = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(d => d.VoucherID == voucher.Id && d.BrId == branchId)
                .ToListAsync();

            decimal amount = entries
                .Where(d => d.VoucherEntryType == "Cr")
                .Sum(d => d.VoucherAmount);

            string onAccountOf = (voucherType, voucherSubType) switch
            {
                (2, 2)   => "SAVING DEPOSIT",
                (5, 10)  => "LOAN RECOVERY",
                (4, 8)   => "RD KIST",
                (4, 16)  => "RD MULTIPLE KIST",
                _        => "TRANSACTION"
            };

            string branchName    = branch?.branchmaster_name ?? "";
            string branchAddress = branch?.branchmaster_addressline ?? "";

            var pdf = BuildPdf(branchName, branchAddress, nextReceiptNo, voucher.VoucherDate,
                memberName, accountDisplay, amount, onAccountOf);
            return (pdf, nextReceiptNo);
        }

        private static byte[] BuildPdf(
            string branchName, string branchAddress,
            int receiptNo, DateTime receiptDate,
            string memberName, string accountDisplay,
            decimal amount, string onAccountOf)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            const string HeaderBg   = "#7f1d1d";
            const string HeaderText = "#ffffff";
            const string Border     = "#b91c1c";
            const string LabelBg   = "#fef2f2";
            const string White      = "#ffffff";
            const string Dark       = "#1f2937";
            const string Gray       = "#6b7280";

            string amountStr   = amount.ToString("N2");
            string amountWords = "Rupees " + NumberToWords((long)Math.Floor(amount)) + " Only";
            string nameWithAcc = string.IsNullOrWhiteSpace(accountDisplay)
                ? memberName
                : $"{memberName}  ({accountDisplay})";

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.ContinuousSize(PageSizes.A5.Width * 1.2f);
                    page.Margin(0);
                    page.Background(White);

                    page.Content().Border(2).BorderColor(Border).Column(col =>
                    {
                        // ── Header ────────────────────────────────────────
                        col.Item().Background(HeaderBg).PaddingVertical(14).PaddingHorizontal(24).Column(h =>
                        {
                            h.Item().AlignCenter().Text(branchName)
                                .FontSize(13).Bold().FontColor(HeaderText);
                            h.Item().PaddingTop(4).AlignCenter().Text("Co. op. Thrift & Credit Society Ltd.")
                                .FontSize(8.5f).FontColor("#fca5a5");
                            h.Item().PaddingTop(2).AlignCenter().Text(branchAddress)
                                .FontSize(8f).FontColor("#fca5a5");
                        });

                        // ── Receipt No + Date ─────────────────────────────
                        col.Item().Background(LabelBg).BorderBottom(1).BorderColor(Border)
                            .PaddingHorizontal(24).PaddingVertical(8).Row(r =>
                        {
                            r.RelativeItem().Text($"Receipt No: {receiptNo}")
                                .FontSize(9.5f).Bold().FontColor(Dark);
                            r.AutoItem().Text($"Date: {receiptDate:dd-MMM-yyyy}")
                                .FontSize(9.5f).FontColor(Gray);
                        });

                        // ── Body ──────────────────────────────────────────
                        col.Item().Background(White).PaddingHorizontal(24).PaddingVertical(20).Column(body =>
                        {
                            body.Item().PaddingBottom(6).Text("Received with thanks from")
                                .FontSize(9f).FontColor(Gray);
                            body.Item().PaddingBottom(24).BorderBottom(0.5f).BorderColor("#d1d5db")
                                .PaddingBottom(6)
                                .Text(nameWithAcc).FontSize(10f).Bold().FontColor(Dark);

                            body.Item().PaddingBottom(6).Text("The sum of Rupees")
                                .FontSize(9f).FontColor(Gray);
                            body.Item().PaddingBottom(24).BorderBottom(0.5f).BorderColor("#d1d5db")
                                .PaddingBottom(6)
                                .Text(amountWords).FontSize(10f).Bold().FontColor(Dark);

                            // Single line: label gray + value bold dark
                            body.Item().PaddingBottom(28).Text(t =>
                            {
                                t.Span("on account of  ").FontSize(9.5f).FontColor(Gray);
                                t.Span(onAccountOf).FontSize(10f).Bold().FontColor(Dark);
                            });

                            // Amount box + Signature row
                            body.Item().Row(r =>
                            {
                                r.ConstantItem(130).Border(1).BorderColor(Border)
                                    .PaddingHorizontal(10).PaddingVertical(10).Column(box =>
                                {
                                    box.Item().Text("Rs.").FontSize(8).FontColor(Gray);
                                    box.Item().PaddingTop(4).Text($"Rs. {amountStr}").FontSize(13).Bold().FontColor(Dark);
                                });

                                r.RelativeItem();

                                r.ConstantItem(150).AlignRight().Column(sig =>
                                {
                                    sig.Item().Height(36);
                                    sig.Item().BorderTop(0.5f).BorderColor(Gray)
                                        .PaddingTop(4).AlignCenter()
                                        .Text("Authorised Signatory").FontSize(8).FontColor(Gray);
                                });
                            });

                            body.Item().Height(10);
                        });
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
            if (number >= 20)       { words += tens[number / 10]; number %= 10; if (number > 0) words += " "; }
            if (number > 0)         { words += ones[number]; }

            return words.Trim();
        }
    }
}
