using BankingPlatform.API.Common;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.Reports
{
    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class JournalEntryDTO
    {
        public DateTime VoucherDate { get; set; }
        public int VoucherNo { get; set; }
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string? Narration { get; set; }
        public decimal Dr { get; set; }
        public decimal Cr { get; set; }
    }

    public class JournalBookDTO
    {
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public List<JournalEntryDTO> Entries { get; set; } = new();
        public decimal TotalDr { get; set; }
        public decimal TotalCr { get; set; }
    }

    // ── Service ───────────────────────────────────────────────────────────────────

    public class JournalBookService
    {
        private readonly BankingDbContext _context;

        public JournalBookService(BankingDbContext context) => _context = context;

        public async Task<(bool success, string message, SessionDatesDTO? data)> GetSessionDatesAsync(int branchId)
        {
            var session = await _context.branchsession.AsNoTracking()
                .FirstOrDefaultAsync(x => x.branchid == branchId && x.iscurrent);

            if (session == null)
                return (false, "No active session found.", null);

            return (true, "OK", new SessionDatesDTO
            {
                FromDate = session.fromdate,
                ToDate = session.todate,
                IsFirst = session.isfirst
            });
        }

        public async Task<(bool success, string message, JournalBookDTO? data)> GetJournalBookAsync(
            int branchId, DateTime fromDate, DateTime toDate)
        {
            var branch = await _context.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            var nextDay = toDate.Date.AddDays(1);

            var entries = await (
                from v in _context.voucher.AsNoTracking()
                join d in _context.vouchercreditdebitdetails.AsNoTracking()
                    on v.Id equals d.VoucherID
                join a in _context.accountmaster.AsNoTracking()
                    on d.AccountId equals a.ID
                where v.BrID == branchId
                    && v.VoucherDate.Date >= fromDate.Date
                    && v.VoucherDate < nextDay
                    && v.VoucherStatus == "V"
                    && d.EntryStatus == "V"
                    && d.BrId == branchId
                orderby v.VoucherDate, v.VoucherNo, d.VoucherSeqNo
                select new JournalEntryDTO
                {
                    VoucherDate = v.VoucherDate,
                    VoucherNo = v.VoucherNo,
                    AccountNumber = a.AccountNumber ?? "",
                    AccountName = a.AccountName ?? "",
                    Narration = d.Narration,
                    Dr = d.VoucherEntryType == "Dr" ? d.VoucherAmount : 0m,
                    Cr = d.VoucherEntryType == "Cr" ? d.VoucherAmount : 0m,
                }
            ).ToListAsync();

            return (true, "Success", new JournalBookDTO
            {
                BranchName = branch?.branchmaster_name ?? "",
                BranchAddress = branch?.branchmaster_addressline ?? "",
                FromDate = fromDate,
                ToDate = toDate,
                Entries = entries,
                TotalDr = entries.Sum(e => e.Dr),
                TotalCr = entries.Sum(e => e.Cr)
            });
        }
    }
}
