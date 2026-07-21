using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.Mappers.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models.AccMasters;
using BankingPlatform.Infrastructure.Models.voucher;
using System.Security.Claims;

namespace BankingPlatform.API.Service.AccountMasters
{
    [Authorize]
    public class RDAccountService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly MemberService _memberService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly VoucherMapper _voucherMapper;

        public RDAccountService(
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

        // ───────────────────────────────────────────────
        // CREATE
        // ───────────────────────────────────────────────
        public async Task<string> CreateNewRDAccAsync(CommonAccMasterDTO dto)
        {
            var duplicateFields = await _context.accountmaster
                .Where(x => x.BranchId == dto.AccountMasterDTO!.BranchId
                    && x.AccTypeId == (int)Enums.AccountTypes.RD
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

                // 1. Account Master
                (int headId, long headCode) = await _commonfunctions.GetRDProductPrincipalHead(
                    dto.AccountMasterDTO!.BranchId, (int)dto.AccountMasterDTO.GeneralProductId!);

                if (headId == 0 || headCode == 0)
                    return "Principal Balance Head Code not configured properly. Kindly configure it in RD Product Master.";

                dto.AccountMasterDTO!.HeadId = headId;
                dto.AccountMasterDTO!.HeadCode = headCode;
                dto.AccountMasterDTO!.addedUsing = dto.AccountMasterDTO.addedUsing;
                dto.AccountMasterDTO!.AccountNumber = "";

                var accountMasterInfo = _memberService.MapToEntity(dto.AccountMasterDTO!);
                accountMasterInfo.AccTypeId = (int)Enums.AccountTypes.RD;
                await _context.accountmaster.AddAsync(accountMasterInfo);
                await _context.SaveChangesAsync();

                int accountId = accountMasterInfo.ID;
                int branchId = accountMasterInfo.BranchId;

                // 2. Nominees
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

                // 3. Joint Account Holders
                if (dto.JointAccountInfoDTO != null && dto.JointAccountInfoDTO.Any())
                {
                    foreach (var jointDTO in dto.JointAccountInfoDTO)
                    {
                        var jointHolder = new JointAccountInfo
                        {
                            BranchId = branchId,
                            AccountName = jointDTO.AccountName,
                            RelationWithAccHolder = jointDTO.RelationWithAccHolder,
                            Dob = DateTime.SpecifyKind(jointDTO.Dob, DateTimeKind.Unspecified),
                            AddressLine = jointDTO.AddressLine,
                            Gender = jointDTO.Gender,
                            MemberId = jointDTO.MemberId,
                            MemberBrId = jointDTO.MemberBrId,
                            JointWithAccountId = accountId,
                            jointaccholderaccountnumber = jointDTO.JointAccHolderAccountNumber!
                        };
                        await _context.jointaccountinfo.AddAsync(jointHolder);
                    }

                    if (dto.JointAccountWithdrawalInfoDTO != null)
                    {
                        var withdrawalConfig = new JointAccountWithdrawalInfo
                        {
                            BranchId = branchId,
                            AccountId = accountId,
                            MinimumPersonsRequiredForWithdrawal = dto.JointAccountWithdrawalInfoDTO.MinimumPersonsRequiredForWithdrawal,
                            JointAccountHolderCompulsoryForWithdrawal = dto.JointAccountWithdrawalInfoDTO.JointAccountHolderCompulsoryForWithdrawal
                        };
                        await _context.jointaccountwithdrawalinfo.AddAsync(withdrawalConfig);
                    }
                }

                // 4. Opening Balance
                if (dto.Voucher!.OpeningAmount > 0)
                {
                    AccOpeningBalance accOpeningBalance = _memberService.AccOpeningBalance(
                        (decimal)dto.Voucher.OpeningAmount,
                        (int)Enums.AccountTypes.RD,
                        accountId, branchId,
                        dto.Voucher.OpeningBalanceType!);
                    await _context.accopeningbalance.AddAsync(accOpeningBalance);
                }

                // 5. Voucher + RD Detail + VoucherRDDetail
                if ((dto.CreditAccountDetails!.CashAccountId > 0 || dto.CreditAccountDetails!.SavingAccountId > 0)
                    && dto.Voucher.TotalDebit > 0)
                {
                    decimal totalDebit = (decimal)dto.Voucher.TotalDebit;
                    int nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId, dto.Voucher.VoucherDate);
                    bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
                    string narration = dto.Voucher.VoucherNarration ?? "";
                    DateTime voucherDate = DateTime.SpecifyKind(dto.Voucher.VoucherDate, DateTimeKind.Unspecified);

                    dto.Voucher = new VoucherDTO
                    {
                        ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                        VoucherDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Unspecified),
                        AddedBy = Int32.Parse(userIdClaim!),
                        BrID = branchId,
                        ModifiedBy = 0,
                        VerifiedBy = isAutoVerification ? Int32.Parse(userIdClaim!) : 0,
                        VoucherNarration = narration,
                        OtherBrID = 0,
                        VoucherNo = nextVrNo,
                        VoucherStatus = isAutoVerification ? "V" : "A",
                        VoucherType = (int)Enums.VoucherType.RD,
                        VoucherSubType = (int)Enums.VoucherSubType.Deposit,
                    };

                    var voucherInfo = _memberService.MapToEntity(dto.Voucher!);
                    await _context.voucher.AddAsync(voucherInfo);
                    await _context.SaveChangesAsync();

                    DateTime valueDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Utc);
                    int row = 1;

                    VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(
                        await _commonfunctions.GetAccountHeadCodeFromAccId(accountId, branchId),
                        accountId, branchId,
                        Enums.VoucherStatus.RDCr.ToString(),
                        narration, totalDebit,
                        dto.Voucher.VoucherStatus,
                        valueDate, "Cr",
                        voucherInfo.Id, row);

                    _context.vouchercreditdebitdetails.Add(voucherCreditInfo);
                    await _context.SaveChangesAsync();
                    row++;

                    // 6. RD Account Detail
                    if (dto.RDAccountDetailDTO != null)
                    {
                        var rdDto = dto.RDAccountDetailDTO;

                        var rdAccountDetail = new RDAccountDetail
                        {
                            BrId = branchId,
                            AccId = accountId,
                            RdNumber = rdDto.RdNumber,
                            RdDate = DateTime.SpecifyKind(rdDto.RdDate ?? DateTime.Now, DateTimeKind.Unspecified),
                            RdAmount = rdDto.RdAmount ?? 0,
                            NoOfMonths = rdDto.NoOfMonths,
                            RdSlabId = rdDto.RdSlabId,
                            InterestRate = rdDto.InterestRate,
                            MaturityDate = rdDto.MaturityDate.HasValue
                                ? DateTime.SpecifyKind(rdDto.MaturityDate.Value, DateTimeKind.Unspecified)
                                : null,
                            KistAmt = rdDto.KistAmt,
                            KistInterval = rdDto.KistInterval,
                            FirstKistDate = rdDto.FirstKistDate.HasValue
                                ? DateTime.SpecifyKind(rdDto.FirstKistDate.Value, DateTimeKind.Unspecified)
                                : null,
                            PenaltyAmt = rdDto.PenaltyAmt,
                            Status = rdDto.Status ?? (int)Enums.FDStatus.Open,
                            MaturityAmt = rdDto.MaturityAmt,
                            NoOfDays = rdDto.NoOfDays,
                            CompoundingInterval = rdDto.CompoundingInterval
                        };

                        await _context.rdaccountdetail.AddAsync(rdAccountDetail);
                        await _context.SaveChangesAsync();

                        // 7. Voucher RD Detail
                        var voucherRDDetail = new VoucherRDDetail
                        {
                            BrId = branchId,
                            VoucherId = voucherInfo.Id,
                            VaccCrDrId = voucherCreditInfo.Id,
                            RdAccId = accountId,
                            RdAccDetId = rdAccountDetail.Id,
                            AmountCr = (double)rdAccountDetail.RdAmount,
                            AmountDr = 0,
                            Operation = "RC",
                            ValueDate = valueDate,
                            VoucherDate = voucherDate,
                            IntDr = 0,
                            IntCr = 0,
                            VoucherMainStatus = dto.Voucher.VoucherStatus
                        };

                        await _context.voucherrddetail.AddAsync(voucherRDDetail);
                        await _context.SaveChangesAsync();
                    }

                    // 8. Debit side - Cash
                    if (dto.CreditAccountDetails!.CashAmount > 0 && dto.CreditAccountDetails!.CashAccountId > 0)
                    {
                        VoucherCreditDebitDetails voucherDebitInfo = _memberService.voucherCreditDebitDetails(
                            await _commonfunctions.GetAccountHeadCodeFromAccId((int)dto.CreditAccountDetails!.CashAccountId, branchId),
                            (int)dto.CreditAccountDetails!.CashAccountId, branchId,
                            Enums.VoucherStatus.Dr.ToString(),
                            narration, (decimal)dto.CreditAccountDetails!.CashAmount,
                            dto.Voucher.VoucherStatus, valueDate, "Dr",
                            voucherInfo.Id, row);
                        _context.vouchercreditdebitdetails.Add(voucherDebitInfo);
                        row++;
                    }

                    // 9. Debit side - Saving
                    if (dto.CreditAccountDetails!.SavingAmount > 0 && dto.CreditAccountDetails!.SavingAccountId > 0)
                    {
                        VoucherCreditDebitDetails voucherDebitInfo = _memberService.voucherCreditDebitDetails(
                            await _commonfunctions.GetAccountHeadCodeFromAccId((int)dto.CreditAccountDetails!.SavingAccountId, branchId),
                            (int)dto.CreditAccountDetails!.SavingAccountId, branchId,
                            Enums.VoucherStatus.Dr.ToString(),
                            narration, (decimal)dto.CreditAccountDetails!.SavingAmount,
                            dto.Voucher.VoucherStatus, valueDate, "Dr",
                            voucherInfo.Id, row);
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

        // ───────────────────────────────────────────────
        // GET ALL
        // ───────────────────────────────────────────────
        public async Task<(List<CommonAccMasterDTO> Items, int TotalCount)> GetAllRDAccountsAsync(
            int branchId, LocationFilterDTO filter)
        {
            var workingDate = _commonfunctions.GetWorkingDate();
            var allAccounts = await _context.accountmaster
                .Where(x => x.BranchId == branchId && x.AccTypeId == (int)Enums.AccountTypes.RD
                    && !x.IsAccClosed
                    && (!workingDate.HasValue || x.AccOpeningDate.Date <= workingDate.Value.Date))
                .ToListAsync();

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                allAccounts = allAccounts
                    .Where(m =>
                        (m.AccountName?.ToLower().Contains(term) ?? false) ||
                        m.AccSuffix.ToString().Contains(term) ||
                        (m.AccPrefix?.ToLower().Contains(term) ?? false) ||
                        (m.RelativeName?.ToLower().Contains(term) ?? false))
                    .ToList();
            }

            int totalCount = allAccounts.Count;

            var pagedAccounts = allAccounts
                .OrderByDescending(m => m.ID)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToList();

            var accIds = pagedAccounts.Select(m => m.ID).ToList();

            var openingBalances = await _context.accopeningbalance
                .Where(n => accIds.Contains(n.AccountId) && n.BranchId == branchId)
                .ToListAsync();

            var rdDetails = await _context.rdaccountdetail
                .Where(rd => accIds.Contains((int)rd.AccId!) && rd.BrId == branchId)
                .OrderBy(rd => rd.RdDate)
                .ToListAsync();

            var nominees = await _context.accountnomineeinfo
                .Where(n => accIds.Contains(n.AccountId) && n.BranchId == branchId)
                .ToListAsync();

            var items = pagedAccounts.Select(account =>
            {
                var openingBalInfo = openingBalances.FirstOrDefault(x => x.AccountId == account.ID);
                string openingBalance = openingBalInfo != null
                    ? $"{openingBalInfo.OpeningAmount} {openingBalInfo.EntryType}"
                    : "0";

                var accountRDDetail = rdDetails
                    .Where(rd => rd.AccId == account.ID)
                    .Select(rd => new RDAccountDetailDTO
                    {
                        BrId = rd.BrId,
                        AccId = rd.AccId,
                        RdNumber = rd.RdNumber,
                        RdDate = rd.RdDate,
                        RdAmount = rd.RdAmount,
                        NoOfMonths = rd.NoOfMonths,
                        RdSlabId = rd.RdSlabId,
                        InterestRate = rd.InterestRate,
                        MaturityDate = rd.MaturityDate,
                        KistAmt = rd.KistAmt,
                        KistInterval = rd.KistInterval,
                        FirstKistDate = rd.FirstKistDate,
                        PenaltyAmt = rd.PenaltyAmt,
                        Status = rd.Status,
                        MaturityAmt = rd.MaturityAmt,
                        NoOfDays = rd.NoOfDays,
                        CompoundingInterval = rd.CompoundingInterval,
                        slabName = _commonfunctions.GetRDSlabNameFromID((int)rd.RdSlabId, branchId)
                    })
                    .FirstOrDefault();

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


                string productName = _commonfunctions.GetRDProductNameFromId(branchId, (int)account.GeneralProductId!);
                return new CommonAccMasterDTO
                {
                    AccountMasterDTO = _memberService.MapToDTO(account),
                    OpeningBalance = openingBalance,
                    RDAccountDetailDTO = accountRDDetail,
                    AccNomineeDTO = accountNominees,
                    ProductName = productName
                };
            }).ToList();

            return (items, totalCount);
        }

        // ───────────────────────────────────────────────
        // GET BY ID
        // ───────────────────────────────────────────────
        public async Task<CommonAccMasterDTO?> GetRDAccountByIdAsync(int accountId, int branchId)
        {
            var accountMaster = await _context.accountmaster
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.ID == accountId && m.BranchId == branchId);

            if (accountMaster == null) return null;

            var nominees = await _context.accountnomineeinfo
                .AsNoTracking()
                .Where(n => n.AccountId == accountId && n.BranchId == branchId)
                .ToListAsync();

            var jointHolders = await _context.jointaccountinfo
                .AsNoTracking()
                .Where(j => j.JointWithAccountId == accountId && j.BranchId == branchId)
                .ToListAsync();

            var withdrawalConfig = await _context.jointaccountwithdrawalinfo
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.AccountId == accountId && w.BranchId == branchId);

