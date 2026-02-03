using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.Mappers.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models.AccMasters;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using System.Security.Claims;
using static BankingPlatform.API.Service.AccountMasters.FDAccountService;

namespace BankingPlatform.API.Service.AccountMasters
{
    public class FDAccountService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly MemberService _memberService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly VoucherMapper _voucherMapper;

        public FDAccountService(
            BankingDbContext context,
            CommonFunctions commonFunctions,
            ImageService imageService,
            MemberService memberService,
            IHttpContextAccessor httpContextAccessor,
            VoucherMapper voucherMapper)
        {
            _context = context;
            _commonfunctions = commonFunctions;
            _memberService = memberService;
            _httpContextAccessor = httpContextAccessor;
            _voucherMapper = voucherMapper;
        }

        public async Task<string> CreateNewFDAccAsync(CommonAccMasterDTO dto)
        {
            // Validate duplicate account number
            var duplicateFields = await _context.accountmaster
                .Where(x => x.BranchId == dto.AccountMasterDTO!.BranchId
                    && x.AccTypeId == (int)Enums.AccountTypes.FD
                    && x.GeneralProductId == dto.AccountMasterDTO!.GeneralProductId
                    && x.AccSuffix == dto.AccountMasterDTO!.AccSuffix)
                .Select(x => new { x.AccSuffix })
                .ToListAsync();

            if (duplicateFields.Any())
                return "Account Suffix already exists";
            var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var userIdClaim = claimsPrincipal?.FindFirst("userId")?.Value
                                   ?? claimsPrincipal?.FindFirst("UserId")?.Value
                                   ?? claimsPrincipal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                // 1. Create Account Master
                (int headId, long headCode) = await _commonfunctions.GetFDProductPrincipalHead(dto.AccountMasterDTO!.BranchId, (int)dto.AccountMasterDTO.GeneralProductId!);
                if (headId == 0 || headCode == 0)
                    return "Principal Balance Head Code not configured properly. Kindly configure it in FD Product Master.";
                dto.AccountMasterDTO!.HeadId = headId;
                dto.AccountMasterDTO!.HeadCode = headCode;
                dto.AccountMasterDTO!.addedUsing = dto.AccountMasterDTO.addedUsing;
                dto.AccountMasterDTO!.AccountNumber = "";
                var accountMasterInfo = _memberService.MapToEntity(dto.AccountMasterDTO!);
                accountMasterInfo.AccTypeId = (int)Enums.AccountTypes.FD;
                await _context.accountmaster.AddAsync(accountMasterInfo);
                await _context.SaveChangesAsync();

                int accountId = accountMasterInfo.ID;
                int branchId = accountMasterInfo.BranchId;

                // 3. Save Nominees
                if (dto.AccNomineeDTO != null && dto.AccNomineeDTO.Any())
                {
                    foreach (var nomineeDTO in dto.AccNomineeDTO)
                    {
                        var nominee = new AccountNomineeInfo
                        {
                            BranchId = branchId,
                            AccountId = accountId,
                            NomineeName = nomineeDTO.NomineeName,
                            NomineeDob = DateTime.SpecifyKind(nomineeDTO.NomineeDob, DateTimeKind.Unspecified),
                            RelationWithAccHolder = nomineeDTO.RelationWithAccHolder,
                            AddressLine = nomineeDTO.AddressLine,
                            NomineeDate = DateTime.SpecifyKind(nomineeDTO.NomineeDate, DateTimeKind.Unspecified),
                            IsMinor = nomineeDTO.IsMinor,
                            NameOfGuardian = nomineeDTO.NameOfGuardian
                        };
                        await _context.accountnomineeinfo.AddAsync(nominee);
                    }
                }
                
                if (dto.Voucher!.OpeningAmount > 0)
                {
                    AccOpeningBalance accOpeningBalance = _memberService.AccOpeningBalance((decimal)dto.Voucher.OpeningAmount, (int)Enums.AccountTypes.FD, accountId, branchId, dto.Voucher.OpeningBalanceType!);
                    await _context.accopeningbalance.AddAsync(accOpeningBalance);
                }
                if (dto.Voucher!.DebitAccountId > 0 && dto.Voucher.TotalDebit > 0)
                {
                    int debitAccountId = (int)dto.Voucher!.DebitAccountId;
                    decimal totalDebit = (decimal)dto.Voucher.TotalDebit;
                    int nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId);
                    bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
                    string narration = dto.Voucher.VoucherNarration ?? "";
                    DateTime voucherDate = DateTime.SpecifyKind(dto.Voucher.VoucherDate, DateTimeKind.Unspecified);
                    dto.Voucher = new VoucherDTO
                    {
                        ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                        VoucherDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Unspecified),

                        // Other non-DateTime fields
                        AddedBy = Int32.Parse(userIdClaim!),
                        BrID = branchId,
                        ModifiedBy = 0,
                        VerifiedBy = isAutoVerification ? Int32.Parse(userIdClaim!) : 0,
                        VoucherNarration = narration,
                        OtherBrID = 0,
                        VoucherNo = nextVrNo,
                        VoucherStatus = isAutoVerification ? "V" : "A",
                        VoucherType = (int)Enums.VoucherType.FD,
                        VoucherSubType = (int)Enums.VoucherSubType.Deposit,
                    };

