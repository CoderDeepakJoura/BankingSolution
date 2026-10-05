using BankingPlatform.API.Common;
using BankingPlatform.API.Service.Reports;
using BankingPlatform.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace BankingPlatform.API.Service.MemberPortal
{
    public class MemberLoginDto
    {
        [Required]
        public string PhoneNo { get; set; } = ""!;

        [Required]
        public string DateOfBirth { get; set; } = ""!; // YYYY-MM-DD
    }

    public class MemberTokenDto
    {
        public string Token { get; set; } = ""!;
        public int MemberId { get; set; }
        public int BranchId { get; set; }
        public string MemberName { get; set; } = ""!;
    }

    public class MemberAccountSummaryDto
    {
        public int AccountId { get; set; }
        public string AccountType { get; set; } = ""!;   // "Saving","RD","FD","Loan","ShareMoney"
        public int AccTypeId { get; set; }
        public string AccountIdentifier { get; set; } = ""!;
        public string AccountName { get; set; } = ""!;
        public decimal Balance { get; set; }
        public bool IsClosed { get; set; }
    }

    // AccTypeId values: 1=Loan, 2=Saving, 4=ShareMoney, 5=RD, 6=FD (3=General excluded)

    public class MemberProfileDto
    {
        public int MemberId { get; set; }
        public int BranchId { get; set; }
        public string MemberName { get; set; } = ""!;
        public string? MembershipNo { get; set; }
        public string? PhoneNo { get; set; }
        public string? Email { get; set; }
        public DateTime DOB { get; set; }
        public string BranchName { get; set; } = ""!;
        public List<MemberAccountSummaryDto> Accounts { get; set; } = new();
    }

    public class MemberPortalService
    {
        private readonly BankingDbContext _context;
        private readonly JwtSettings _jwtSettings;
        private readonly SavingLedgerService _savingLedger;
        private readonly RDLedgerService _rdLedger;
        private readonly FDLedgerService _fdLedger;
        private readonly LoanLedgerService _loanLedger;
        private readonly ShareMoneyLedgerService _shareMoneyLedger;

        public MemberPortalService(
            BankingDbContext context,
            IOptions<JwtSettings> jwtOptions,
            SavingLedgerService savingLedger,
            RDLedgerService rdLedger,
            FDLedgerService fdLedger,
            LoanLedgerService loanLedger,
            ShareMoneyLedgerService shareMoneyLedger)
        {
            _context = context;
            _jwtSettings = jwtOptions.Value;
            _savingLedger = savingLedger;
            _rdLedger = rdLedger;
            _fdLedger = fdLedger;
            _loanLedger = loanLedger;
            _shareMoneyLedger = shareMoneyLedger;
        }

        public async Task<(bool success, string message, MemberTokenDto? token)> LoginAsync(MemberLoginDto dto)
        {
            if (!DateTime.TryParse(dto.DateOfBirth, out var dob))
                return (false, "Invalid date of birth format. Use YYYY-MM-DD.", null);

            var member = await _context.member.AsNoTracking()
                .FirstOrDefaultAsync(m => m.PhoneNo1 == dto.PhoneNo.Trim() && m.DOB.Date == dob.Date);

            if (member == null)
                return (false, "Invalid mobile number or date of birth.", null);

            var jwt = GenerateMemberToken(member.Id, member.BranchId, member.MemberName);
            return (true, "Login successful.", new MemberTokenDto
            {
                Token = jwt,
                MemberId = member.Id,
                BranchId = member.BranchId,
                MemberName = member.MemberName
            });
        }

        public async Task<(bool success, string message, MemberProfileDto? profile)> GetProfileAsync(int memberId, int branchId)
        {
            var member = await _context.member.AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == memberId && m.BranchId == branchId);
            if (member == null)
                return (false, "Member not found.", null);

            var branch = await _context.branchmaster.AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId);

            // AccTypeId: 1=Loan, 2=Saving, 4=ShareMoney, 5=RD, 6=FD  (3=General excluded)
            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(a => a.MemberId == memberId && a.BranchId == branchId && a.AccTypeId != 3)
                .OrderBy(a => a.AccTypeId)
                .ThenBy(a => a.ID)
                .ToListAsync();

            var summaries = new List<MemberAccountSummaryDto>();
            foreach (var acc in accounts)
            {
                string typeName = acc.AccTypeId switch
                {
                    1 => "Loan",
                    2 => "Saving",
                    4 => "ShareMoney",
                    5 => "RD",
                    6 => "FD",
                    _ => "Other"
                };

                decimal balance = await GetAccountBalanceAsync(acc.ID, acc.BranchId, acc.AccTypeId);

                summaries.Add(new MemberAccountSummaryDto
                {
                    AccountId = acc.ID,
                    AccountType = typeName,
                    AccTypeId = acc.AccTypeId,
                    AccountIdentifier = !string.IsNullOrEmpty(acc.AccPrefix)
                        ? $"{acc.AccPrefix}/{acc.AccSuffix}"
                        : acc.AccountNumber,
                    AccountName = acc.AccountName ?? member.MemberName,
                    Balance = balance,
                    IsClosed = acc.IsAccClosed == true
                });
            }

            var profile = new MemberProfileDto
            {
                MemberId = member.Id,
                BranchId = member.BranchId,
                MemberName = member.MemberName,
                MembershipNo = member.PermanentMembershipNo ?? member.NominalMembershipNo,
                PhoneNo = member.PhoneNo1,
                Email = member.Email1,
                DOB = member.DOB,
                BranchName = branch?.branchmaster_name ?? "",
                Accounts = summaries
            };

            return (true, "Profile fetched.", profile);
        }

        public async Task<(bool success, string message, object? data)> GetLedgerAsync(
            int memberId, int branchId, int accountId, string accountType, string fromDate, string toDate, int? fdDetailId = null)
        {
            if (!DateTime.TryParse(fromDate, out var from) || !DateTime.TryParse(toDate, out var to))
                return (false, "Invalid date format.", null);

            // Verify account belongs to this member
            bool owned = await _context.accountmaster.AsNoTracking()
                .AnyAsync(a => a.ID == accountId && a.BranchId == branchId && a.MemberId == memberId);

            if (!owned)
                return (false, "Account does not belong to this member.", null);

            switch (accountType.ToLower())
            {
                case "saving":
                {
                    var (s, m, d) = await _savingLedger.GetSavingLedgerAsync(branchId, accountId, from, to);
                    return (s, m, d);
                }
                case "rd":
                {
                    var (s, m, d) = await _rdLedger.GetRDLedgerAsync(branchId, accountId, from, to);
                    return (s, m, d);
                }
                case "fd":
                {
                    var (s, m, d) = await _fdLedger.GetFDLedgerAsync(branchId, accountId, fdDetailId, from, to);
                    return (s, m, d);
                }
                case "loan":
                {
                    var (s, m, d) = await _loanLedger.GetLoanLedgerAsync(branchId, accountId, from, to);
                    return (s, m, d);
                }
                case "sharemoney":
                {
                    var (s, m, d) = await _shareMoneyLedger.GetShareMoneyLedgerAsync(branchId, accountId, from, to);
                    return (s, m, d);
                }
                default:
                    return (false, "Unknown account type.", null);
            }
        }

        // ── private helpers ─────────────────────────────────────────────────────

        private async Task<decimal> GetAccountBalanceAsync(int accountId, int branchId, int accTypeId)
        {
            try
            {
                // Mirror SavingLedgerService: join with voucher, filter by voucher.BrID.
                // Do NOT filter by vouchercreditdebitdetails.EntryStatus — that column's values
                // don't match "V"/"A" in practice, causing all sums to return 0.
                var crSum = await _context.vouchercreditdebitdetails
                    .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                    .Where(x => x.e.AccountId == accountId
                        && x.v.BrID == branchId
                        && x.e.VoucherEntryType == "Cr")
                    .SumAsync(x => (decimal?)x.e.VoucherAmount) ?? 0m;

                var drSum = await _context.vouchercreditdebitdetails
                    .Join(_context.voucher, e => e.VoucherID, v => v.Id, (e, v) => new { e, v })
                    .Where(x => x.e.AccountId == accountId
                        && x.v.BrID == branchId
                        && x.e.VoucherEntryType == "Dr")
                    .SumAsync(x => (decimal?)x.e.VoucherAmount) ?? 0m;

                decimal openingBal = 0m;
                if (accTypeId == 6) // FD — per-detail opening balance
                {
                    var fdDetails = await _context.fdaccountdetail.AsNoTracking()
                        .Where(f => f.AccountId == accountId && f.BranchId == branchId)
                        .Select(f => new { f.OpeningBalance, f.OpeningBalanceType })
                        .ToListAsync();

                    foreach (var fd in fdDetails)
                    {
                        var ob = fd.OpeningBalance.GetValueOrDefault();
                        openingBal += fd.OpeningBalanceType == "Cr" ? ob : -ob;
                    }
                }
                else
                {
                    var ob = await _context.accopeningbalance.AsNoTracking()
                        .FirstOrDefaultAsync(o => o.AccountId == accountId && o.BranchId == branchId);
                    if (ob != null)
                        openingBal = ob.EntryType == "Cr" ? ob.OpeningAmount : -ob.OpeningAmount;
                }

                return crSum - drSum + openingBal;
            }
            catch
            {
                return 0m;
            }
        }

        private string GenerateMemberToken(int memberId, int branchId, string memberName)
        {
            byte[] keyBytes = Convert.FromBase64String(_jwtSettings.SecretKey);
            var key = new SymmetricSecurityKey(keyBytes);
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, memberId.ToString()),
                new Claim("memberId", memberId.ToString()),
                new Claim("branchId", branchId.ToString()),
                new Claim(ClaimTypes.Name, memberName),
                new Claim("role", "Member"),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddDays(30),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
