using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Settings;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace BankingPlatform.API.Service.VoucherPrint
{
    public record VoucherPrintSettingDTO(int VoucherType, int VoucherSubType, bool IsEnabled, int Copies = 1);

    public record VoucherSummaryDTO(
        int VoucherId, int VoucherNo, DateTime VoucherDate,
        int VoucherType, int VoucherSubType,
        string TypeLabel, string Prefix,
        decimal Amount, string Status
    );

    public class VoucherPrintService
    {
        private readonly BankingDbContext _db;

        public VoucherPrintService(BankingDbContext db) => _db = db;

        // ── Settings CRUD ─────────────────────────────────────────────────────
        public async Task<List<VoucherPrintSettingDTO>> GetSettingsAsync(int branchId)
        {
            var rows = await _db.voucherprintsettings.AsNoTracking()
                .Where(s => s.BranchId == branchId)
                .ToListAsync();

            return rows.Select(s => new VoucherPrintSettingDTO(s.VoucherType, s.VoucherSubType, s.IsEnabled, s.Copies))
                       .ToList();
        }

        public async Task SaveSettingsAsync(int branchId, List<VoucherPrintSettingDTO> settings)
        {
            var existing = await _db.voucherprintsettings
                .Where(s => s.BranchId == branchId)
                .ToListAsync();

            _db.voucherprintsettings.RemoveRange(existing);

            var newRows = settings.Select(s => new VoucherPrintSettings
            {
                BranchId = branchId,
                VoucherType = s.VoucherType,
                VoucherSubType = s.VoucherSubType,
                IsEnabled = s.IsEnabled,
                Copies = s.Copies < 1 ? 1 : s.Copies
            });

            await _db.voucherprintsettings.AddRangeAsync(newRows);
            await _db.SaveChangesAsync();
        }

        // ── Voucher Search ────────────────────────────────────────────────────
        public async Task<List<VoucherSummaryDTO>> SearchVouchersAsync(
            int branchId, DateTime fromDate, DateTime toDate,
            int voucherType = 0, int voucherSubType = 0, int voucherNo = 0)
        {
            var printableTypes = new HashSet<(int, int)>
            {
                (1,1),(2,2),(2,3),(2,29),(3,2),(3,4),(3,5),(3,6),(3,7),
                (4,8),(4,16),(5,9),(5,10),(5,14),(6,11),(7,12)
            };

            var query = _db.voucher.AsNoTracking()
                .Where(v => v.BrID == branchId
                         && v.VoucherDate >= fromDate.Date
                         && v.VoucherDate < toDate.Date.AddDays(1));

            if (voucherType > 0)
                query = query.Where(v => v.VoucherType == voucherType);

            if (voucherSubType > 0)
                query = query.Where(v => v.VoucherSubType == voucherSubType);

            if (voucherNo > 0)
                query = query.Where(v => v.VoucherNo == voucherNo);

            var vouchers = await query
                .OrderByDescending(v => v.VoucherDate)
                .ThenByDescending(v => v.VoucherNo)
                .ToListAsync();

            vouchers = vouchers
                .Where(v => printableTypes.Contains((v.VoucherType, v.VoucherSubType)))
                .ToList();

            var ids = vouchers.Select(v => v.Id).ToList();
            var amountMap = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(d => ids.Contains(d.VoucherID) && d.BrId == branchId && d.VoucherEntryType == "Dr")
                .GroupBy(d => d.VoucherID)
                .Select(g => new { VoucherId = g.Key, Total = g.Sum(d => d.VoucherAmount) })
                .ToDictionaryAsync(x => x.VoucherId, x => x.Total);

            return vouchers.Select(v =>
            {
                var (label, prefix) = GetVoucherTypeInfo(v.VoucherType, v.VoucherSubType);
                return new VoucherSummaryDTO(
                    v.Id, v.VoucherNo, v.VoucherDate,
                    v.VoucherType, v.VoucherSubType,
                    label, prefix,
                    amountMap.TryGetValue(v.Id, out var amt) ? amt : 0m,
                    v.VoucherStatus
                );
            }).ToList();
        }

        // ── PDF Generation ────────────────────────────────────────────────────
        public async Task<(byte[] Pdf, string Filename)> GeneratePdfAsync(int branchId, int voucherType, int voucherSubType, int voucherNo, int copies = 1, DateTime? voucherDate = null)
        {
            var query = _db.voucher.AsNoTracking()
                .Where(v => v.BrID == branchId
                    && v.VoucherNo == voucherNo
                    && v.VoucherType == voucherType
                    && v.VoucherSubType == voucherSubType);

            if (voucherDate.HasValue)
                query = query.Where(v => v.VoucherDate.Date == voucherDate.Value.Date);

            var voucher = await query.OrderByDescending(v => v.Id).FirstOrDefaultAsync();

            if (voucher == null)
                throw new InvalidOperationException($"Voucher not found (BrId={branchId}, Type={voucherType}, SubType={voucherSubType}, No={voucherNo}).");

            var details = await _db.vouchercreditdebitdetails.AsNoTracking()
                .Where(d => d.VoucherID == voucher.Id && d.BrId == branchId)
                .OrderBy(d => d.VoucherSeqNo)
                .ToListAsync();

            var accountIds = details.Select(d => d.AccountId).Distinct().ToList();

            // Extended account info: name, number, type, product
            var accountRaw = await _db.accountmaster.AsNoTracking()
                .Where(a => accountIds.Contains(a.ID))
                .Select(a => new { a.ID, a.AccountName, a.AccountNumber, a.AccPrefix, a.AccSuffix, a.AccTypeId, a.GeneralProductId })
                .ToListAsync();

            // Fetch product names for Saving/General/ShareMoney (2,3,4)
            var savingProductIds = accountRaw
                .Where(a => a.AccTypeId is 2 or 3 or 4 && a.GeneralProductId.HasValue)
                .Select(a => a.GeneralProductId!.Value).Distinct().ToList();
            var savingProductMap = savingProductIds.Any()
                ? (await _db.savingproduct.AsNoTracking()
                    .Where(p => savingProductIds.Contains(p.Id) && p.BranchId == branchId)
                    .ToListAsync()).GroupBy(p => p.Id).ToDictionary(g => g.Key, g => g.First().ProductName)
                : new Dictionary<int, string>();

            // Fetch product names for FD (6)
            var fdProductIds = accountRaw
                .Where(a => a.AccTypeId == 6 && a.GeneralProductId.HasValue)
                .Select(a => a.GeneralProductId!.Value).Distinct().ToList();
            var fdProductMap = fdProductIds.Any()
                ? (await _db.fdproduct.AsNoTracking()
                    .Where(p => fdProductIds.Contains(p.Id) && p.BranchId == branchId)
                    .ToListAsync()).GroupBy(p => p.Id).ToDictionary(g => g.Key, g => g.First().ProductName)
                : new Dictionary<int, string>();

            // Fetch product names for RD (5)
            var rdProductIds = accountRaw
                .Where(a => a.AccTypeId == 5 && a.GeneralProductId.HasValue)
                .Select(a => a.GeneralProductId!.Value).Distinct().ToList();
            var rdProductMap = rdProductIds.Any()
                ? (await _db.rdproduct.AsNoTracking()
                    .Where(p => rdProductIds.Contains(p.Id) && p.BrId == branchId)
                    .ToListAsync()).GroupBy(p => p.Id).ToDictionary(g => g.Key, g => g.First().ProductName)
                : new Dictionary<int, string>();

            // Build per-account sub-line: "ProductName · AccountNo"
            var accountSubLineMap = accountRaw.ToDictionary(a => a.ID, a =>
            {
                var accNo = !string.IsNullOrWhiteSpace(a.AccPrefix)
                    ? $"{a.AccPrefix}-{a.AccSuffix}"
                    : (string.IsNullOrWhiteSpace(a.AccountNumber) ? "" : a.AccountNumber);

                string? productName = a.AccTypeId is 2 or 3 or 4
                    ? (a.GeneralProductId.HasValue && savingProductMap.TryGetValue(a.GeneralProductId.Value, out var sp) ? sp : null)
                    : a.AccTypeId == 6
                        ? (a.GeneralProductId.HasValue && fdProductMap.TryGetValue(a.GeneralProductId.Value, out var fp) ? fp : null)
                        : a.AccTypeId == 5
                            ? (a.GeneralProductId.HasValue && rdProductMap.TryGetValue(a.GeneralProductId.Value, out var rp) ? rp : null)
                            : null;

                var parts = new[] { productName, accNo }.Where(s => !string.IsNullOrWhiteSpace(s));
                return string.Join(" · ", parts);
            });

            var accountNameMap = accountRaw.ToDictionary(a => a.ID, a => a.AccountName ?? "");

            var branch = await _db.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            var branchName = branch?.branchmaster_name ?? "Society";
            var branchAddress = branch?.branchmaster_addressline ?? "";

            var (typeLabel, prefix) = GetVoucherTypeInfo(voucherType, voucherSubType);
            var voucherNoDisplay = $"{prefix}-{voucherNo:D6}";
            var dateDisplay = voucher.VoucherDate.ToString("dd-MM-yyyy");

            var entries = details.Select((d, i) => new EntryRow(
                i + 1,
                accountNameMap.TryGetValue(d.AccountId, out var name) ? name : $"Account #{d.AccountId}",
                accountSubLineMap.TryGetValue(d.AccountId, out var sub) ? sub : "",
                d.VoucherEntryType,
                d.VoucherAmount
            )).ToList();

            var totalAmount = entries.Where(e => e.EntryType == "Dr").Sum(e => e.Amount);
            var amountInWords = NumberToWords(totalAmount);

            var pdf = BuildPdf(branchName, branchAddress, voucherNoDisplay, typeLabel, dateDisplay,
                entries, totalAmount, amountInWords, voucher.VoucherNarration ?? "", copies < 1 ? 1 : copies);
            var filename = $"{prefix}-{voucherNo:D6}.pdf";
            return (pdf, filename);
        }

        // ── PDF Layout ────────────────────────────────────────────────────────
        private static byte[] BuildPdf(
            string branchName, string branchAddress,
            string voucherNoDisplay, string typeLabel, string dateDisplay,
            List<EntryRow> entries, decimal totalAmount,
            string amountInWords, string narration, int copies = 1)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            // Light sky-blue palette
            const string Primary = "#1e5c9a";   // dark blue — used for text/borders only
            const string HeaderBg= "#5b9ecf";   // sky blue header band
            const string AccentBg= "#6caed9";   // lighter accent band
            const string HdrDark = "#5494c4";   // table header bg
            const string LightBg = "#eaf4fb";   // total row tint
            const string Border  = "#b0cfe8";   // soft border
            const string RowAlt  = "#f4f9fd";   // alternating row
            const string SubText = "#b5d8ee";   // muted sub-text in header
            const string SubLine = "#5a85a8";   // account sub-line text

            // Compact page height: fit content, not a full A4
            const float BaseHeightMm = 118f;  // header + meta row + footer + sigs
            const float RowHeightMm  = 10f;
            var heightMm = Math.Min(287f, BaseHeightMm + entries.Count * RowHeightMm);
            const float PtPerMm = 2.8346f;

            var document = Document.Create(container =>
            {
                for (int copy = 0; copy < copies; copy++)
                container.Page(page =>
                {
                    page.Size(new PageSize(PageSizes.A4.Width, heightMm * PtPerMm));
                    page.Margin(12, Unit.Millimetre);
                    page.DefaultTextStyle(x => x.FontSize(9.5f).FontFamily(Fonts.Arial));

                    page.Content()
                        .Border(1.5f).BorderColor(HeaderBg)
                        .Column(outer =>
                        {
                            // ── Header band ──────────────────────────────
                            outer.Item().Background(HeaderBg).Padding(10).Column(hdr =>
                            {
                                hdr.Item().AlignCenter()
                                    .Text(branchName)
                                    .Bold().FontSize(14).FontColor(Colors.White);
                                if (!string.IsNullOrWhiteSpace(branchAddress))
                                    hdr.Item().PaddingTop(2).AlignCenter()
                                        .Text(branchAddress)
                                        .FontSize(8f).FontColor(SubText);
                            });

                            // ── Voucher type label ─────────────────────────
                            outer.Item().Background(AccentBg)
                                .PaddingVertical(5).PaddingHorizontal(12)
                                .AlignCenter()
                                .Text(typeLabel)
                                .Bold().FontSize(11).FontColor(Colors.White);

                            // ── Voucher No / Date row ──────────────────────
                            outer.Item().BorderBottom(1).BorderColor(Border)
                                .PaddingHorizontal(10).PaddingVertical(7)
                                .Row(row =>
                                {
                                    row.RelativeItem().Text(t =>
                                    {
                                        t.Span("Voucher No.: ").SemiBold().FontSize(9);
                                        t.Span(voucherNoDisplay).Bold().FontSize(9).FontColor(Primary);
                                    });
                                    row.RelativeItem().AlignRight().Text(t =>
                                    {
                                        t.Span("Date: ").SemiBold().FontSize(9);
                                        t.Span(dateDisplay).Bold().FontSize(9).FontColor(Primary);
                                    });
                                });

                            // ── Entries table ──────────────────────────────
                            outer.Item().PaddingHorizontal(8).PaddingVertical(6).Table(table =>
                            {
                                table.ColumnsDefinition(cols =>
                                {
                                    cols.ConstantColumn(34);
                                    cols.RelativeColumn();
                                    cols.ConstantColumn(100);
                                    cols.ConstantColumn(100);
                                });

                                table.Header(h =>
                                {
                                    IContainer HCell(IContainer c) =>
                                        c.Background(HdrDark).BorderBottom(1).BorderColor("#1a4a80")
                                         .Padding(5);

                                    h.Cell().Element(HCell).AlignCenter()
                                        .Text("No.").Bold().FontColor(Colors.White).FontSize(8.5f);
                                    h.Cell().Element(HCell)
                                        .Text("Particular / Account").Bold().FontColor(Colors.White).FontSize(8.5f);
                                    h.Cell().Element(HCell).AlignRight()
                                        .Text("Debit (₹)").Bold().FontColor(Colors.White).FontSize(8.5f);
                                    h.Cell().Element(HCell).AlignRight()
                                        .Text("Credit (₹)").Bold().FontColor(Colors.White).FontSize(8.5f);
                                });

                                for (int i = 0; i < entries.Count; i++)
                                {
                                    var entry = entries[i];
                                    var drAmt = entry.EntryType == "Dr" ? entry.Amount : 0m;
                                    var crAmt = entry.EntryType == "Cr" ? entry.Amount : 0m;
                                    var rowBg = i % 2 == 0 ? "#ffffff" : RowAlt;

                                    table.Cell().Background(rowBg).BorderBottom(0.5f).BorderColor(Border)
                                        .Padding(4).AlignCenter().Text(entry.Sr.ToString()).FontSize(9);

                                    // Account name + sub-line (product · accno)
                                    table.Cell().Background(rowBg).BorderBottom(0.5f).BorderColor(Border)
                                        .Padding(4).Column(cell =>
                                        {
                                            cell.Item().Text(entry.AccountName).FontSize(9);
                                            if (!string.IsNullOrWhiteSpace(entry.SubLine))
                                                cell.Item().PaddingTop(1)
                                                    .Text(entry.SubLine).FontSize(7.5f).FontColor(SubLine);
                                        });

                                    table.Cell().Background(rowBg).BorderBottom(0.5f).BorderColor(Border)
                                        .Padding(4).AlignRight()
                                        .Text(drAmt == 0 ? "—" : FormatAmount(drAmt)).FontSize(9);
                                    table.Cell().Background(rowBg).BorderBottom(0.5f).BorderColor(Border)
                                        .Padding(4).AlignRight()
                                        .Text(crAmt == 0 ? "—" : FormatAmount(crAmt)).FontSize(9);
                                }

                                var drTotal = entries.Where(e => e.EntryType == "Dr").Sum(e => e.Amount);
                                var crTotal = entries.Where(e => e.EntryType == "Cr").Sum(e => e.Amount);

                                table.Cell().ColumnSpan(2).Background(LightBg)
                                    .Border(0.5f).BorderColor(Border).Padding(4)
                                    .Text("TOTAL").Bold().FontSize(9).FontColor(Primary);
                                table.Cell().Background(LightBg)
                                    .Border(0.5f).BorderColor(Border).Padding(4).AlignRight()
                                    .Text(FormatAmount(drTotal)).Bold().FontSize(9).FontColor(Primary);
                                table.Cell().Background(LightBg)
                                    .Border(0.5f).BorderColor(Border).Padding(4).AlignRight()
                                    .Text(FormatAmount(crTotal)).Bold().FontSize(9).FontColor(Primary);
                            });

                            // ── Amount in words + Narration ───────────────
                            outer.Item().BorderTop(1).BorderColor(Border)
                                .PaddingHorizontal(10).PaddingVertical(8).Column(footer =>
                                {
                                    footer.Item().Row(r =>
                                    {
                                        r.ConstantItem(110).Text("Amount in Words:").SemiBold().FontSize(8.5f);
                                        r.RelativeItem().Text(amountInWords).FontSize(8.5f);
                                    });
                                    footer.Item().PaddingTop(5).Row(r =>
                                    {
                                        r.ConstantItem(110).Text("Narration:").SemiBold().FontSize(8.5f);
                                        r.RelativeItem()
                                            .Text(narration.Length > 0 ? narration : "—").FontSize(8.5f);
                                    });
                                });

                            // ── Signature area: Customer Signature first ──
                            outer.Item().BorderTop(1).BorderColor(Border)
                                .PaddingHorizontal(10).PaddingTop(28).PaddingBottom(12)
                                .Row(sig =>
                                {
                                    void SigBox(string label)
                                    {
                                        sig.RelativeItem().AlignCenter().Column(s =>
                                        {
                                            s.Item().AlignCenter().Width(110)
                                                .BorderBottom(1).BorderColor(Colors.Grey.Medium)
                                                .Height(0.5f);
                                            s.Item().PaddingTop(4).AlignCenter()
                                                .Text(label).FontSize(8).FontColor(Colors.Grey.Darken1);
                                        });
                                    }

                                    SigBox("Customer Signature");
                                    SigBox("Prepared By");
                                    SigBox("Verified By");
                                });
                        });
                });
            });

            using var ms = new MemoryStream();
            document.GeneratePdf(ms);
            return ms.ToArray();
        }

        // ── Helpers ───────────────────────────────────────────────────────────
        private static (string label, string prefix) GetVoucherTypeInfo(int voucherType, int voucherSubType) =>
            (voucherType, voucherSubType) switch
            {
                (1, 1)  => ("SHARE MONEY VOUCHER",       "SM"),
                (2, 2)  => ("SAVING DEPOSIT VOUCHER",    "SD"),
                (2, 3)  => ("SAVING WITHDRAWAL VOUCHER", "SW"),
                (2, 29) => ("ACCOUNT CLOSURE VOUCHER",   "CA"),
                (3, 2)  => ("FD DEPOSIT VOUCHER",        "FD"),
                (3, 4)  => ("FD INTEREST POSTING",       "FI"),
                (3, 5)  => ("FD MATURITY VOUCHER",       "FM"),
                (3, 6)  => ("FD RENEWAL VOUCHER",        "FR"),
                (3, 7)  => ("FD PRE-MATURE VOUCHER",     "FP"),
                (4, 8)  => ("RD KIST VOUCHER",           "RK"),
                (4, 16) => ("RD MULTIPLE KIST VOUCHER",  "RM"),
                (5, 9)  => ("LOAN ADVANCEMENT VOUCHER",  "LA"),
                (5, 10) => ("LOAN RECOVERY VOUCHER",     "LR"),
                (5, 14) => ("LOAN EXPENSE VOUCHER",      "LE"),
                (6, 11) => ("CASH VOUCHER",              "CV"),
                (7, 12) => ("JOURNAL VOUCHER",           "JV"),
                _       => ("VOUCHER",                   "VCH"),
            };

        private static string FormatAmount(decimal amount)
        {
            if (amount == 0m) return "0.00";
            return "₹ " + FormatIndianDecimal(amount);
        }

        private static string FormatIndianDecimal(decimal amount)
        {
            var whole = (long)Math.Abs(amount);
            var frac = (int)(Math.Round((Math.Abs(amount) - whole) * 100));
            return FormatIndianInt(whole) + "." + frac.ToString("D2");
        }

        private static string FormatIndianInt(long n)
        {
            if (n == 0) return "0";
            var s = n.ToString();
            if (s.Length <= 3) return s;
            var result = s[^3..];
            s = s[..^3];
            while (s.Length > 0)
            {
                var take = Math.Min(2, s.Length);
                result = s[^take..] + "," + result;
                s = s[..^take];
            }
            return result;
        }

        private static readonly string[] Units =
        [
            "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
            "Sixteen", "Seventeen", "Eighteen", "Nineteen"
        ];
        private static readonly string[] Tens =
            ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

        private static string NumberToWords(decimal amount)
        {
            var rupees = (long)amount;
            var paise = (int)Math.Round((amount - rupees) * 100);

            if (rupees == 0 && paise == 0) return "Zero Rupees Only";

            var parts = new List<string>();
            if (rupees > 0) parts.Add(ConvertToWords(rupees) + " Rupees");
            if (paise > 0) parts.Add(ConvertToWords(paise) + " Paise");

            return string.Join(" and ", parts) + " Only";
        }

        private static string ConvertToWords(long n)
        {
            if (n == 0) return "";
            var words = new System.Text.StringBuilder();

            if (n >= 1_00_00_00_000L)
            {
                words.Append(ConvertToWords(n / 1_00_00_00_000L) + " Arab ");
                n %= 1_00_00_00_000L;
            }
            if (n >= 1_00_00_000L)
            {
                words.Append(ConvertToWords(n / 1_00_00_000L) + " Crore ");
                n %= 1_00_00_000L;
            }
            if (n >= 1_00_000L)
            {
                words.Append(ConvertToWords(n / 1_00_000L) + " Lakh ");
                n %= 1_00_000L;
            }
            if (n >= 1_000L)
            {
                words.Append(ConvertToWords(n / 1_000L) + " Thousand ");
                n %= 1_000L;
            }
            if (n >= 100)
            {
                words.Append(Units[n / 100] + " Hundred ");
                n %= 100;
            }
            if (n >= 20)
            {
                words.Append(Tens[n / 10]);
                if (n % 10 > 0) words.Append(" " + Units[n % 10]);
                words.Append(" ");
            }
            else if (n > 0)
            {
                words.Append(Units[n] + " ");
            }

            return words.ToString().Trim();
        }

        private record EntryRow(int Sr, string AccountName, string SubLine, string EntryType, decimal Amount);
    }
}