            var accOpeningBalDetail = await _context.accopeningbalance
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.AccountId == accountId && w.BranchId == branchId);

            var rdDetail = await _context.rdaccountdetail
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.AccId == accountId && f.BrId == branchId);

            string rdSlabName = "";
            if (rdDetail?.RdSlabId > 0)
            {
                var slab = await _context.rdinterestslab
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == rdDetail.RdSlabId);
                rdSlabName = slab?.SlabName ?? "";
            }

            string[] validValues = new[] { "NM", "PM" };
            string membershipNo = "";
            if (validValues.Contains(accountMaster.addedusing))
            {
                int memberType = accountMaster.addedusing == "NM" ? 1 : 2;
                membershipNo = await _commonfunctions.GetMemberShipNoFromMemberIDandBranchID(
                    (int)accountMaster.MemberId!, (int)accountMaster.MemberBranchID!, memberType);
            }

            accountMaster.AccountNumber = await _commonfunctions.GetShareMoneyAccNoFromMemberIDandBranchID(
                (int)accountMaster.MemberId!, (int)accountMaster.MemberBranchID!, (int)Enums.AccountTypes.ShareMoney);

            string savingAccountInfo = await _commonfunctions.GetSavingAccInfoFromMemberIDandBranchID(
                (int)accountMaster.MemberId!, (int)accountMaster.MemberBranchID!, (int)Enums.AccountTypes.Saving);

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
                JointAccountInfoDTO = jointHolders.Select(j => new JointAccountInfoDTO
                {
                    Id = j.Id,
                    BranchId = j.BranchId,
                    AccountName = j.AccountName,
                    RelationWithAccHolder = j.RelationWithAccHolder,
                    Dob = j.Dob,
                    AddressLine = j.AddressLine,
                    Gender = j.Gender,
                    MemberId = j.MemberId,
                    MemberBrId = j.MemberBrId,
                    JointWithAccountId = j.JointWithAccountId,
                    JointAccHolderAccountNumber = j.jointaccholderaccountnumber
                }).ToList(),
                JointAccountWithdrawalInfoDTO = withdrawalConfig != null ? new JointAccountWithdrawalInfoDTO
                {
                    Id = withdrawalConfig.Id,
                    BranchId = withdrawalConfig.BranchId,
                    AccountId = withdrawalConfig.AccountId,
                    MinimumPersonsRequiredForWithdrawal = withdrawalConfig.MinimumPersonsRequiredForWithdrawal,
                    JointAccountHolderCompulsoryForWithdrawal = withdrawalConfig.JointAccountHolderCompulsoryForWithdrawal
                } : null,
                RDAccountDetailDTO = rdDetail != null ? new RDAccountDetailDTO
                {
                    BrId = rdDetail.BrId,
                    AccId = rdDetail.AccId,
                    RdNumber = rdDetail.RdNumber,
                    RdDate = rdDetail.RdDate,
                    RdAmount = rdDetail.RdAmount,
                    NoOfMonths = rdDetail.NoOfMonths,
                    RdSlabId = rdDetail.RdSlabId,
                    InterestRate = rdDetail.InterestRate,
                    MaturityDate = rdDetail.MaturityDate,
                    KistAmt = rdDetail.KistAmt,
                    KistInterval = rdDetail.KistInterval,
                    FirstKistDate = rdDetail.FirstKistDate,
                    PenaltyAmt = rdDetail.PenaltyAmt,
                    Status = rdDetail.Status,
                    MaturityAmt = rdDetail.MaturityAmt,
                    NoOfDays = rdDetail.NoOfDays,
                    CompoundingInterval = rdDetail.CompoundingInterval,
                    slabName = rdSlabName,
                } : null,
                OpeningBalance = accOpeningBalDetail != null ? accOpeningBalDetail.OpeningAmount.ToString() : "0",
                OpeningBalanceType = accOpeningBalDetail != null ? accOpeningBalDetail.EntryType : "Cr",
                SavingAccountName = savingAccountInfo
            };
        }

        // ───────────────────────────────────────────────
        // GET MATURE / PRE-MATURE DETAIL  ← UNCHANGED
        // ───────────────────────────────────────────────
        public async Task<CommonAccMasterDTO?> GetRDAccountMatureOrPreMatureDetailByIdAsync(int accountId, int branchId, DateTime currentDate)
        {
            var accountMaster = await _context.accountmaster
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.ID == accountId && m.BranchId == branchId);

            if (accountMaster == null) return null;

            var nominees = await _context.accountnomineeinfo
                .AsNoTracking()
                .Where(n => n.AccountId == accountId && n.BranchId == branchId)
                .ToListAsync();

            var jointHolders = await _context.jointaccountinfo
                .AsNoTracking()
                .Where(j => j.JointWithAccountId == accountId && j.BranchId == branchId)
                .ToListAsync();

            var withdrawalConfig = await _context.jointaccountwithdrawalinfo
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.AccountId == accountId && w.BranchId == branchId);

            var accOpeningBalDetail = await _context.accopeningbalance
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.AccountId == accountId && w.BranchId == branchId);

            var rdDetail = await _context.rdaccountdetail
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.AccId == accountId && f.BrId == branchId);

            string[] validValues = new[] { "NM", "PM" };
            string membershipNo = "";
            DateTime memberDOB = await _commonfunctions.MemberDOBFromMemberIdAndBranchId((int)accountMaster.MemberId!, (int)accountMaster.MemberBranchID!);
            if (validValues.Contains(accountMaster.addedusing))
            {
                int memberType = accountMaster.addedusing == "NM" ? 1 : 2;
                membershipNo = await _commonfunctions.GetMemberShipNoFromMemberIDandBranchID(
                    (int)accountMaster.MemberId!, (int)accountMaster.MemberBranchID!, memberType);
            }

            accountMaster.AccountNumber = await _commonfunctions.GetShareMoneyAccNoFromMemberIDandBranchID(
                (int)accountMaster.MemberId!, (int)accountMaster.MemberBranchID!, (int)Enums.AccountTypes.ShareMoney);

            string savingAccountInfo = await _commonfunctions.GetSavingAccInfoFromMemberIDandBranchID(
                (int)accountMaster.MemberId!, (int)accountMaster.MemberBranchID!, (int)Enums.AccountTypes.Saving);

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
                JointAccountInfoDTO = jointHolders.Select(j => new JointAccountInfoDTO
                {
                    Id = j.Id,
                    BranchId = j.BranchId,
                    AccountName = j.AccountName,
                    RelationWithAccHolder = j.RelationWithAccHolder,
                    Dob = j.Dob,
                    AddressLine = j.AddressLine,
                    Gender = j.Gender,
                    MemberId = j.MemberId,
                    MemberBrId = j.MemberBrId,
                    JointWithAccountId = j.JointWithAccountId,
                    JointAccHolderAccountNumber = j.jointaccholderaccountnumber
                }).ToList(),
                JointAccountWithdrawalInfoDTO = withdrawalConfig != null ? new JointAccountWithdrawalInfoDTO
                {
                    Id = withdrawalConfig.Id,
                    BranchId = withdrawalConfig.BranchId,
                    AccountId = withdrawalConfig.AccountId,
                    MinimumPersonsRequiredForWithdrawal = withdrawalConfig.MinimumPersonsRequiredForWithdrawal,
                    JointAccountHolderCompulsoryForWithdrawal = withdrawalConfig.JointAccountHolderCompulsoryForWithdrawal
                } : null,
                RDAccountDetailDTO = rdDetail != null ? new RDAccountDetailDTO
                {
                    BrId = rdDetail.BrId,
                    AccId = rdDetail.AccId,
                    RdNumber = rdDetail.RdNumber,
                    RdDate = rdDetail.RdDate,
                    RdAmount = rdDetail.RdAmount,
                    NoOfMonths = rdDetail.NoOfMonths,
                    RdSlabId = rdDetail.RdSlabId,
                    InterestRate = rdDetail.InterestRate,
                    MaturityDate = rdDetail.MaturityDate,
                    KistAmt = rdDetail.KistAmt,
                    KistInterval = rdDetail.KistInterval,
                    FirstKistDate = rdDetail.FirstKistDate,
                    PenaltyAmt = rdDetail.PenaltyAmt,
                    Status = rdDetail.Status,
                    MaturityAmt = rdDetail.MaturityAmt,
                    NoOfDays = rdDetail.NoOfDays,
                    CompoundingInterval = rdDetail.CompoundingInterval,
                    DetailId = rdDetail.Id
                } : null,
                OpeningBalance = accOpeningBalDetail != null ? accOpeningBalDetail.OpeningAmount.ToString() : "0",
                OpeningBalanceType = accOpeningBalDetail != null ? accOpeningBalDetail.EntryType : "Cr",
                SavingAccountName = savingAccountInfo,
                PreMaturityAmount = await CalculatePreMaturityAmount(
                                    memberDOB,
                                    rdDetail!.RdAmount,
                                    ((currentDate.Year - rdDetail.RdDate.Year) * 12) + (currentDate.Month - rdDetail.RdDate.Month),
                                    currentDate,
                                    (int)accountMaster.GeneralProductId!,
                                    branchId
                                )
            };
        }

        // ───────────────────────────────────────────────
        // UPDATE
        // ───────────────────────────────────────────────
        public async Task<string> UpdateRDAccountAsync(CommonAccMasterDTO dto)
        {
            var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
            var accountMaster = await _context.accountmaster
                .FirstOrDefaultAsync(m => m.ID == dto.AccountMasterDTO!.AccId
                    && m.BranchId == dto.AccountMasterDTO.BranchId);

            if (accountMaster == null) return "Account not found.";

            if (!await _commonfunctions.CanModifyAccountInCurrentSession(dto.AccountMasterDTO!.BranchId, accountMaster.AccOpeningDate))
                return "This account can only be modified in the session it was opened in.";

            (int headId, long headCode) = await _commonfunctions.GetRDProductPrincipalHead(
                dto.AccountMasterDTO!.BranchId, (int)dto.AccountMasterDTO.GeneralProductId!);

            if (headId == 0 || headCode == 0)
                return "Principal Balance Head Code not configured properly. Kindly configure it in RD Product Master.";

            var duplicateAccount = await _context.accountmaster
                .Where(x => x.ID != dto.AccountMasterDTO!.AccId
                    && x.BranchId == dto.AccountMasterDTO.BranchId
                    && x.GeneralProductId == dto.AccountMasterDTO.GeneralProductId
                    && x.AccTypeId == (int)Enums.AccountTypes.RD
                    && x.AccSuffix == dto.AccountMasterDTO!.AccSuffix)
                .AnyAsync();

            if (duplicateAccount)
                return "Account Suffix already exists";

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                int accountId = dto.AccountMasterDTO!.AccId;
                int branchId = dto.AccountMasterDTO!.BranchId;
                dto.AccountMasterDTO.AccTypeId = (int)Enums.AccountTypes.RD;
                dto.AccountMasterDTO!.HeadId = headId;
                dto.AccountMasterDTO!.HeadCode = headCode;
                dto.AccountMasterDTO!.addedUsing = dto.AccountMasterDTO.addedUsing;
                dto.AccountMasterDTO!.AccountNumber = "";

                // 1. Update Account Master
                _memberService.MapToEntity(dto.AccountMasterDTO!, accountMaster);

                // 2. Update Nominees
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

                // 3. Update Joint Account Holders
                var existingJointHolders = await _context.jointaccountinfo
                    .Where(j => j.JointWithAccountId == accountId && j.BranchId == branchId)
                    .ToListAsync();
                _context.jointaccountinfo.RemoveRange(existingJointHolders);

                if (dto.JointAccountInfoDTO != null && dto.JointAccountInfoDTO.Any())
                {
                    foreach (var jointDTO in dto.JointAccountInfoDTO)
                    {
                        var jointHolder = new JointAccountInfo
                        {
                            BranchId = branchId,
                            AccountName = jointDTO.AccountName,
                            RelationWithAccHolder = jointDTO.RelationWithAccHolder,
                            Dob = DateTime.SpecifyKind(jointDTO.Dob, DateTimeKind.Unspecified),
                            AddressLine = jointDTO.AddressLine,
                            Gender = jointDTO.Gender,
                            MemberId = jointDTO.MemberId,
                            MemberBrId = jointDTO.MemberBrId,
                            JointWithAccountId = accountId,
                            jointaccholderaccountnumber = jointDTO.JointAccHolderAccountNumber!
                        };
                        await _context.jointaccountinfo.AddAsync(jointHolder);
                    }
                }

                // 4. Update Joint Withdrawal Config
                var existingConfig = await _context.jointaccountwithdrawalinfo
                    .FirstOrDefaultAsync(w => w.AccountId == accountId && w.BranchId == branchId);

                if (dto.JointAccountWithdrawalInfoDTO != null)
                {
                    if (existingConfig != null)
                    {
                        existingConfig.MinimumPersonsRequiredForWithdrawal = dto.JointAccountWithdrawalInfoDTO.MinimumPersonsRequiredForWithdrawal;
                        existingConfig.JointAccountHolderCompulsoryForWithdrawal = dto.JointAccountWithdrawalInfoDTO.JointAccountHolderCompulsoryForWithdrawal;
                        _context.jointaccountwithdrawalinfo.Update(existingConfig);
                    }
                    else
                    {
                        var newConfig = new JointAccountWithdrawalInfo
                        {
                            BranchId = branchId,
                            AccountId = accountId,
                            MinimumPersonsRequiredForWithdrawal = dto.JointAccountWithdrawalInfoDTO.MinimumPersonsRequiredForWithdrawal,
                            JointAccountHolderCompulsoryForWithdrawal = dto.JointAccountWithdrawalInfoDTO.JointAccountHolderCompulsoryForWithdrawal
                        };
                        await _context.jointaccountwithdrawalinfo.AddAsync(newConfig);
                    }
                }
                else if (existingConfig != null)
                {
                    _context.jointaccountwithdrawalinfo.Remove(existingConfig);
                }

                // 5. Update RD Account Detail
                var existingRDDetails = await _context.rdaccountdetail
                    .Where(f => f.AccId == accountId && f.BrId == branchId)
                    .ToListAsync();
                _context.rdaccountdetail.RemoveRange(existingRDDetails);

                if (dto.RDAccountDetailDTO != null)
                {
                    var rdDto = dto.RDAccountDetailDTO;
                    var rdAccountDetail = new RDAccountDetail
                    {
                        BrId = branchId,
                        AccId = accountId,
                        RdNumber = rdDto.RdNumber,
                        RdDate = DateTime.SpecifyKind(rdDto.RdDate ?? DateTime.Now, DateTimeKind.Unspecified),
                        RdAmount = rdDto.RdAmount ?? 0,
                        NoOfMonths = rdDto.NoOfMonths,
                        RdSlabId = rdDto.RdSlabId,
                        InterestRate = rdDto.InterestRate,
                        MaturityDate = rdDto.MaturityDate.HasValue
                            ? DateTime.SpecifyKind(rdDto.MaturityDate.Value, DateTimeKind.Unspecified)
                            : null,
                        KistAmt = rdDto.KistAmt,
                        KistInterval = rdDto.KistInterval,
                        FirstKistDate = rdDto.FirstKistDate.HasValue
                            ? DateTime.SpecifyKind(rdDto.FirstKistDate.Value, DateTimeKind.Unspecified)
                            : null,
                        PenaltyAmt = rdDto.PenaltyAmt,
                        Status = rdDto.Status ?? (int)Enums.FDStatus.Open,
                        MaturityAmt = rdDto.MaturityAmt,
                        NoOfDays = rdDto.NoOfDays,
                        CompoundingInterval = rdDto.CompoundingInterval
                    };
                    await _context.rdaccountdetail.AddAsync(rdAccountDetail);
                }

                // 6. Opening Balance
                if (dto.Voucher!.OpeningAmount > 0)
                {
                    var accOpeningBalDetail = await _context.accopeningbalance
                        .FirstOrDefaultAsync(w => w.AccountId == accountId && w.BranchId == branchId);

                    if (accOpeningBalDetail != null)
                    {
                        accOpeningBalDetail.OpeningAmount = (decimal)dto.Voucher.OpeningAmount;
                        accOpeningBalDetail.EntryType = dto.Voucher.OpeningBalanceType!;
                        _context.accopeningbalance.Update(accOpeningBalDetail);
                    }
                    else
                    {
                        AccOpeningBalance accOpeningBalance = _memberService.AccOpeningBalance(
                            (decimal)dto.Voucher.OpeningAmount,
                            (int)Enums.AccountTypes.RD,
                            accountId, branchId,
                            dto.Voucher.OpeningBalanceType!);
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

        // ───────────────────────────────────────────────
        // DELETE
        // ───────────────────────────────────────────────
        public async Task<string> DeleteRDAccountAsync(int accountId, int branchId)
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
                    .FirstOrDefaultAsync(x => x.BranchId == branchId
                        && x.AccTypeId == (int)Enums.AccountTypes.RD
                        && x.AccountId == accountId);
                if (accOpeningBalance != null)
                    _context.accopeningbalance.Remove(accOpeningBalance);

                // CASCADE DELETE handles rdaccountdetail, nominees, joint holders
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

        // ───────────────────────────────────────────────
        // MATURE RD  ← UNCHANGED
        // ───────────────────────────────────────────────
        public async Task<string> MatureRDAsync(CommonAccMasterDTO dto)
        {
            var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
            var accountMaster = await _context.accountmaster.AsNoTracking()
                .FirstOrDefaultAsync(m => m.ID == dto.MatureRDInfo!.RDAccountId
                    && m.BranchId == dto.MatureRDInfo.BranchId);

            if (accountMaster == null) return "Account not found.";

            var rdDetailInfo = await _context.rdaccountdetail
                .FirstOrDefaultAsync(f => f.AccId == dto.MatureRDInfo!.RDAccountId
                    && f.BrId == dto.MatureRDInfo.BranchId
                    && f.Id == dto.MatureRDInfo!.DetailId);

            if (rdDetailInfo == null) return "RD Detail not found.";

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (dto.CreditAccountDetails!.CashAccountId > 0 || dto.CreditAccountDetails!.SavingAccountId > 0 || dto.CreditAccountDetails!.LoanAccountId > 0)
                {
                    decimal totalDebit = (decimal)dto.CreditAccountDetails!.CashAmount! + (decimal)dto.CreditAccountDetails!.SavingAmount! + (decimal)dto.CreditAccountDetails!.LoanAmount!;
                    int accountId = (int)dto.MatureRDInfo!.RDAccountId!;
                    var userIdClaim = claimsPrincipal?.FindFirst("userId")?.Value
                                   ?? claimsPrincipal?.FindFirst("UserId")?.Value
                                   ?? claimsPrincipal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    int branchId = (int)dto.MatureRDInfo.BranchId!;
                    int nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId, dto.MatureRDInfo!.VoucherDate);
                    bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
                    string narration = dto.MatureRDInfo?.Narration ?? ("RD Matured") + " .";
                    DateTime voucherDate = DateTime.SpecifyKind(dto.MatureRDInfo!.VoucherDate, DateTimeKind.Unspecified);
                    rdDetailInfo.Status = (int)Enums.FDStatus.Matured;
                    rdDetailInfo.MaturedOn = DateTime.SpecifyKind(dto.MatureRDInfo!.VoucherDate, DateTimeKind.Unspecified);
                    dto.Voucher = new VoucherDTO
                    {
                        ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                        VoucherDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Unspecified),
                        AddedBy = Int32.Parse(userIdClaim!),
                        BrID = branchId,
                        ModifiedBy = 0,
                        VerifiedBy = isAutoVerification ? Int32.Parse(userIdClaim!) : 0,
                        VoucherNarration = narration,
                        OtherBrID = 0,
                        VoucherNo = nextVrNo,
                        VoucherStatus = isAutoVerification ? "V" : "A",
                        VoucherType = (int)Enums.VoucherType.RD,
                        VoucherSubType = (int)Enums.VoucherSubType.Mature,
                    };

                    var voucherInfo = _memberService.MapToEntity(dto.Voucher!);
                    await _context.voucher.AddAsync(voucherInfo);
                    await _context.SaveChangesAsync();
                    DateTime valueDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Utc);
                    int row = 1;

                    if (dto.CreditAccountDetails!.SavingAccountId > 0 && dto.CreditAccountDetails!.SavingAmount > 0)
                    {
                        VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId((int)dto.CreditAccountDetails!.SavingAccountId, branchId), (int)dto.CreditAccountDetails!.SavingAccountId, branchId, Enums.VoucherStatus.Cr.ToString(), "Saving Account Credited", (decimal)dto.CreditAccountDetails!.SavingAmount, dto.Voucher.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);
                        _context.vouchercreditdebitdetails.Add(voucherCreditInfo);
                        row++;
                    }
                    if (dto.CreditAccountDetails!.CashAccountId > 0 && dto.CreditAccountDetails!.CashAmount > 0)
                    {
                        VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId((int)dto.CreditAccountDetails!.CashAccountId!, branchId), (int)dto.CreditAccountDetails!.CashAccountId!, branchId, Enums.VoucherStatus.Cr.ToString(), "Cash Account Credited", (decimal)dto.CreditAccountDetails!.CashAmount, dto.Voucher.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);
                        _context.vouchercreditdebitdetails.Add(voucherCreditInfo);
                        row++;
                    }
                    if (dto.CreditAccountDetails!.LoanAccountId > 0 && dto.CreditAccountDetails!.LoanAmount > 0)
                    {
                        VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId((int)dto.CreditAccountDetails!.LoanAccountId, branchId), (int)dto.CreditAccountDetails!.LoanAccountId, branchId, Enums.VoucherStatus.Cr.ToString(), "Loan Recovery", (decimal)dto.CreditAccountDetails!.LoanAmount, dto.Voucher.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);
                        _context.vouchercreditdebitdetails.Add(voucherCreditInfo);
                        row++;
                    }

                    VoucherCreditDebitDetails voucherDebitInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(accountId, branchId), accountId, branchId, Enums.VoucherStatus.RDDr.ToString(), narration, totalDebit, dto.Voucher.VoucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                    _context.vouchercreditdebitdetails.Add(voucherDebitInfo);
                    await _context.SaveChangesAsync();

                    var voucherRDDetailDebit = new VoucherRDDetail
                    {
                        BrId = branchId,
                        VoucherId = voucherInfo.Id,
                        VaccCrDrId = voucherDebitInfo.Id,
                        RdAccId = accountId,
                        RdAccDetId = rdDetailInfo.Id,
                        AmountCr = 0,
                        Operation = "RP",
                        VoucherDate = voucherDate,
                        AmountDr = Convert.ToDouble(rdDetailInfo.MaturityAmt),
                        IntDr = 0,
                        IntCr = 0,
                        ValueDate = voucherDate,
                        VoucherMainStatus = dto.Voucher.VoucherStatus
                    };
                    await _context.voucherrddetail.AddAsync(voucherRDDetailDebit);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw;
            }

            return "Success";
        }

        // ───────────────────────────────────────────────
        // PRE-MATURE RD  ← UNCHANGED
        // ───────────────────────────────────────────────
        public async Task<string> PreMatureRDAsync(CommonAccMasterDTO dto)
        {
            var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
            var accountMaster = await _context.accountmaster.AsNoTracking()
                .FirstOrDefaultAsync(m => m.ID == dto.MatureRDInfo!.RDAccountId
                    && m.BranchId == dto.MatureRDInfo.BranchId);

            if (accountMaster == null) return "Account not found.";

            var rdDetailInfo = await _context.rdaccountdetail
                .FirstOrDefaultAsync(f => f.AccId == dto.MatureRDInfo!.RDAccountId
                    && f.BrId == dto.MatureRDInfo.BranchId
                    && f.Id == dto.MatureRDInfo!.DetailId);

            if (rdDetailInfo == null) return "RD Detail not found.";

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (dto.CreditAccountDetails!.CashAccountId > 0 || dto.CreditAccountDetails!.SavingAccountId > 0 || dto.CreditAccountDetails!.LoanAccountId > 0)
                {
                    decimal totalDebit = (decimal)dto.CreditAccountDetails!.CashAmount + (decimal)dto.CreditAccountDetails!.SavingAmount + (decimal)dto.CreditAccountDetails!.LoanAmount;
                    int accountId = (int)dto.MatureRDInfo!.RDAccountId!;
                    var userIdClaim = claimsPrincipal?.FindFirst("userId")?.Value
                                   ?? claimsPrincipal?.FindFirst("UserId")?.Value
                                   ?? claimsPrincipal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    int branchId = (int)dto.MatureRDInfo.BranchId!;
                    int nextVrNo = await _commonfunctions.GetLatestVoucherNo(branchId, dto.MatureRDInfo!.VoucherDate);
                    bool isAutoVerification = await _commonfunctions.IsAutoVerification(branchId);
                    string narration = dto.MatureRDInfo?.Narration ?? ("RD Pre-Matured") + " .";
                    DateTime voucherDate = DateTime.SpecifyKind(dto.MatureRDInfo!.VoucherDate, DateTimeKind.Unspecified);
                    rdDetailInfo.Status = (int)Enums.FDStatus.Pre_Matured;
                    rdDetailInfo.PreMaturedOn = voucherDate;
                    dto.Voucher = new VoucherDTO
                    {
                        ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                        VoucherDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Unspecified),
                        AddedBy = Int32.Parse(userIdClaim!),
                        BrID = branchId,
                        ModifiedBy = 0,
                        VerifiedBy = isAutoVerification ? Int32.Parse(userIdClaim!) : 0,
                        VoucherNarration = narration,
                        OtherBrID = 0,
                        VoucherNo = nextVrNo,
                        VoucherStatus = isAutoVerification ? "V" : "A",
                        VoucherType = (int)Enums.VoucherType.RD,
                        VoucherSubType = (int)Enums.VoucherSubType.PreMature,
                    };

                    var voucherInfo = _memberService.MapToEntity(dto.Voucher!);
                    await _context.voucher.AddAsync(voucherInfo);
                    await _context.SaveChangesAsync();

                    DateTime valueDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Utc);
                    int row = 1;

                    VoucherCreditDebitDetails voucherDebitInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(accountId, branchId), accountId, branchId, Enums.VoucherStatus.RDDr.ToString(), narration, totalDebit, dto.Voucher.VoucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                    _context.vouchercreditdebitdetails.Add(voucherDebitInfo);
                    await _context.SaveChangesAsync();
                    row++;

                    if (dto.CreditAccountDetails!.SavingAccountId > 0 && dto.CreditAccountDetails!.SavingAmount > 0)
                    {
                        VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId((int)dto.CreditAccountDetails!.SavingAccountId, branchId), (int)dto.CreditAccountDetails!.SavingAccountId, branchId, Enums.VoucherStatus.Cr.ToString(), "Saving Account Credited", (decimal)dto.CreditAccountDetails!.SavingAmount, dto.Voucher.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);
                        _context.vouchercreditdebitdetails.Add(voucherCreditInfo);
                        row++;
                    }
                    if (dto.CreditAccountDetails!.CashAccountId > 0 && dto.CreditAccountDetails!.CashAmount > 0)
                    {
                        VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId((int)dto.CreditAccountDetails!.CashAccountId!, branchId), (int)dto.CreditAccountDetails!.CashAccountId!, branchId, Enums.VoucherStatus.Cr.ToString(), "Cash Account Credited", (decimal)dto.CreditAccountDetails!.CashAmount, dto.Voucher.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);
                        _context.vouchercreditdebitdetails.Add(voucherCreditInfo);
                        row++;
                    }
                    if (dto.CreditAccountDetails!.LoanAccountId > 0 && dto.CreditAccountDetails!.LoanAmount > 0)
                    {
                        VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId((int)dto.CreditAccountDetails!.LoanAccountId, branchId), (int)dto.CreditAccountDetails!.LoanAccountId, branchId, Enums.VoucherStatus.Cr.ToString(), "Loan Recovery", (decimal)dto.CreditAccountDetails!.LoanAmount, dto.Voucher.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);
                        _context.vouchercreditdebitdetails.Add(voucherCreditInfo);
                        row++;
                    }

                    var voucherRDDetailDebit = new VoucherRDDetail
                    {
                        BrId = branchId,
                        VoucherId = voucherInfo.Id,
                        VaccCrDrId = voucherDebitInfo.Id,
                        RdAccId = accountId,
                        RdAccDetId = rdDetailInfo.Id,
                        AmountCr = 0,
                        Operation = "RP",
                        VoucherDate = voucherDate,
                        AmountDr = Convert.ToDouble(dto.MatureRDInfo.PreMaturityAmount),
                        IntDr = 0,
                        IntCr = 0,
                        ValueDate = voucherDate,
                        VoucherMainStatus = dto.Voucher.VoucherStatus
                    };
                    await _context.voucherrddetail.AddAsync(voucherRDDetailDebit);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw;
            }

            return "Success";
        }

        // ───────────────────────────────────────────────
        // ALL CALCULATION HELPERS  ← COMPLETELY UNCHANGED
        // ───────────────────────────────────────────────
        public async Task<DateTime> CalculateMaturityDate(DateTime rdDate, int months, int days)
        {
            bool isLastDayOfMonth = IsLastDayOfMonth(rdDate);
            DateTime maturityDate;
            if (months > 0)
            {
                if (isLastDayOfMonth)
                {
                    int targetMonth = rdDate.Month + months;
                    int targetYear = rdDate.Year;
                    while (targetMonth > 12) { targetMonth -= 12; targetYear++; }
                    int lastDayOfTargetMonth = DateTime.DaysInMonth(targetYear, targetMonth);
                    maturityDate = new DateTime(targetYear, targetMonth, lastDayOfTargetMonth);
                }
                else
                {
                    maturityDate = rdDate.AddMonths(months);
                }
            }
            else
            {
                maturityDate = rdDate;
            }
            if (days > 0) maturityDate = maturityDate.AddDays(days);
            return maturityDate;
        }

        private bool IsLastDayOfMonth(DateTime date) =>
            date.Day == DateTime.DaysInMonth(date.Year, date.Month);

        private DateTime GetLastDayOfMonth(DateTime date)
        {
            int lastDay = DateTime.DaysInMonth(date.Year, date.Month);
            return new DateTime(date.Year, date.Month, lastDay);
        }

        public async Task<decimal> CalculatePreMaturityAmount(
                                                             DateTime dob,
                                                             decimal principal,
                                                             int periodInMonths,
                                                             DateTime currentDate,
                                                             int productId,
                                                             int branchId)
        {
            (decimal intRate, string slabName, string compoundingInterval, int intCompoundingInterval, int slabId)
                = await SlabInfo(principal, periodInMonths, currentDate, productId);

            int daysInAYear = 360;

            // Convert months → days (30 days per month, standard banking convention)
            int periodInDays = periodInMonths * 30;

            decimal rate = intRate / 100;
            decimal interest = (principal * rate * periodInDays) / daysInAYear;
            decimal preMaturityAmount = principal + interest;

            return Math.Round(preMaturityAmount, 2);
        }

        public async Task<decimal> CalculateMaturityAmount(decimal principal, decimal annualRate, DateTime rdDate, DateTime maturityDate, int productId, int branchId, int compoundingInterval)
        {
            int daysInAYear = 360;
            int actualDays = (maturityDate - rdDate).Days;
            decimal timeInYears = (decimal)actualDays / daysInAYear;
            decimal rate = annualRate / 100;
            int n = compoundingInterval switch
            {
                (int)Enums.CompoundingInterval.Monthly => 12,
                (int)Enums.CompoundingInterval.Quarterly => 4,
                (int)Enums.CompoundingInterval.Half_Yearly => 2,
                (int)Enums.CompoundingInterval.Yearly => 1,
                (int)Enums.CompoundingInterval.Two_Yearly => 24,
                _ => 4
            };
            decimal maturityAmount = principal * (decimal)Math.Pow((double)(1 + rate / n), (double)(n * timeInYears));
            return Math.Round(maturityAmount, 0);
        }

        private async Task<int> GetPeriodInDays(DateTime rdDate, int periodInMonths, int periodInDays, DateTime maturityDate)
        {
            if (periodInDays > 0) return periodInDays;
            if (periodInMonths > 0)
            {
                DateTime calculatedMaturity = await CalculateMaturityDate(rdDate, periodInMonths, periodInDays);
                return (calculatedMaturity - rdDate).Days;
            }
            return (maturityDate - rdDate).Days;
        }

        public async Task<(decimal intRate, string slabName, string compoundingInterval, int intCompoundingInterval, int slabId)> SlabInfo(
            decimal amount, int periodInMonths, DateTime rdDate, int productId, int paramCompoundingInterval = 0)
        {
            decimal intRate = 0;
            string slabName = string.Empty;
            string compoundingInterval = Enums.CompoundingInterval.Quarterly.ToString();
            int intCompoundingInterval = 0, slabId = 0;

            if (amount <= 0 || periodInMonths <= 0)
                return (intRate, slabName, compoundingInterval, intCompoundingInterval, slabId);

            int totalDays = await GetPeriodInDays(rdDate, periodInMonths, 0, DateTime.MinValue);

            var slab = await (from p in _context.rdinterestslabdetail.AsNoTracking()
                              join q in _context.rdinterestslab.AsNoTracking()
                              on new { slabId = p.RDIntSlabId, branchId = p.BranchId }
                              equals new { slabId = q.Id, branchId = q.BranchId }
                              where amount >= p.FromAmount && amount <= p.ToAmount
                                 && periodInMonths >= p.PeriodFrom && periodInMonths <= p.PeriodTo
                                 && q.RDProductId == productId
                                 && q.ApplicableDate <= rdDate
                              orderby q.ApplicableDate descending
                              select new { interestRate = p.InterestRate, slabName = q.SlabName, slabId = q.Id, kistInterval = p.KistInterval })
                             .FirstOrDefaultAsync();

            if (slab == null)
                return (intRate, slabName, compoundingInterval, intCompoundingInterval, slabId);

            return (
                slab.interestRate,
                slab.slabName,
                paramCompoundingInterval > 0 ? _commonfunctions.CompoundingIntervalStringFromValue(paramCompoundingInterval) : slab.kistInterval,
                paramCompoundingInterval > 0 ? paramCompoundingInterval : _commonfunctions.CompoundingIntervalFromString(slab.kistInterval),
                slab.slabId
            );
        }
    }
}