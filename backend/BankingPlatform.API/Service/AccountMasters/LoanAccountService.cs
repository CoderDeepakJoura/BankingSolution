using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.AccountMasters.Loan;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.AccMasters;
using BankingPlatform.Infrastructure.Models.AccMasters.Loan;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Service.AccountMasters
{
    public class LoanAccountService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonFunctions;
        private readonly MemberService _memberService;

        public LoanAccountService(BankingDbContext context, CommonFunctions commonFunctions, MemberService memberService)
        {
            _context = context;
            _commonFunctions = commonFunctions;
            _memberService = memberService;
        }

        // ── CREATE ───────────────────────────────────────────────────────────────

        public async Task<(string Result, int AccountId)> CreateLoanAccountAsync(CombinedLoanAccountDTO dto)
        {
            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                static DateTime ToUnspecified(DateTime dt) => DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);

                var accDto = dto.AccountMasterDTO;
                accDto.AccOpeningDate = ToUnspecified(accDto.AccOpeningDate);

                // Fetch principal head code from loan product posting config
                var loanPosting = await _context.loanproductposting
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.ProductId == accDto.GeneralProductId && x.BrId == accDto.BranchId);

                long headCode = loanPosting?.PrincipalBalHeadCode ?? 0;
                int headId = headCode > 0 ? await _commonFunctions.GetHeadIdFromHeadCode(headCode, accDto.BranchId) : 0;

                if (headId == 0 || headCode == 0)
                    return ("Principal Balance Head Code not configured in Loan Product Posting. Please configure it before creating a loan account.", 0);

                var accEntity = _memberService.MapToEntity(accDto);
                accEntity.AccTypeId = (int)Common.Enums.AccountTypes.Loan;
                accEntity.IsAccClosed = false;
                accEntity.HeadId = headId;
                accEntity.HeadCode = headCode;
                accEntity.AccPrefix = null;
                accEntity.AccSuffix = null;

                await _context.accountmaster.AddAsync(accEntity);
                await _context.SaveChangesAsync();

                int accountId = accEntity.ID;

                // Nominees
                foreach (var nom in dto.Nominees ?? new())
                {
                    await _context.accountnomineeinfo.AddAsync(new AccountNomineeInfo
                    {
                        BranchId = accDto.BranchId,
                        AccountId = accountId,
                        NomineeName = nom.NomineeName,
                        NomineeDob = ToUnspecified(nom.NomineeDob),
                        RelationWithAccHolder = nom.RelationWithAccHolder,
                        AddressLine = nom.AddressLine,
                        NomineeDate = ToUnspecified(nom.NomineeDate),
                        IsMinor = nom.IsMinor,
                        NameOfGuardian = nom.NameOfGuardian,
                    });
                }

                // Guarantor / Witness
                if (dto.Guarantor != null)
                {
                    await _context.loanguarwitness.AddAsync(new LoanGuarWitness
                    {
                        BrId        = accDto.BranchId,
                        LoanAccId   = accountId,
                        Date        = ToUnspecified(DateTime.Now),
                        Guar1MemId  = dto.Guarantor.Guar1MemId,
                        Guar1MemBrId = dto.Guarantor.Guar1MemBrId,
                        Guar2MemId  = dto.Guarantor.Guar2MemId,
                        Guar2MemBrId = dto.Guarantor.Guar2MemBrId,
                        Witness1MemId = dto.Guarantor.Witness1MemId,
                        Wit1MemBrId   = dto.Guarantor.Wit1MemBrId,
                        Witness2MemId = dto.Guarantor.Witness2MemId,
                        Wit2MemBrId   = dto.Guarantor.Wit2MemBrId,
                    });
                }

                // Kist Detail (installment loans)
                if (dto.KistDetail != null)
                {
                    var kd = dto.KistDetail;
                    await _context.accountkistdetail.AddAsync(new AccountKistDetail
                    {
                        BrId = accDto.BranchId,
                        AccountId = accountId,
                        LoanAmountPassed = kd.LoanAmountPassed,
                        LoanPeriod = kd.LoanPeriod,
                        SlabId = kd.SlabId,
                        StandardInterestRate = kd.StandardInterestRate,
                        OverdueInterestRate = kd.OverdueInterestRate,
                        LoanDate = ToUnspecified(kd.LoanDate),
                        KistInterval = kd.KistInterval,
                        KistFirstDate = ToUnspecified(kd.KistFirstDate),
                        KistAmount = kd.KistAmount,
                        KistPrinPart = kd.KistPrinPart,
                        KistIntPart = kd.KistIntPart,
                        LoanNo = kd.LoanNo,
                        KistWithInterest = kd.KistWithInterest,
                        Status = "A",
                        LoanPeriodIndays = kd.LoanPeriodIndays,
                        KistIntervalIndays = kd.KistIntervalIndays,
                        KislIntAmt = kd.KislIntAmt,
                        MarginMoney = kd.MarginMoney,
                    });

                    await _context.SaveChangesAsync();

                    // Installment schedule
                    foreach (var s in dto.KistSchedule ?? new())
                    {
                        await _context.accountkistschedule.AddAsync(new AccountKistSchedule
                        {
                            BrId = accDto.BranchId,
                            LoanAccId = accountId,
                            KistNumber = s.KistNumber,
                            Date = s.Date.HasValue ? ToUnspecified(s.Date.Value) : null,
                            KistAmount = s.KistAmount,
                            PrincipalAmt = s.PrincipalAmt,
                            InterestAmt = s.InterestAmt,
                        });
                    }
                }

                // Limit Details (limit-wise loans)
                foreach (var ld in dto.LimitDetails ?? new())
                {
                    await _context.accountlimitdetail.AddAsync(new AccountLimitDetail
                    {
                        BrId = accDto.BranchId,
                        AccountId = accountId,
                        LoanNo = ld.LoanNo,
                        LoanDate = ToUnspecified(ld.LoanDate),
                        LoanAmountPassed = ld.LoanAmountPassed,
                        LoanLimitPeriodInMonths = ld.LoanLimitPeriodInMonths,
                        LoanLimitPeriodInDays = ld.LoanLimitPeriodInDays,
                        SlabId = ld.SlabId,
                        StandardInterestRate = ld.StandardInterestRate,
                        OverdueInterestRate = ld.OverdueInterestRate,
                    });
                }

                // Opening Balance
                if (dto.OpeningBalance != null)
                {
                    var ob = dto.OpeningBalance;
                    var obEntity = new LoanAccOpeningBalance
                    {
                        BranchId = accDto.BranchId,
                        AccId = accountId,
                        TotalBalance = ob.TotalBalance,
                        BalType = ob.BalType,
                        OverDueBal = ob.OverDueBal,
                        OverBalType = ob.OverBalType,
                        OpenInt = ob.OpenInt,
                        OpenIntType = ob.OpenIntType,
                        OpenOverInt = ob.OpenOverInt,
                        OpenOverIntType = ob.OpenOverIntType,
                        HeadCode = ob.HeadCode,
                        OverDueDate = ob.OverDueDate.HasValue ? ToUnspecified(ob.OverDueDate.Value) : null,
                    };
                    await _context.loanaccopeningbalance.AddAsync(obEntity);
                    await _context.SaveChangesAsync();

                    foreach (var bd in dto.OpeningBalanceDetails ?? new())
                    {
                        await _context.loanaccountbalancedetail.AddAsync(new LoanAccountBalanceDetail
                        {
                            BrId = accDto.BranchId,
                            LoanOpenBalId = obEntity.Id,
                            AccountId = accountId,
                            AmountDr = bd.AmountDr,
                            AmountCr = bd.AmountCr,
                            IntDr = bd.IntDr,
                            IntCr = bd.IntCr,
                            Date = ToUnspecified(bd.Date),
                            ValueDate = ToUnspecified(bd.ValueDate),
                            Status = bd.Status,
                            HeadCode = bd.HeadCode,
                        });
                    }
                }

                // FD Pledges
                foreach (var fp in dto.FDPledges ?? new())
                {
                    var pledge = new LoanAccFDPledge
                    {
                        BrId = accDto.BranchId,
                        LoanAccId = accountId,
                        FDAccId = fp.FDAccId,
                        FDAccDetId = fp.FDAccDetId,
                        LatestStatus = 1,
                        Date = fp.Date.HasValue ? ToUnspecified(fp.Date.Value) : DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    };
                    await _context.loanaccfdpledge.AddAsync(pledge);
                    await _context.SaveChangesAsync();

                    await _context.loanaccfdpledgedetail.AddAsync(new LoanAccFDPledgeDetail
                    {
                        BrId = accDto.BranchId,
                        LAccFDPledgeId = pledge.Id,
                        Date = pledge.Date,
                        Status = 1,
                    });
                }

                // RD Pledges
                foreach (var rp in dto.RDPledges ?? new())
                {
                    var pledge = new LoanAccRDPledge
                    {
                        BrId = accDto.BranchId,
                        LoanAccId = accountId,
                        RDAccId = rp.RDAccId,
                        RDAccDetId = rp.RDAccDetId,
                        LatestStatus = 1,
                        Date = rp.Date.HasValue ? ToUnspecified(rp.Date.Value) : DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    };
                    await _context.loanaccrdpledge.AddAsync(pledge);
                    await _context.SaveChangesAsync();

                    await _context.loanaccrdpledgedetail.AddAsync(new LoanAccRDPledgeDetail
                    {
                        BrId = accDto.BranchId,
                        LAccRDPledgeId = pledge.Id,
                        Date = pledge.Date,
                        Status = 1,
                        IsHOUpdated = 0,
                    });
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return ("Success", accountId);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                await _commonFunctions.LogErrors(ex, nameof(CreateLoanAccountAsync), nameof(LoanAccountService));
                return (ex.Message, 0);
            }
        }

        // ── UPDATE ───────────────────────────────────────────────────────────────

        public async Task<string> UpdateLoanAccountAsync(int accountId, CombinedLoanAccountDTO dto)
        {
            var accEntity = await _context.accountmaster
                .FirstOrDefaultAsync(x => x.ID == accountId && x.BranchId == dto.AccountMasterDTO.BranchId);
            if (accEntity == null) return "Account not found.";

            if (!await _commonFunctions.CanModifyAccountInCurrentSession(dto.AccountMasterDTO.BranchId, accEntity.AccOpeningDate))
                return "This account can only be modified in the session it was opened in.";

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                static DateTime ToUnspecified(DateTime dt) => DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);

                var accDto = dto.AccountMasterDTO;
                accDto.AccId    = accountId;
                accDto.AccOpeningDate = ToUnspecified(accDto.AccOpeningDate);

                // Re-fetch head code from loan product posting
                var loanPosting = await _context.loanproductposting
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.ProductId == accDto.GeneralProductId && x.BrId == accDto.BranchId);

                long headCode = loanPosting?.PrincipalBalHeadCode ?? 0;
                int headId = headCode > 0 ? await _commonFunctions.GetHeadIdFromHeadCode(headCode, accDto.BranchId) : 0;

                _memberService.MapToEntity(accDto, accEntity);
                accEntity.AccTypeId   = (int)Common.Enums.AccountTypes.Loan;
                accEntity.IsAccClosed = accEntity.IsAccClosed; // preserve closed flag
                accEntity.HeadId = headId;
                accEntity.HeadCode = headCode;
                accEntity.AccPrefix = null;
                accEntity.AccSuffix = null;

                // Nominees — replace
                var existingNominees = await _context.accountnomineeinfo
                    .Where(x => x.AccountId == accountId && x.BranchId == accDto.BranchId).ToListAsync();
                _context.accountnomineeinfo.RemoveRange(existingNominees);
                foreach (var nom in dto.Nominees ?? new())
                {
                    await _context.accountnomineeinfo.AddAsync(new AccountNomineeInfo
                    {
                        BranchId = accDto.BranchId, AccountId = accountId,
                        NomineeName = nom.NomineeName, NomineeDob = ToUnspecified(nom.NomineeDob),
                        RelationWithAccHolder = nom.RelationWithAccHolder,
                        AddressLine = nom.AddressLine, NomineeDate = ToUnspecified(nom.NomineeDate),
                        IsMinor = nom.IsMinor, NameOfGuardian = nom.NameOfGuardian,
                    });
                }

                // Guarantor — replace
                var existingGuar = await _context.loanguarwitness
                    .Where(x => x.LoanAccId == accountId && x.BrId == accDto.BranchId).ToListAsync();
                _context.loanguarwitness.RemoveRange(existingGuar);
                if (dto.Guarantor != null)
                {
                    await _context.loanguarwitness.AddAsync(new LoanGuarWitness
                    {
                        BrId = accDto.BranchId, LoanAccId = accountId,
                        Date = ToUnspecified(DateTime.Now),
                        Guar1MemId = dto.Guarantor.Guar1MemId, Guar1MemBrId = dto.Guarantor.Guar1MemBrId,
                        Guar2MemId = dto.Guarantor.Guar2MemId, Guar2MemBrId = dto.Guarantor.Guar2MemBrId,
                        Witness1MemId = dto.Guarantor.Witness1MemId, Wit1MemBrId = dto.Guarantor.Wit1MemBrId,
                        Witness2MemId = dto.Guarantor.Witness2MemId, Wit2MemBrId = dto.Guarantor.Wit2MemBrId,
                    });
                }

                // Kist detail — replace
                var existingKist = await _context.accountkistdetail
                    .FirstOrDefaultAsync(x => x.AccountId == accountId && x.BrId == accDto.BranchId);
                if (existingKist != null) _context.accountkistdetail.Remove(existingKist);

                var existingSchedule = await _context.accountkistschedule
                    .Where(x => x.LoanAccId == accountId && x.BrId == accDto.BranchId).ToListAsync();
                _context.accountkistschedule.RemoveRange(existingSchedule);

                if (dto.KistDetail != null)
                {
                    var kd = dto.KistDetail;
                    await _context.accountkistdetail.AddAsync(new AccountKistDetail
                    {
                        BrId = accDto.BranchId, AccountId = accountId,
                        LoanAmountPassed = kd.LoanAmountPassed, LoanPeriod = kd.LoanPeriod,
                        SlabId = kd.SlabId, StandardInterestRate = kd.StandardInterestRate,
                        OverdueInterestRate = kd.OverdueInterestRate, LoanDate = ToUnspecified(kd.LoanDate),
                        KistInterval = kd.KistInterval, KistFirstDate = ToUnspecified(kd.KistFirstDate),
                        KistAmount = kd.KistAmount, KistPrinPart = kd.KistPrinPart,
                        KistIntPart = kd.KistIntPart, LoanNo = kd.LoanNo,
                        KistWithInterest = kd.KistWithInterest, Status = "A",
                        LoanPeriodIndays = kd.LoanPeriodIndays, KistIntervalIndays = kd.KistIntervalIndays,
                        KislIntAmt = kd.KislIntAmt, MarginMoney = kd.MarginMoney,
                    });
                    await _context.SaveChangesAsync();
                    foreach (var s in dto.KistSchedule ?? new())
                    {
                        await _context.accountkistschedule.AddAsync(new AccountKistSchedule
                        {
                            BrId = accDto.BranchId, LoanAccId = accountId,
                            KistNumber = s.KistNumber,
                            Date = s.Date.HasValue ? ToUnspecified(s.Date.Value) : null,
                            KistAmount = s.KistAmount, PrincipalAmt = s.PrincipalAmt,
                            InterestAmt = s.InterestAmt,
                        });
                    }
                }

                // Limit details — replace
                var existingLimit = await _context.accountlimitdetail
                    .Where(x => x.AccountId == accountId && x.BrId == accDto.BranchId).ToListAsync();
                _context.accountlimitdetail.RemoveRange(existingLimit);
                foreach (var ld in dto.LimitDetails ?? new())
                {
                    await _context.accountlimitdetail.AddAsync(new AccountLimitDetail
                    {
                        BrId = accDto.BranchId, AccountId = accountId,
                        LoanNo = ld.LoanNo, LoanDate = ToUnspecified(ld.LoanDate),
                        LoanAmountPassed = ld.LoanAmountPassed,
                        LoanLimitPeriodInMonths = ld.LoanLimitPeriodInMonths,
                        LoanLimitPeriodInDays = ld.LoanLimitPeriodInDays,
                        SlabId = ld.SlabId, StandardInterestRate = ld.StandardInterestRate,
                        OverdueInterestRate = ld.OverdueInterestRate,
                    });
                }

                // Opening balance — replace
                var existingOb = await _context.loanaccopeningbalance
                    .FirstOrDefaultAsync(x => x.AccId == accountId && x.BranchId == accDto.BranchId);
                if (existingOb != null)
                {
                    var existingObDetails = await _context.loanaccountbalancedetail
                        .Where(x => x.LoanOpenBalId == existingOb.Id && x.BrId == accDto.BranchId).ToListAsync();
                    _context.loanaccountbalancedetail.RemoveRange(existingObDetails);
                    _context.loanaccopeningbalance.Remove(existingOb);
                }
                if (dto.OpeningBalance != null)
                {
                    var ob = dto.OpeningBalance;
                    var obEntity = new LoanAccOpeningBalance
                    {
                        BranchId = accDto.BranchId, AccId = accountId,
                        TotalBalance = ob.TotalBalance, BalType = ob.BalType,
                        OverDueBal = ob.OverDueBal, OverBalType = ob.OverBalType,
                        OpenInt = ob.OpenInt, OpenIntType = ob.OpenIntType,
                        OpenOverInt = ob.OpenOverInt, OpenOverIntType = ob.OpenOverIntType,
                        HeadCode = ob.HeadCode,
                        OverDueDate = ob.OverDueDate.HasValue ? ToUnspecified(ob.OverDueDate.Value) : null,
                    };
                    await _context.loanaccopeningbalance.AddAsync(obEntity);
                    await _context.SaveChangesAsync();
                    foreach (var bd in dto.OpeningBalanceDetails ?? new())
                    {
                        await _context.loanaccountbalancedetail.AddAsync(new LoanAccountBalanceDetail
                        {
                            BrId = accDto.BranchId, LoanOpenBalId = obEntity.Id, AccountId = accountId,
                            AmountDr = bd.AmountDr, AmountCr = bd.AmountCr,
                            IntDr = bd.IntDr, IntCr = bd.IntCr,
                            Date = ToUnspecified(bd.Date), ValueDate = ToUnspecified(bd.ValueDate),
                            Status = bd.Status, HeadCode = bd.HeadCode,
                        });
                    }
                }

                // FD pledges — replace
                var existingFD = await _context.loanaccfdpledge
                    .Where(x => x.LoanAccId == accountId && x.BrId == accDto.BranchId).ToListAsync();
                foreach (var fp in existingFD)
                {
                    var fpDetails = await _context.loanaccfdpledgedetail
                        .Where(x => x.LAccFDPledgeId == fp.Id && x.BrId == accDto.BranchId).ToListAsync();
                    _context.loanaccfdpledgedetail.RemoveRange(fpDetails);
                }
                _context.loanaccfdpledge.RemoveRange(existingFD);
                foreach (var fp in dto.FDPledges ?? new())
                {
                    var pledge = new LoanAccFDPledge
                    {
                        BrId = accDto.BranchId, LoanAccId = accountId,
                        FDAccId = fp.FDAccId, FDAccDetId = fp.FDAccDetId, LatestStatus = 1,
                        Date = fp.Date.HasValue ? ToUnspecified(fp.Date.Value) : DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    };
                    await _context.loanaccfdpledge.AddAsync(pledge);
                    await _context.SaveChangesAsync();
                    await _context.loanaccfdpledgedetail.AddAsync(new LoanAccFDPledgeDetail
                    { BrId = accDto.BranchId, LAccFDPledgeId = pledge.Id, Date = pledge.Date, Status = 1 });
                }

                // RD pledges — replace
                var existingRD = await _context.loanaccrdpledge
                    .Where(x => x.LoanAccId == accountId && x.BrId == accDto.BranchId).ToListAsync();
                foreach (var rp in existingRD)
                {
                    var rpDetails = await _context.loanaccrdpledgedetail
                        .Where(x => x.LAccRDPledgeId == rp.Id && x.BrId == accDto.BranchId).ToListAsync();
                    _context.loanaccrdpledgedetail.RemoveRange(rpDetails);
                }
                _context.loanaccrdpledge.RemoveRange(existingRD);
                foreach (var rp in dto.RDPledges ?? new())
                {
                    var pledge = new LoanAccRDPledge
                    {
                        BrId = accDto.BranchId, LoanAccId = accountId,
                        RDAccId = rp.RDAccId, RDAccDetId = rp.RDAccDetId, LatestStatus = 1,
                        Date = rp.Date.HasValue ? ToUnspecified(rp.Date.Value) : DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    };
                    await _context.loanaccrdpledge.AddAsync(pledge);
                    await _context.SaveChangesAsync();
                    await _context.loanaccrdpledgedetail.AddAsync(new LoanAccRDPledgeDetail
                    { BrId = accDto.BranchId, LAccRDPledgeId = pledge.Id, Date = pledge.Date, Status = 1 });
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return "Success";
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                await _commonFunctions.LogErrors(ex, nameof(UpdateLoanAccountAsync), nameof(LoanAccountService));
                return ex.Message;
            }
        }

        // ── GET BY ID ────────────────────────────────────────────────────────────

        public async Task<CombinedLoanAccountDTO?> GetLoanAccountByIdAsync(int accountId, int brId)
        {
            var acc = await _context.accountmaster
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ID == accountId && x.BranchId == brId);

            if (acc == null) return null;

            var kistDetail = await _context.accountkistdetail.AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.BrId == brId);

            var schedule = await _context.accountkistschedule.AsNoTracking()
                .Where(x => x.LoanAccId == accountId && x.BrId == brId)
                .OrderBy(x => x.KistNumber)
                .ToListAsync();

            var limitDetails = await _context.accountlimitdetail.AsNoTracking()
                .Where(x => x.AccountId == accountId && x.BrId == brId)
                .ToListAsync();

            var nominees = await _context.accountnomineeinfo.AsNoTracking()
                .Where(x => x.AccountId == accountId && x.BranchId == brId)
                .ToListAsync();

            var guarantor = await _context.loanguarwitness.AsNoTracking()
                .FirstOrDefaultAsync(x => x.LoanAccId == accountId && x.BrId == brId);

            var openingBal = await _context.loanaccopeningbalance.AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccId == accountId && x.BranchId == brId);

            var openingBalDetails = openingBal != null
                ? await _context.loanaccountbalancedetail.AsNoTracking()
                    .Where(x => x.LoanOpenBalId == openingBal.Id && x.BrId == brId)
                    .ToListAsync()
                : new();

            var fdPledges = await _context.loanaccfdpledge.AsNoTracking()
                .Where(x => x.LoanAccId == accountId && x.BrId == brId)
                .ToListAsync();

            var rdPledges = await _context.loanaccrdpledge.AsNoTracking()
                .Where(x => x.LoanAccId == accountId && x.BrId == brId)
                .ToListAsync();

            // Enrich FD pledges with account numbers
            var fdAccIds = fdPledges.Select(x => x.FDAccId).Where(x => x.HasValue).Select(x => x!.Value).ToList();
            var fdAccNumbers = await _context.accountmaster.AsNoTracking()
                .Where(x => fdAccIds.Contains(x.ID))
                .ToDictionaryAsync(x => x.ID, x => x.AccountNumber);

            var rdAccIds = rdPledges.Select(x => x.RDAccId).Where(x => x.HasValue).Select(x => x!.Value).ToList();
            var rdAccNumbers = await _context.accountmaster.AsNoTracking()
                .Where(x => rdAccIds.Contains(x.ID))
                .ToDictionaryAsync(x => x.ID, x => x.AccountNumber);

            decimal runningPrincipal = kistDetail != null ? (decimal)(kistDetail.LoanAmountPassed ?? 0) : 0;
            var scheduleDTO = schedule.Select(s =>
            {
                runningPrincipal -= s.PrincipalAmt ?? 0;
                return new AccountKistScheduleDTO
                {
                    Id = s.Id, BrId = s.BrId, LoanAccId = s.LoanAccId,
                    KistNumber = s.KistNumber, Date = s.Date,
                    KistAmount = s.KistAmount, PrincipalAmt = s.PrincipalAmt,
                    InterestAmt = s.InterestAmt, RunningPrincipal = runningPrincipal,
                };
            }).ToList();

            // Fetch membership number (PM / NM mode)
            string[] membershipModes = new[] { "PM", "NM" };
            string membershipNo = "";
            if (acc.MemberId.HasValue && acc.MemberBranchID.HasValue && membershipModes.Contains(acc.addedusing))
            {
                int memberType = acc.addedusing == "NM" ? 1 : 2;
                membershipNo = await _commonFunctions.GetMemberShipNoFromMemberIDandBranchID(
                    acc.MemberId.Value, acc.MemberBranchID.Value, memberType);
            }

            // Overwrite AccountNumber with the member's share money account number
            // (same pattern as RD/Saving GET — frontend uses this for the member lookup field)
            if (acc.MemberId.HasValue && acc.MemberBranchID.HasValue)
            {
                acc.AccountNumber = await _commonFunctions.GetShareMoneyAccNoFromMemberIDandBranchID(
                    acc.MemberId.Value, acc.MemberBranchID.Value, (int)Common.Enums.AccountTypes.ShareMoney);
            }

            return new CombinedLoanAccountDTO
            {
                AccountMasterDTO = _memberService.MapToDTO(acc, membershipNo),
                KistDetail = kistDetail == null ? null : new AccountKistDetailDTO
                {
                    Id = kistDetail.Id, BrId = kistDetail.BrId, AccountId = kistDetail.AccountId,
                    LoanAmountPassed = kistDetail.LoanAmountPassed, LoanPeriod = kistDetail.LoanPeriod,
                    SlabId = kistDetail.SlabId, StandardInterestRate = kistDetail.StandardInterestRate,
                    OverdueInterestRate = kistDetail.OverdueInterestRate, LoanDate = kistDetail.LoanDate,
                    KistInterval = kistDetail.KistInterval, KistFirstDate = kistDetail.KistFirstDate,
                    KistAmount = kistDetail.KistAmount, KistPrinPart = kistDetail.KistPrinPart,
                    KistIntPart = kistDetail.KistIntPart, LoanNo = kistDetail.LoanNo,
                    KistWithInterest = kistDetail.KistWithInterest, LoanPeriodIndays = kistDetail.LoanPeriodIndays,
                    KistIntervalIndays = kistDetail.KistIntervalIndays, KislIntAmt = kistDetail.KislIntAmt,
                    MarginMoney = kistDetail.MarginMoney,
                },
                KistSchedule = scheduleDTO,
                LimitDetails = limitDetails.Select(l => new AccountLimitDetailDTO
                {
                    Id = l.Id, BrId = l.BrId, AccountId = l.AccountId, LoanNo = l.LoanNo,
                    LoanDate = l.LoanDate, LoanAmountPassed = l.LoanAmountPassed,
                    LoanLimitPeriodInMonths = l.LoanLimitPeriodInMonths,
                    LoanLimitPeriodInDays = l.LoanLimitPeriodInDays,
                    SlabId = l.SlabId, StandardInterestRate = l.StandardInterestRate,
                    OverdueInterestRate = l.OverdueInterestRate,
                }).ToList(),
                Nominees = nominees.Select(n => new AccountNomineeInfoDTO
                {
                    Id = n.Id, BranchId = n.BranchId, AccountId = n.AccountId,
                    NomineeName = n.NomineeName, NomineeDob = n.NomineeDob,
                    RelationWithAccHolder = n.RelationWithAccHolder,
                    AddressLine = n.AddressLine, NomineeDate = n.NomineeDate,
                    IsMinor = n.IsMinor, NameOfGuardian = n.NameOfGuardian,
                }).ToList(),
                Guarantor = guarantor == null ? null : new LoanAccountGuarantorDTO
                {
                    Id           = guarantor.Id,
                    BrId         = guarantor.BrId,
                    Guar1MemId   = guarantor.Guar1MemId,
                    Guar1MemBrId = guarantor.Guar1MemBrId,
                    Guar2MemId   = guarantor.Guar2MemId,
                    Guar2MemBrId = guarantor.Guar2MemBrId,
                    Witness1MemId = guarantor.Witness1MemId,
                    Wit1MemBrId   = guarantor.Wit1MemBrId,
                    Witness2MemId = guarantor.Witness2MemId,
                    Wit2MemBrId   = guarantor.Wit2MemBrId,
                },
                OpeningBalance = openingBal == null ? null : new LoanAccOpeningBalanceDTO
                {
                    Id = openingBal.Id, BranchId = openingBal.BranchId, AccId = openingBal.AccId,
                    TotalBalance = openingBal.TotalBalance, BalType = openingBal.BalType,
                    OverDueBal = openingBal.OverDueBal, OverBalType = openingBal.OverBalType,
                    OpenInt = openingBal.OpenInt, OpenIntType = openingBal.OpenIntType,
                    OpenOverInt = openingBal.OpenOverInt, OpenOverIntType = openingBal.OpenOverIntType,
                    HeadCode = openingBal.HeadCode, OverDueDate = openingBal.OverDueDate,
                },
                OpeningBalanceDetails = openingBalDetails.Select(b => new LoanAccountBalanceDetailDTO
                {
                    Id = b.Id, BrId = b.BrId, LoanOpenBalId = b.LoanOpenBalId, AccountId = b.AccountId,
                    AmountDr = b.AmountDr, AmountCr = b.AmountCr, IntDr = b.IntDr, IntCr = b.IntCr,
                    Date = b.Date, ValueDate = b.ValueDate, Status = b.Status, HeadCode = b.HeadCode,
                }).ToList(),
                FDPledges = fdPledges.Select(f => new LoanAccFDPledgeDTO
                {
                    Id = f.Id, BrId = f.BrId, LoanAccId = f.LoanAccId, FDAccId = f.FDAccId,
                    FDAccDetId = f.FDAccDetId, Date = f.Date,
                    FDAccNumber = f.FDAccId.HasValue ? fdAccNumbers.GetValueOrDefault(f.FDAccId.Value) : null,
                }).ToList(),
                RDPledges = rdPledges.Select(r => new LoanAccRDPledgeDTO
                {
                    Id = r.Id, BrId = r.BrId, LoanAccId = r.LoanAccId, RDAccId = r.RDAccId,
                    RDAccDetId = r.RDAccDetId, Date = r.Date,
                    RDAccNumber = r.RDAccId.HasValue ? rdAccNumbers.GetValueOrDefault(r.RDAccId.Value) : null,
                }).ToList(),
            };
        }

        // ── LIST ─────────────────────────────────────────────────────────────────

        public async Task<(List<LoanAccListItemDTO> Data, int TotalCount)> GetLoanAccountsAsync(int brId, string? searchTerm, int pageNumber, int pageSize)
        {
            int accType = (int)Common.Enums.AccountTypes.Loan;

            var workingDate = _commonFunctions.GetWorkingDate();
            var query = _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == brId && x.AccTypeId == accType
                    && !x.IsAccClosed
                    && (!workingDate.HasValue || x.AccOpeningDate.Date <= workingDate.Value.Date));

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var lower = searchTerm.ToLower();
                query = query.Where(x =>
                    (x.AccountName != null && x.AccountName.ToLower().Contains(lower)) ||
                    (x.AccountNumber != null && x.AccountNumber.ToLower().Contains(lower)));
            }

            int total = await query.CountAsync();

            var accounts = await query
                .OrderByDescending(x => x.ID)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var accountIds = accounts.Select(a => a.ID).ToList();

            var kistDetails = await _context.accountkistdetail.AsNoTracking()
                .Where(x => accountIds.Contains(x.AccountId) && x.BrId == brId)
                .ToDictionaryAsync(x => x.AccountId, x => x);

            var products = await _context.loanproduct.AsNoTracking()
                .Where(x => x.BrId == brId)
                .ToDictionaryAsync(x => x.Id, x => x.ProductName);

            var defs = await _context.loanproductdefinition.AsNoTracking()
                .Where(x => x.BrId == brId)
                .ToDictionaryAsync(x => x.ProductId, x => x);

            var result = accounts.Select(acc =>
            {
                kistDetails.TryGetValue(acc.ID, out var kd);
                int? prodId = acc.GeneralProductId;
                string? productName = prodId.HasValue && products.TryGetValue(prodId.Value, out var pn) ? pn : null;
                string? loanType = null;
                if (prodId.HasValue && defs.TryGetValue(prodId.Value, out var def))
                    loanType = def.TypeId == 4 ? "Limitwise" : "Installment";

                return new LoanAccListItemDTO
                {
                    AccId = acc.ID,
                    AccountNumber = acc.AccountNumber ?? "",
                    AccountName = acc.AccountName ?? "",
                    RelativeName = acc.RelativeName,
                    AccOpeningDate = acc.AccOpeningDate,
                    IsAccClosed = acc.IsAccClosed,
                    ProductName = productName,
                    LoanAmountPassed = kd?.LoanAmountPassed,
                    KistAmount = kd?.KistAmount,
                    LoanPeriod = kd?.LoanPeriod,
                    StandardInterestRate = kd?.StandardInterestRate,
                    LoanType = loanType,
                };
            }).ToList();

            return (result, total);
        }

        // ── DELETE ───────────────────────────────────────────────────────────────

        public async Task<string> DeleteLoanAccountAsync(int accountId, int brId)
        {
            var account = await _context.accountmaster
                .FirstOrDefaultAsync(x => x.ID == accountId && x.BranchId == brId);

            if (account == null) return "Account not found.";

            if (await _commonFunctions.AccountInUse(accountId, brId))
                return "This account cannot be deleted as it is already in use.";

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // FD pledges
                var fdPledges = await _context.loanaccfdpledge
                    .Where(x => x.LoanAccId == accountId && x.BrId == brId).ToListAsync();
                foreach (var fp in fdPledges)
                {
                    var fpDetails = await _context.loanaccfdpledgedetail
                        .Where(x => x.LAccFDPledgeId == fp.Id && x.BrId == brId).ToListAsync();
                    _context.loanaccfdpledgedetail.RemoveRange(fpDetails);
                }
                _context.loanaccfdpledge.RemoveRange(fdPledges);

                // RD pledges
                var rdPledges = await _context.loanaccrdpledge
                    .Where(x => x.LoanAccId == accountId && x.BrId == brId).ToListAsync();
                foreach (var rp in rdPledges)
                {
                    var rpDetails = await _context.loanaccrdpledgedetail
                        .Where(x => x.LAccRDPledgeId == rp.Id && x.BrId == brId).ToListAsync();
                    _context.loanaccrdpledgedetail.RemoveRange(rpDetails);
                }
                _context.loanaccrdpledge.RemoveRange(rdPledges);

                // Opening balance details + header
                var openingBal = await _context.loanaccopeningbalance
                    .FirstOrDefaultAsync(x => x.AccId == accountId && x.BranchId == brId);
                if (openingBal != null)
                {
                    var balDetails = await _context.loanaccountbalancedetail
                        .Where(x => x.LoanOpenBalId == openingBal.Id && x.BrId == brId).ToListAsync();
                    _context.loanaccountbalancedetail.RemoveRange(balDetails);
                    _context.loanaccopeningbalance.Remove(openingBal);
                }

                // Kist schedule + detail
                var kistSchedule = await _context.accountkistschedule
                    .Where(x => x.LoanAccId == accountId && x.BrId == brId).ToListAsync();
                _context.accountkistschedule.RemoveRange(kistSchedule);

                var kistDetail = await _context.accountkistdetail
                    .FirstOrDefaultAsync(x => x.AccountId == accountId && x.BrId == brId);
                if (kistDetail != null) _context.accountkistdetail.Remove(kistDetail);

                // Limit details
                var limitDetails = await _context.accountlimitdetail
                    .Where(x => x.AccountId == accountId && x.BrId == brId).ToListAsync();
                _context.accountlimitdetail.RemoveRange(limitDetails);

                // Guarantor / witness
                var guarWitness = await _context.loanguarwitness
                    .Where(x => x.LoanAccId == accountId && x.BrId == brId).ToListAsync();
                _context.loanguarwitness.RemoveRange(guarWitness);


                // Account master
                _context.accountmaster.Remove(account);

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return "Success";
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                await _commonFunctions.LogErrors(ex, nameof(DeleteLoanAccountAsync), nameof(LoanAccountService));
                return $"Error: {ex.Message}";
            }
        }

        // ── PRODUCT INFO ─────────────────────────────────────────────────────────

        public async Task<LoanProductInfoDTO?> GetLoanProductInfoAsync(int productId, int brId)
        {
            var product = await _context.loanproduct.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == productId && p.BrId == brId);
            if (product == null) return null;

            var def = await _context.loanproductdefinition.AsNoTracking()
                .FirstOrDefaultAsync(d => d.ProductId == productId && d.BrId == brId);

            var adv = await _context.loanproductadvancement.AsNoTracking()
                .FirstOrDefaultAsync(a => a.ProductId == productId && a.BrId == brId);

            return new LoanProductInfoDTO
            {
                TypeId = def?.TypeId ?? 0,
                CategoryId = def?.CategoryId,
                SecurityIds = def?.SecurityIds ?? "",
                IntSchedule = def?.IntSchedule,
                IntFormulae = def?.IntFormulae,
                ActOnIntPosting = def?.ActOnIntPosting,
                LoanPeriodType = adv?.LoanPeriodType,
                IsShareMoneyReq = adv?.IsShareMoneyReq ?? "N",
                MinLoanAmount = adv?.MinLoanAmount ?? 0,
                MaxLoanAmount = adv?.MaxLoanAmount ?? 0,
                ProductName = product.ProductName,
                Code = product.Code,
            };
        }

        // ── LOAN PREFIX+SUFFIX ───────────────────────────────────────────────────

        public async Task<string> GetNextLoanAccountNumber(int productId, int brId)
        {
            var product = await _context.loanproduct
                .Where(p => p.Id == productId && p.BrId == brId)
                .Select(p => p.Code)
                .FirstOrDefaultAsync() ?? "";

            int accountType = (int)Common.Enums.AccountTypes.Loan;
            var maxSuffix = await _context.accountmaster
                .Where(x => x.BranchId == brId && x.GeneralProductId == productId && x.AccTypeId == accountType)
                .Select(x => x.AccSuffix)
                .MaxAsync(x => (int?)x) ?? 0;

            return $"{product}-{maxSuffix + 1}";
        }

        // ── SCHEDULE CALCULATION ─────────────────────────────────────────────────

        public ScheduleResponseDTO CalculateSchedule(CalculateScheduleRequestDTO req)
        {
            const int INT_FORMULAE_FLAT     = 1;
            const int INT_FORMULAE_REDUCING = 2;
            const int INT_SCHEDULE_WITHOUT  = 2;

            int n = req.LoanPeriod / req.KistInterval;
            if (n <= 0) return new ScheduleResponseDTO();

            var schedule   = new List<AccountKistScheduleDTO>();
            decimal outstanding = req.LoanAmount;

            decimal totalInterestFlat = req.IntFormulae == INT_FORMULAE_FLAT
                ? Math.Round(req.LoanAmount * (req.StdIntRate / 100m) * (req.LoanPeriod / 12m), 2)
                : 0m;

            decimal basePrincipal    = Math.Round(req.LoanAmount / n, 2);
            decimal baseInterestFlat = req.IntFormulae == INT_FORMULAE_FLAT ? Math.Round(totalInterestFlat / n, 2) : 0m;

            decimal r   = req.StdIntRate / 12m / 100m;
            decimal emi = 0m;
            if (req.IntSchedule != INT_SCHEDULE_WITHOUT && req.IntFormulae == INT_FORMULAE_REDUCING && r > 0)
            {
                decimal pow = (decimal)Math.Pow((double)(1m + r), n);
                emi = Math.Round(req.LoanAmount * r * pow / (pow - 1m), 2);
            }

            for (int i = 1; i <= n; i++)
            {
                var date   = req.FirstKistDate.AddMonths((i - 1) * req.KistInterval);
                bool isLast = i == n;
                decimal kistAmount, principal, interest;

                if (req.IntSchedule == INT_SCHEDULE_WITHOUT)
                {
                    principal  = isLast ? Math.Round(outstanding, 2) : basePrincipal;
                    interest   = 0m;
                    kistAmount = principal;
                }
                else if (req.IntFormulae == INT_FORMULAE_FLAT)
                {
                    principal  = isLast ? Math.Round(outstanding, 2) : basePrincipal;
                    interest   = baseInterestFlat;
                    kistAmount = Math.Round(principal + interest, 2);
                }
                else // Reducing Balance
                {
                    interest   = Math.Round(outstanding * r, 2);
                    principal  = isLast ? Math.Round(outstanding, 2) : Math.Round(emi - interest, 2);
                    kistAmount = isLast ? Math.Round(principal + interest, 2) : emi;
                }

                outstanding = Math.Round(outstanding - principal, 2);
                if (isLast) outstanding = 0m;

                schedule.Add(new AccountKistScheduleDTO
                {
                    BrId             = 0,
                    KistNumber       = i,
                    Date             = DateTime.SpecifyKind(date, DateTimeKind.Unspecified),
                    KistAmount       = kistAmount,
                    PrincipalAmt     = principal,
                    InterestAmt      = interest,
                    RunningPrincipal = outstanding
                });
            }

            decimal totalInterest = schedule.Sum(s => s.InterestAmt ?? 0m);
            decimal firstKistAmt  = schedule.FirstOrDefault()?.KistAmount ?? 0m;
            decimal kistIntPart   = req.IntFormulae == INT_FORMULAE_FLAT ? Math.Round(totalInterest / n, 2) : 0m;
            decimal kistPrinPart  = Math.Round(req.LoanAmount / n, 2);

            return new ScheduleResponseDTO
            {
                Schedule     = schedule,
                TotalInterest = totalInterest,
                TotalPayable  = req.LoanAmount + totalInterest,
                KistAmount    = firstKistAmt,
                KistIntPart   = kistIntPart,
                KistPrinPart  = kistPrinPart
            };
        }
    }
}