                    var voucherInfo = _memberService.MapToEntity(dto.Voucher!);
                    await _context.voucher.AddAsync(voucherInfo);
                    await _context.SaveChangesAsync();

                    DateTime valueDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Utc);
                    int row = 1;
                    VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(accountId, branchId), accountId, branchId, Enums.VoucherStatus.FDCr.ToString(), narration, totalDebit, dto.Voucher.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);

                    _context.vouchercreditdebitdetails.Add(voucherCreditInfo);
                    await _context.SaveChangesAsync();
                    row++;

                    if (dto.FDAccountDetailDTO!.Count > 0)
                    {
                        foreach (var fdDetail in dto.FDAccountDetailDTO!)
                        {
                            int intCompoundingInterval = _commonfunctions.CompoundingIntervalFromString(fdDetail.CompoundingInterval);
                            var fdAccountDetail = new FDAccountDetail
                            {
                                BranchId = branchId,
                                AccountId = accountId,
                                FDAmount = fdDetail.FDAmount,
                                FDDate = DateTime.SpecifyKind(fdDetail.FDDate, DateTimeKind.Unspecified),
                                FDMaturityDate = DateTime.SpecifyKind(fdDetail.FDMaturityDate, DateTimeKind.Unspecified),
                                MaturityAmount = fdDetail.MaturityAmount,
                                LTDNo = Convert.ToInt32(fdDetail.LTDNo),
                                FDStatus = fdDetail.FDStatus,
                                FDPeriodMonths = fdDetail.FDPeriodMonths,
                                FDPeriodDays = fdDetail.FDPeriodDays,
                                SlabId = fdDetail.SlabId,
                                IntRate = fdDetail.IntRate,
                                IntCompInterval = intCompoundingInterval,
                                SerialNo = fdDetail.SerialNo,
                                MISAccId = fdDetail.MISAccId,
                                InterestPaidAmount = fdDetail.InterestPaidAmount,
                                InterestPaidInterval = fdDetail.InterestPaidInterval,
                                VoucherDate = voucherDate
                            };
                            await _context.fdaccountdetail.AddAsync(fdAccountDetail);
                            await _context.SaveChangesAsync();
                            var voucherFDDetail = new VoucherFDDetail
                            {
                                BrId = branchId,
                                VoucherId = voucherInfo.Id,
                                VAccCrDrId = voucherCreditInfo.Id,
                                FDAccId = accountId,
                                FDAccDetId = fdAccountDetail.Id,
                                AmountCr = fdDetail.FDAmount,
                                AmountDr = 0,
                                Operation = "RC",
                                ValueDate = valueDate,
                                VoucherDate = voucherDate,
                                IntDr = 0,
                                IntCr = 0,
                                VoucherMainStatus = dto.Voucher.VoucherStatus
                            };
                            await _context.voucherfddetail.AddAsync(voucherFDDetail);
                            await _context.SaveChangesAsync();
                        }
                    }
                    

                    if (dto.FDVoucherDetailDTO!.CashGLAmount > 0 && dto.FDVoucherDetailDTO!.CashGLAccountId > 0)
                    {
                        VoucherCreditDebitDetails voucherDebitInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId((int)dto.FDVoucherDetailDTO!.CashGLAccountId, branchId), (int)dto.FDVoucherDetailDTO!.CashGLAccountId, branchId, Enums.VoucherStatus.Dr.ToString(), narration, (decimal)dto.FDVoucherDetailDTO!.CashGLAmount, dto.Voucher.VoucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                        _context.vouchercreditdebitdetails.Add(voucherDebitInfo);
                        row++;
                    }
                    if (dto.FDVoucherDetailDTO!.SavingAmount > 0 && dto.FDVoucherDetailDTO!.SavingAccountId > 0)
                    {
                        VoucherCreditDebitDetails voucherDebitInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId((int)dto.FDVoucherDetailDTO!.SavingAccountId, branchId), (int)dto.FDVoucherDetailDTO!.SavingAccountId, branchId, Enums.VoucherStatus.Dr.ToString(), narration, (decimal)dto.FDVoucherDetailDTO!.SavingAmount, dto.Voucher.VoucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                        _context.vouchercreditdebitdetails.Add(voucherDebitInfo);
                        row++;
                    }
                }
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return "Success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"Error: {ex.Message}";
            }
        }

        public async Task<(List<CommonAccMasterDTO> Items, int TotalCount)> GetAllFDAccountsAsync(
            int branchId,
            LocationFilterDTO filter)
        {
            // ✅ Base query - FD accounts only
            var query = _context.accountmaster
                .Where(x => x.BranchId == branchId && x.AccTypeId == (int)Enums.AccountTypes.FD);

            // ✅ Bring data to memory FIRST
            var allAccounts = await query.ToListAsync();

            // ✅ Apply search filter in memory
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                allAccounts = allAccounts
                    .Where(m =>
                        (m.AccountName?.ToLower().Contains(term) ?? false) ||
                        (m.AccSuffix.ToString().Contains(term)) ||
                        (m.AccPrefix?.ToLower().Contains(term) ?? false) ||
                        (m.RelativeName?.ToLower().Contains(term) ?? false))
                    .ToList();
            }

            // ✅ Get total count AFTER filter
            var totalCount = allAccounts.Count;

            // ✅ Apply pagination in memory
            var pagedAccounts = allAccounts
                .OrderByDescending(m => m.ID)  // Latest first
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToList();

            // ✅ Get related IDs for batch fetching
            var accIds = pagedAccounts.Select(m => m.ID).ToList();

            // ✅ Simple approach - await one by one
            var openingBalances = await _context.accopeningbalance
                .Where(n => accIds.Contains(n.AccountId) && n.BranchId == branchId)
                .ToListAsync();

            var fdDetails = await _context.fdaccountdetail
                .Where(fd => accIds.Contains(fd.AccountId) && fd.BranchId == branchId)
                .OrderBy(fd => fd.FDDate)
                .ToListAsync();

            var nominees = await _context.accountnomineeinfo
                .Where(n => accIds.Contains(n.AccountId) && n.BranchId == branchId)
                .ToListAsync();


            // ✅ Map to complete DTO
            var items = pagedAccounts.Select(account =>
            {
                // Get opening balance
                var openingBalInfo = openingBalances.FirstOrDefault(x => x.AccountId == account.ID);
                string openingBalance = openingBalInfo != null
                    ? $"{openingBalInfo.OpeningAmount} {openingBalInfo.EntryType}"
                    : "0";

                // Get FD details for this account
                var accountFDDetails = fdDetails
                    .Where(fd => fd.AccountId == account.ID)
                    .Select(fd => new FDAccountDetailDTO
                    {
                        BranchId = fd.BranchId,
                        FDDate = fd.FDDate,
                        ReceiptNo = fd.LTDNo.ToString(),
                        FDAmount = fd.FDAmount,
                        FDPeriodMonths = fd.FDPeriodMonths,
                        FDPeriodDays = fd.FDPeriodDays,
                        IntRate = fd.IntRate,
                        CompoundingInterval = fd.IntCompInterval.ToString(),
                        FDMaturityDate = fd.FDMaturityDate,
                        MaturityAmount = fd.MaturityAmount,
                        // Display fields
                    })
                    .ToList();

                // Get nominees for this account
                var accountNominees = nominees
                    .Where(n => n.AccountId == account.ID)
                    .Select(n => new AccountNomineeInfoDTO
                    {
                        BranchId = n.BranchId,
                        AccountId = n.AccountId,
                        NomineeName = n.NomineeName,
                        NomineeDob = n.NomineeDob,
                        RelationWithAccHolder = n.RelationWithAccHolder,
                        AddressLine = n.AddressLine,
                        NomineeDate = n.NomineeDate,
                        IsMinor = n.IsMinor,
                        NameOfGuardian = n.NameOfGuardian
                    })
                    .ToList();

                return new CommonAccMasterDTO
                {
                    AccountMasterDTO = _memberService.MapToDTO(account),
                    OpeningBalance = openingBalance,
                    ProductName = _commonfunctions.GetFDProductNameFromID((int)account.GeneralProductId!, branchId),
                    FDAccountDetailDTO = accountFDDetails,
                    AccNomineeDTO = accountNominees
                };
            }).ToList();

            return (items, totalCount);
        }

        public async Task<CommonAccMasterDTO?> GetFDAccountByIdAsync(int accountId, int branchId)
        {
            var accountMaster = await _context.accountmaster
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.ID == accountId && m.BranchId == branchId);

            if (accountMaster == null) return null;

            var nominees = await _context.accountnomineeinfo
                .AsNoTracking()
                .Where(n => n.AccountId == accountId && n.BranchId == branchId)
                .ToListAsync();

            var accOpeningBalDetail = await _context.accopeningbalance
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.AccountId == accountId && w.BranchId == branchId);

            string[] validValues = new[] { "NM", "PM" };
            string membershipNo = "";
            if (validValues.Contains(accountMaster.addedusing))
            {
                int memberType = accountMaster.addedusing == "NM" ? 1 : 2;
                membershipNo = await _commonfunctions.GetMemberShipNoFromMemberIDandBranchID((int)accountMaster.MemberId!, (int)accountMaster.MemberBranchID!, memberType);
            }
            accountMaster.AccountNumber = await _commonfunctions.GetShareMoneyAccNoFromMemberIDandBranchID((int)accountMaster.MemberId!, (int)accountMaster.MemberBranchID!, (int)Enums.AccountTypes.ShareMoney);

            return new CommonAccMasterDTO
            {
                AccountMasterDTO = _memberService.MapToDTO(accountMaster, membershipNo),
                AccNomineeDTO = nominees.Select(n => new AccountNomineeInfoDTO
                {
                    Id = n.Id,
                    BranchId = n.BranchId,
                    AccountId = n.AccountId,
                    NomineeName = n.NomineeName,
                    NomineeDob = n.NomineeDob,
                    RelationWithAccHolder = n.RelationWithAccHolder,
                    AddressLine = n.AddressLine,
                    NomineeDate = n.NomineeDate,
                    IsMinor = n.IsMinor,
                    NameOfGuardian = n.NameOfGuardian
                }).ToList(),
                FDAccountDetailDTO = await _context.fdaccountdetail
                    .AsNoTracking()
                    .Where(f => f.AccountId == accountId && f.BranchId == branchId)
                    .Select(f => new FDAccountDetailDTO
                    {
                        Id = f.Id,
                        BranchId = f.BranchId,
                        AccountId = f.AccountId,
                        FDAmount = f.FDAmount,
                        FDDate = f.FDDate,
                        FDMaturityDate = f.FDMaturityDate,
                        MaturityAmount = f.MaturityAmount,
                        LTDNo = f.LTDNo.ToString(),
                        FDStatus = f.FDStatus,
                        FDPeriodMonths = f.FDPeriodMonths,
                        FDPeriodDays = f.FDPeriodDays,
                        SlabId = f.SlabId,
                        IntRate = f.IntRate,
                        CompoundingInterval = _commonfunctions.CompoundingIntervalStringFromValue(f.IntCompInterval),
                        SerialNo = f.SerialNo,
                        MISAccId = f.MISAccId
                    })
                    .ToListAsync(),
                OpeningBalance = accOpeningBalDetail != null ? accOpeningBalDetail.OpeningAmount.ToString() : "0",
                OpeningBalanceType = accOpeningBalDetail != null ? accOpeningBalDetail.EntryType : "Cr"
            };
        }

        public async Task<string> UpdateFDAccountAsync(CommonAccMasterDTO dto)
        {
            var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
            var accountMaster = await _context.accountmaster
                .FirstOrDefaultAsync(m => m.ID == dto.AccountMasterDTO!.AccId && m.BranchId == dto.AccountMasterDTO.BranchId);

            if (accountMaster == null) return "Account not found.";

            (int headId, long headCode) = await _commonfunctions.GetFDProductPrincipalHead(dto.AccountMasterDTO!.BranchId, (int)dto.AccountMasterDTO.GeneralProductId!);
            if (headId == 0 || headCode == 0)
                return "Principal Balance Head Code not configured properly. Kindly configure it in FD Product Master.";

            // Check for duplicate account number
            var duplicateAccount = await _context.accountmaster
                .Where(x => x.ID != dto.AccountMasterDTO!.AccId
                    && x.BranchId == dto.AccountMasterDTO.BranchId
                    && x.GeneralProductId == dto.AccountMasterDTO.GeneralProductId
                    && x.AccTypeId == (int)Enums.AccountTypes.FD
                    && x.AccSuffix == dto.AccountMasterDTO!.AccSuffix)
                .AnyAsync();

            if (duplicateAccount)
                return "Account Suffix already exists";

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                int accountId = dto.AccountMasterDTO!.AccId;
                int branchId = dto.AccountMasterDTO!.BranchId;
                dto.AccountMasterDTO.AccTypeId = (int)Enums.AccountTypes.FD;
                dto.AccountMasterDTO!.HeadId = headId;
                dto.AccountMasterDTO!.HeadCode = headCode;
                dto.AccountMasterDTO!.addedUsing = dto.AccountMasterDTO.addedUsing;
                dto.AccountMasterDTO!.AccountNumber = "";
                // 1. Update Account Master
                _memberService.MapToEntity(dto.AccountMasterDTO!, accountMaster);

                // 3. Update Nominees
                var existingNominees = await _context.accountnomineeinfo
                    .Where(n => n.AccountId == accountId && n.BranchId == branchId)
                    .ToListAsync();

                _context.accountnomineeinfo.RemoveRange(existingNominees);

                if (dto.AccNomineeDTO != null && dto.AccNomineeDTO.Any())
                {
                    foreach (var nomineeDTO in dto.AccNomineeDTO)
                    {
                        var nominee = new AccountNomineeInfo
                        {
                            BranchId = dto.AccountMasterDTO!.BranchId,
                            AccountId = dto.AccountMasterDTO.AccId,
                            NomineeName = nomineeDTO.NomineeName,
                            NomineeDob = DateTime.SpecifyKind(nomineeDTO.NomineeDob, DateTimeKind.Unspecified),
                            RelationWithAccHolder = nomineeDTO.RelationWithAccHolder,
                            AddressLine = nomineeDTO.AddressLine,
                            NomineeDate = DateTime.SpecifyKind(nomineeDTO.NomineeDate, DateTimeKind.Unspecified),
                            IsMinor = nomineeDTO.IsMinor,
                            NameOfGuardian = nomineeDTO.NameOfGuardian
                        };
                        await _context.accountnomineeinfo.AddAsync(nominee);
                    }
                }

                var fdAccountDetails = await _context.fdaccountdetail
                    .Where(f => f.AccountId == accountId && f.BranchId == branchId)
                    .ToListAsync();
                _context.fdaccountdetail.RemoveRange(fdAccountDetails);
                if (dto.FDAccountDetailDTO!.Count > 0)
                {
                    foreach (var fdDetail in dto.FDAccountDetailDTO!)
                    {
                        var fdAccountDetail = new FDAccountDetail
                        {
                            BranchId = branchId,
                            AccountId = accountId,
                            FDAmount = fdDetail.FDAmount,
                            FDDate = DateTime.SpecifyKind(fdDetail.FDDate, DateTimeKind.Unspecified),
                            FDMaturityDate = DateTime.SpecifyKind(fdDetail.FDMaturityDate, DateTimeKind.Unspecified),
                            MaturityAmount = fdDetail.MaturityAmount,
                            LTDNo = Convert.ToInt32(fdDetail.LTDNo),
                            FDStatus = fdDetail.FDStatus,
                            FDPeriodMonths = fdDetail.FDPeriodMonths,
                            FDPeriodDays = fdDetail.FDPeriodDays,
                            SlabId = fdDetail.SlabId,
                            IntRate = fdDetail.IntRate,
                            IntCompInterval = fdDetail.IntCompInterval,
                            SerialNo = fdDetail.SerialNo,
                            VoucherDate = DateTime.SpecifyKind(fdDetail.VoucherDate, DateTimeKind.Unspecified),
                            InterestPaidInterval = fdDetail.InterestPaidInterval,
                            MISAccId = fdDetail.MISAccId,
                            InterestPaidAmount = fdDetail.InterestPaidAmount
                        };
                        await _context.fdaccountdetail.AddAsync(fdAccountDetail);
                    }
                }

                if (dto.Voucher!.OpeningAmount > 0)
                {
                    var accOpeningBalDetail = await _context.accopeningbalance
                 .AsNoTracking()
                 .FirstOrDefaultAsync(w => w.AccountId == accountId && w.BranchId == branchId);
                    if (accOpeningBalDetail != null)
                    {
                        accOpeningBalDetail.OpeningAmount = (decimal)dto.Voucher.OpeningAmount;
                        accOpeningBalDetail.EntryType = dto.Voucher.OpeningBalanceType!;
                        _context.accopeningbalance.Update(accOpeningBalDetail);
                    }
                    else
                    {
                        AccOpeningBalance accOpeningBalance = _memberService.AccOpeningBalance((decimal)dto.Voucher.OpeningAmount, (int)Enums.AccountTypes.FD, accountId, branchId, dto.Voucher.OpeningBalanceType!);
                        await _context.accopeningbalance.AddAsync(accOpeningBalance);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return "Success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<string> DeleteFDAccountAsync(int accountId, int branchId)
        {
            if (await _commonfunctions.AccountInUse(accountId, branchId))
                return "This account cannot be deleted as it is already in use.";

            var accountMaster = await _context.accountmaster
                .FirstOrDefaultAsync(m => m.ID == accountId && m.BranchId == branchId);

            if (accountMaster == null) return "Account not found.";

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var accOpeningBalance = await _context.accopeningbalance
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.AccTypeId == (int)Enums.AccountTypes.FD && x.AccountId == accountId);
                if (accOpeningBalance != null) _context.accopeningbalance.Remove(accOpeningBalance);
                _context.accountmaster.Remove(accountMaster);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return "Success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"Error: {ex.Message}";
            }
        }

        public async Task<DateTime> CalculateMaturityDate(DateTime fdDate, int months, int days)
        {
            // Check if the FD date is the last day of its month
            bool isLastDayOfMonth = IsLastDayOfMonth(fdDate);

            DateTime maturityDate;

            // Add months
            if (months > 0)
            {
                if (isLastDayOfMonth)
                {
                    // Calculate target month/year first
                    int targetMonth = fdDate.Month + months;
                    int targetYear = fdDate.Year;

                    // Handle year overflow
                    while (targetMonth > 12)
                    {
                        targetMonth -= 12;
                        targetYear++;
                    }

                    // Set to last day of target month
                    int lastDayOfTargetMonth = DateTime.DaysInMonth(targetYear, targetMonth);
                    maturityDate = new DateTime(targetYear, targetMonth, lastDayOfTargetMonth);
                }
                else
                {
                    // Normal addition for non-end-of-month dates
                    maturityDate = fdDate.AddMonths(months);
                }
            }
            else
            {
                maturityDate = fdDate;
            }

            // Add days (after month calculation)
            if (days > 0)
            {
                maturityDate = maturityDate.AddDays(days);
            }

            return maturityDate;
        }

        /// <summary>
        /// Check if a date is the last day of its month
        /// </summary>
        private bool IsLastDayOfMonth(DateTime date)
        {
            return date.Day == DateTime.DaysInMonth(date.Year, date.Month);
        }

        /// <summary>
        /// Get the last day of the month for a given date
        /// </summary>
        private DateTime GetLastDayOfMonth(DateTime date)
        {
            int lastDay = DateTime.DaysInMonth(date.Year, date.Month);
            return new DateTime(date.Year, date.Month, lastDay);
        }

        /// <summary>
        /// Calculate Maturity Amount using Simple Interest (360-day basis)
        /// </summary>
        public decimal CalculateMaturityAmount(decimal principal, decimal annualRate, int months, int days)
        {
            // Calculate total days (30 days per month for 360-day year convention)
            int totalDays = (months * 30) + days;

            // Convert annual rate from percentage to decimal
            decimal rate = annualRate / 100;

            // Simple Interest Formula: (P × R × Days) / 360
            decimal interest = (principal * rate * totalDays) / 360;

            // Maturity Amount = Principal + Interest
            decimal maturityAmount = principal + interest;

            return Math.Round(maturityAmount, 2);
        }

        /// <summary>
        /// Alternative: Calculate using actual days between dates
        /// </summary>
        public async Task<decimal> CalculateMaturityAmount(
            decimal principal,
            decimal annualRate,
            DateTime fdDate,
            DateTime maturityDate,
            int productId,
            int branchId,
            int compoundingInterval)
        {
            // Fetch DaysInAYear rule (360 / 365)
            int daysInAYear = await _context.fdproductbranchwiserule
                .Where(x => x.BranchId == branchId && x.FDProductId == productId)
                .Select(x => x.DaysInAYear)
                .FirstOrDefaultAsync();

            if (daysInAYear <= 0)
                daysInAYear = 360;

            // Actual days
            int actualDays = (maturityDate - fdDate).Days;

            // Time in years
            decimal timeInYears = (decimal)actualDays / daysInAYear;

            // Annual rate
            decimal rate = annualRate / 100;

            // Compounding frequency
            int n = compoundingInterval switch
            {
                (int)Enums.CompoundingInterval.Monthly => 12,
                (int)Enums.CompoundingInterval.Quarterly => 4,
                (int)Enums.CompoundingInterval.Half_Yearly => 2,
                (int)Enums.CompoundingInterval.Yearly => 1,
                (int)Enums.CompoundingInterval.Two_Yearly => 24,
                _ => 4 // default Quarterly
            };

            // Compound Interest Formula
            decimal maturityAmount =
                principal *
                (decimal)Math.Pow((double)(1 + rate / n), (double)(n * timeInYears));

            return Math.Round(maturityAmount, 0);
        }

        private async Task<int> GetPeriodInDays(
            DateTime fdDate,
            int periodInMonths,
            int periodInDays,
            DateTime maturityDate)
        {
            if (periodInDays > 0)
                return periodInDays;

            if (periodInMonths > 0)
            {
                DateTime calculatedMaturity = await CalculateMaturityDate(fdDate, periodInMonths, periodInDays);
                return (calculatedMaturity - fdDate).Days;
            }

            // fallback (safety)
            return (maturityDate - fdDate).Days;
        }

        public async Task<(decimal intRate, string slabName, string compoundingInterval, int intCompoundingInterval, int slabId)>SlabInfo(
         DateTime dob,
         decimal amount,
         int periodInMonths,
         int periodInDays,
         DateTime fdDate, int productId)
        {
            decimal intRate = 0;
            string slabName = string.Empty;
            string compoundingInterval = Enums.CompoundingInterval.Quarterly.ToString();
            int intCompoundingInterval = 0, slabId = 0;
            // Basic validation
            if (dob == DateTime.MinValue || amount <= 0 ||
                (periodInMonths <= 0 && periodInDays <= 0))
                return (intRate, slabName, compoundingInterval, intCompoundingInterval, slabId);

            // Completed age in years
            int age = _commonfunctions.CalculateAgeYM(dob).Years;

            // Period in DAYS (single source of truth)
            int totalDays = await GetPeriodInDays(fdDate, periodInMonths, periodInDays, DateTime.MinValue);

            //Fetch matching slab
            var slab = await (from p in _context.fdinterestslabdetail.AsNoTracking()
                              join q in _context.fdinterestslab.AsNoTracking()
                              on new { slabId = p.FDIntSlabId, branchId = p.BranchId }
                              equals new { slabId = q.Id, branchId = q.BranchId }
                              join h in _context.fdinterestslabinfo.AsNoTracking()
                              on new { slabId = p.FDIntSlabInfoId, branchId = p.BranchId }
                              equals new { slabId = h.Id, branchId = h.BranchId }
                              where age >= p.AgeFrom && age <= p.AgeTo
                              && totalDays >= q.FromDays && totalDays <= q.ToDays
                              && q.FDProductId == productId
                              && h.ApplicableDate <= fdDate
                              orderby h.ApplicableDate descending
                              select new { interestRate = p.InterestRate, slabName = q.SlabName, compoundingInterval = q.CompoundingInterval, slabId = q.Id }
                               )
                               .FirstOrDefaultAsync();
                

            if (slab == null)
                return (intRate, slabName, compoundingInterval, intCompoundingInterval, slabId);

            // 4️⃣ Return slab data
            return (
                slab.interestRate,
                slab.slabName,
               _commonfunctions.CompoundingIntervalStringFromValue(slab.compoundingInterval),
               slab.compoundingInterval,
               slab.slabId
            );
        }


    }
}
