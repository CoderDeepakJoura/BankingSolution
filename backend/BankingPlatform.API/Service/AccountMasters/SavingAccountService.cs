using BankingPlatform.API.Common;
using BankingPlatform.API.Controllers.AccountMasters;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.Member;
using BankingPlatform.API.DTO.ProductMasters.Saving;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.Mappers.Voucher;
using BankingPlatform.API.Services;
using BankingPlatform.Infrastructure.Models.AccMasters;
using BankingPlatform.Infrastructure.Models.member;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Client;
using System.Security.Claims;
using System.Security.Principal;
using System.Text.Json;

namespace BankingPlatform.API.Service.AccountMasters
{
    public class SavingAccountService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly ImageService _imageService;
        private readonly MemberService _memberService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly VoucherMapper _voucherMapper;

        public SavingAccountService(
            BankingDbContext context,
            CommonFunctions commonFunctions,
            ImageService imageService,
            MemberService memberService,
            IHttpContextAccessor httpContextAccessor,
            VoucherMapper voucherMapper)
        {
            _context = context;
            _commonfunctions = commonFunctions;
            _imageService = imageService;
            _memberService = memberService;
            _httpContextAccessor = httpContextAccessor;
            _voucherMapper = voucherMapper;
        }

        public async Task<string> CreateNewSavingAccAsync(CommonAccMasterDTO dto, IFormFile? picture = null , IFormFile? signature = null)
        {
            // Validate duplicate account number
            var duplicateFields = await _context.accountmaster
                .Where(x => x.BranchId == dto.AccountMasterDTO!.BranchId
                    && x.AccTypeId == (int)Enums.AccountTypes.Saving
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
                (int headId, long headCode) = await _commonfunctions.GetSavingProductPrincipalHead(dto.AccountMasterDTO!.BranchId, (int)dto.AccountMasterDTO.GeneralProductId!);
                if (headId == 0 || headCode == 0)
                    return "Principal Balance Head Code not configured properly. Kindly configure it in Saving Product Master.";
                dto.AccountMasterDTO!.HeadId = headId;
                dto.AccountMasterDTO!.HeadCode = headCode;
                dto.AccountMasterDTO!.addedUsing = dto.AccountMasterDTO.addedUsing;
                dto.AccountMasterDTO!.AccountNumber = "";
                var accountMasterInfo = _memberService.MapToEntity(dto.AccountMasterDTO!);
                accountMasterInfo.AccTypeId = (int)Enums.AccountTypes.Saving;
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
                AccountDocDetails accountdocdetails = new();
                if (picture != null)
                {
                    var (fileName, extension) = await _imageService.SaveAccountImageAsync(
                        picture,
                        accountId,
                        "picture",
                        "Account_Images",
                        "Pictures"
                    );
                    accountdocdetails.PicExt = extension;
                }

                if (signature != null)
                {
                    var (fileName, extension) = await _imageService.SaveAccountImageAsync(
                        signature,
                        accountId,
                        "signature",
                        "Account_Images",
                        "Signatures"
                    );
                    accountdocdetails.SignExt = extension;
                }
                accountdocdetails.AccountId = accountId;
                accountdocdetails.BranchId = branchId;
                await _context.accountdocdetails.AddAsync(accountdocdetails);

                // 4. Save Joint Account Holders (if operation type is Joint)
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

                    // 5. Save Joint Withdrawal Configuration
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
                if (dto.Voucher!.OpeningAmount > 0)
                {
                    AccOpeningBalance accOpeningBalance = _memberService.AccOpeningBalance((decimal)dto.Voucher.OpeningAmount, (int)Enums.AccountTypes.Saving, accountId, branchId, dto.Voucher.OpeningBalanceType!);
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
                        VoucherType = (int)Enums.VoucherType.Saving,
                        VoucherSubType = (int)Enums.VoucherSubType.Deposit,
                    };

                    var voucherInfo = _memberService.MapToEntity(dto.Voucher!);
                    await _context.voucher.AddAsync(voucherInfo);
                    await _context.SaveChangesAsync();
                    DateTime valueDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Utc);
                    int row = 1;
                    VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(accountId, branchId), accountId, branchId, Enums.VoucherStatus.Cr.ToString(), narration, totalDebit, dto.Voucher.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);

                    _context.vouchercreditdebitdetails.Add(voucherCreditInfo);
                    row++;

                    VoucherCreditDebitDetails voucherDebitInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(debitAccountId, branchId), (int)debitAccountId, branchId, Enums.VoucherStatus.Dr.ToString(), narration, totalDebit, dto.Voucher.VoucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                    _context.vouchercreditdebitdetails.Add(voucherDebitInfo);
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

        public async Task<(List<CommonAccMasterDTO> Items, int TotalCount)> GetAllSavingAccountsAsync(
    int branchId,
    LocationFilterDTO filter)
        {
            var query = _context.accountmaster
                .Where(x => x.BranchId == branchId && x.AccTypeId == (int)Enums.AccountTypes.Saving);

            // ✅ CHANGE: Bring data to memory FIRST
            var allAccounts = await query.ToListAsync();

            // Search filter
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();
                allAccounts = allAccounts  // ✅ Filter in memory
                    .Where(m =>
                        m.AccountName!.ToLower().Contains(term) ||
                        m.AccSuffix.ToString()!.Contains(term) ||
                        m.AccPrefix!.ToString()!.Contains(term))
                    .ToList();
            }

            // ✅ Get total count AFTER filter
            var totalCount = allAccounts.Count;

            // ✅ Do pagination in memory
            var accountMasterInfo = allAccounts
                .OrderBy(m => m.AccountName)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToList();

            var accIds = accountMasterInfo.Select(m => m.ID).ToList();
            var accOpeningBalances = await _context.accopeningbalance
                .Where(n => accIds.Contains(n.AccountId) && n.BranchId == branchId)
                .ToListAsync();
            var items = accountMasterInfo.Select(m =>
            {
                var openingBalInfo = accOpeningBalances.Where(x => x.AccountId == m.ID).FirstOrDefault();
                string openingBalance = openingBalInfo != null ? openingBalInfo!.OpeningAmount + " " + openingBalInfo.EntryType : "0";
                return new CommonAccMasterDTO
                {
                    OpeningBalance = openingBalance,
                    AccountMasterDTO = _memberService.MapToDTO(m),
                    ProductName = _commonfunctions.GetSavingProductNameFromId(branchId, (int)m.GeneralProductId!)
                };
            }).ToList();

            return (items, totalCount);
        }


        public async Task<CommonAccMasterDTO?> GetSavingAccountByIdAsync(int accountId, int branchId)
        {
            var accountMaster = await _context.accountmaster
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.ID == accountId && m.BranchId == branchId);

            if (accountMaster == null) return null;

            // Load related data
            var docDetails = await _context.accountdocdetails
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.AccountId == accountId && d.BranchId == branchId);

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
                AccountDocDetailsDTO = docDetails != null ? new AccountDocDetailsDTO
                {
                    Id = docDetails.Id,
                    BranchId = docDetails.BranchId,
                    AccountId = docDetails.AccountId,
                    PicExt = docDetails.PicExt,
                    SignExt = docDetails.SignExt,
                    PictureUrl = $"/uploads/accounts/{accountId}/picture.{docDetails.PicExt}",
                    SignatureUrl = $"/uploads/accounts/{accountId}/signature.{docDetails.SignExt}",
                } : null,
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
                OpeningBalance = accOpeningBalDetail != null ? accOpeningBalDetail.OpeningAmount.ToString() : "0",
                OpeningBalanceType = accOpeningBalDetail != null ? accOpeningBalDetail.EntryType: "Cr"
            };
        }

        public async Task<string> UpdateSavingAccountAsync(CommonAccMasterDTO dto, IFormFile? picture, IFormFile? signature)
        {
            var claimsPrincipal = _httpContextAccessor.HttpContext?.User;
            var accountMaster = await _context.accountmaster
                .FirstOrDefaultAsync(m => m.ID == dto.AccountMasterDTO!.AccId && m.BranchId == dto.AccountMasterDTO.BranchId);

            if (accountMaster == null) return "Account not found.";

            (int headId, long headCode) = await _commonfunctions.GetSavingProductPrincipalHead(dto.AccountMasterDTO!.BranchId, (int)dto.AccountMasterDTO.GeneralProductId!);
            if (headId == 0 || headCode == 0)
                return "Principal Balance Head Code not configured properly. Kindly configure it in Saving Product Master.";

            // Check for duplicate account number
            var duplicateAccount = await _context.accountmaster
                .Where(x => x.ID != dto.AccountMasterDTO!.AccId
                    && x.BranchId == dto.AccountMasterDTO.BranchId
                    && x.GeneralProductId == dto.AccountMasterDTO.GeneralProductId
                    && x.AccTypeId == (int)Enums.AccountTypes.Saving
                    && x.AccSuffix == dto.AccountMasterDTO!.AccSuffix)  
                .AnyAsync();

            if (duplicateAccount)
                return "Account Suffix already exists";

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                int accountId = dto.AccountMasterDTO!.AccId;
                int branchId = dto.AccountMasterDTO!.BranchId;
                dto.AccountMasterDTO.AccTypeId = (int)Enums.AccountTypes.Saving;
                dto.AccountMasterDTO!.HeadId = headId;
                dto.AccountMasterDTO!.HeadCode = headCode;
                dto.AccountMasterDTO!.addedUsing = dto.AccountMasterDTO.addedUsing;
                dto.AccountMasterDTO!.AccountNumber = "";
                // 1. Update Account Master
                _memberService.MapToEntity(dto.AccountMasterDTO!, accountMaster);

                // 2. Update Document Details
                var existingDocs = await _context.accountdocdetails
                    .FirstOrDefaultAsync(d => d.AccountId == accountId && d.BranchId == branchId);

                if (dto.AccountDocDetailsDTO != null)
                {
                    if (existingDocs != null)
                    {
                        var docId = existingDocs.Id;
                        if (picture != null)
                        {
                            if (_imageService.DeleteAccountImage(accountId, "picture", existingDocs.PicExt, "Account_Images", "Pictures"))
                            {
                                var (fileName, extension) = await _imageService.SaveAccountImageAsync(
                                    picture,
                                    accountId,
                                    "picture",
                                    "Account_Images",
                                    "Pictures"
                                );
                                dto.AccountDocDetailsDTO.PicExt = extension;
                            }
                        }
                        else
                            dto.AccountDocDetailsDTO.PicExt = existingDocs.PicExt;

                        // Handle member signature update
                        if (signature != null)
                        {
                            if (_imageService.DeleteAccountImage(accountId, "signature", existingDocs.PicExt, "Account_Images", "Signatures"))
                            {
                                var (fileName, extension) = await _imageService.SaveAccountImageAsync(
                                    signature,
                                    accountId,
                                    "signature",
                                    "Account_Images",
                                    "Signatures"
                                );
                                dto.AccountDocDetailsDTO.SignExt = extension;
                            }
                        }
                        else
                            dto.AccountDocDetailsDTO.SignExt = existingDocs.SignExt;

                        if ((picture != null || signature != null))
                        {
                            // Restore the keys after mapping
                            existingDocs.Id = docId;
                            existingDocs.PicExt = dto.AccountDocDetailsDTO.PicExt;
                            existingDocs.SignExt = dto.AccountDocDetailsDTO.SignExt;
                        }
                    }
                    else
                    {
                        if (picture != null)
                        {
                            var (fileName, extension) = await _imageService.SaveAccountImageAsync(
                                picture,
                                accountId,
                                "picture",
                                "Account_Images",
                                "Pictures"
                            );
                            dto.AccountDocDetailsDTO.PicExt = extension;
                        }

                        if (signature != null)
                        {
                            var (fileName, extension) = await _imageService.SaveAccountImageAsync(
                                signature,
                                accountId,
                                "signature",
                                "Account_Images",
                                "Signatures"
                            );
                            dto.AccountDocDetailsDTO.SignExt = extension;
                        }
                        var newDocs = new AccountDocDetails
                        {
                            BranchId = branchId,
                            AccountId = accountId,
                            PicExt = dto.AccountDocDetailsDTO.PicExt,
                            SignExt = dto.AccountDocDetailsDTO.SignExt
                        };
                        await _context.accountdocdetails.AddAsync(newDocs);
                    }
                }

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

                // 4. Update Joint Account Holders
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
                            BranchId = dto.AccountMasterDTO!.BranchId,
                            AccountName = jointDTO.AccountName,
                            RelationWithAccHolder = jointDTO.RelationWithAccHolder,
                            Dob = DateTime.SpecifyKind(jointDTO.Dob, DateTimeKind.Unspecified),
                            AddressLine = jointDTO.AddressLine,
                            Gender = jointDTO.Gender,
                            MemberId = jointDTO.MemberId,
                            MemberBrId = jointDTO.MemberBrId,
                            JointWithAccountId = dto.AccountMasterDTO.AccId,
                            jointaccholderaccountnumber = jointDTO.JointAccHolderAccountNumber!
                        };
                        await _context.jointaccountinfo.AddAsync(jointHolder);
                    }
                }

                // 5. Update Withdrawal Config
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
                            BranchId = dto.AccountMasterDTO!.BranchId,
                            AccountId = dto.AccountMasterDTO!.AccId,
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
                        AccOpeningBalance accOpeningBalance = _memberService.AccOpeningBalance((decimal)dto.Voucher.OpeningAmount, (int)Enums.AccountTypes.Saving, accountId, branchId, dto.Voucher.OpeningBalanceType!);
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

        public async Task<string> DeleteSavingAccountAsync(int accountId, int branchId, int voucherId)
        {
            var accountMaster = await _context.accountmaster
                .FirstOrDefaultAsync(m => m.ID == accountId && m.BranchId == branchId);

            if (accountMaster == null) return "Account not found.";

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var accOpeningBalance = await _context.accopeningbalance
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.AccTypeId == (int)Enums.AccountTypes.Saving && x.AccountId == accountId);
                if (accOpeningBalance != null) _context.accopeningbalance.Remove(accOpeningBalance);

                var accountDocDetails = await _context.accountdocdetails
                .FirstOrDefaultAsync(x => x.BranchId == branchId && x.AccountId == accountId);
                string picExt = accountDocDetails != null ? accountDocDetails.PicExt : "";
                string signExt = accountDocDetails != null ? accountDocDetails.SignExt : "";
                // All related data will be deleted automatically due to CASCADE DELETE in DB
                _context.accountmaster.Remove(accountMaster);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                if (picExt != "")
                    _imageService.DeleteAccountImage(accountId, "picture", picExt, "Account_Images", "Pictures");
                if (signExt != "")
                    _imageService.DeleteAccountImage(accountId, "signature", picExt, "Account_Images", "Signatures");
                return "Success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"Error: {ex.Message}";
            }
        } 
        public async Task<string> CloseSavingAccount(CloseSavingAccDTO dto)
        {
            var savingAccData = await _context.accountmaster.FirstOrDefaultAsync(x => x.ID == dto.DebitAccountId && x.BranchId == dto.BranchId);
            if (savingAccData == null)
                return "Account not found.";
            if (savingAccData!.IsAccClosed)
                return "This account can\'t be closed as it has already been closed.";
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                savingAccData.IsAccClosed = true;
                savingAccData.ClosingDate = dto.VoucherDate;
                savingAccData.ClosingRemarks = dto.Narration;
                await _context.SaveChangesAsync();
                int debitAccountId = (int)dto.DebitAccountId;
                decimal totalDebit = (decimal)dto.TotalAmount;
                int nextVrNo = await _commonfunctions.GetLatestVoucherNo(dto.BranchId);
                bool isAutoVerification = await _commonfunctions.IsAutoVerification(dto.BranchId);
                string narration = dto.Narration ?? "";
                DateTime voucherDate = DateTime.SpecifyKind(dto.VoucherDate, DateTimeKind.Unspecified);
                if (dto.TotalInterestAmount > 0)
                {
                    VoucherDTO voucherDTO = new VoucherDTO
                    {
                        ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                        VoucherDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Unspecified),

                        // Other non-DateTime fields
                        AddedBy = Int32.Parse(_commonfunctions.GetCurrentUserId()),
                        BrID = dto.BranchId,
                        ModifiedBy = 0,
                        VerifiedBy = isAutoVerification ? Int32.Parse(_commonfunctions.GetCurrentUserId()) : 0,
                        VoucherNarration = "Saving Interest posted with amount: " + dto.TotalInterestAmount,
                        OtherBrID = 0,
                        VoucherNo = nextVrNo,
                        VoucherStatus = isAutoVerification ? "V" : "A",
                        VoucherType = (int)Enums.VoucherType.Saving,
                        VoucherSubType = (int)Enums.VoucherSubType.InterestPosting,
                    };
                    var voucherInfo = _memberService.MapToEntity(voucherDTO);
                    await _context.voucher.AddAsync(voucherInfo);
                    await _context.SaveChangesAsync();
                    DateTime valueDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Utc);
                    int savingIntExpAccount = await _commonfunctions.GetSavingInterestExpenseAccount(dto.SavingProductId, dto.BranchId);
                    if (savingIntExpAccount == 0)
                        return "Please enter saving Interest Account in saving product branchwise rule before closing the account."; 
                    int row = 1;
                    VoucherCreditDebitDetails voucherDebitInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(savingIntExpAccount, dto.BranchId), savingIntExpAccount, dto.BranchId, Enums.VoucherStatus.Dr.ToString(), "", dto.TotalInterestAmount, voucherDTO.VoucherStatus, valueDate, "Dr", voucherInfo.Id, row);

                    _context.vouchercreditdebitdetails.Add(voucherDebitInfo);
                    row++;

                    VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId((int)dto.DebitAccountId, dto.BranchId), dto.DebitAccountId, dto.BranchId, Enums.VoucherStatus.Cr.ToString(), "Saving Interest posted: " + dto.TotalInterestAmount, (decimal)dto.TotalInterestAmount, voucherDTO.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);

                    await _context.vouchercreditdebitdetails.AddAsync(voucherCreditInfo);
                    await _context.SaveChangesAsync();

                    VoucherSavingDetail voucherSavingDetail = _voucherMapper.voucherSavingDetails(dto.BranchId, voucherCreditInfo.AccountId, 0, voucherCreditInfo.Id, voucherInfo.Id, voucherCreditInfo.Narration!, dto.TotalInterestAmount, voucherDTO.VoucherStatus, voucherDate, valueDate, "SIP", 0);
                    await _context.vouchersavingdetail.AddAsync(voucherSavingDetail);
                    await _context.SaveChangesAsync();

                }
                if(dto.TotalAmount > 0)
                {
                    int row = 1;
                    VoucherDTO voucherDTO = new VoucherDTO
                    {
                        ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                        VoucherDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Unspecified),

                        // Other non-DateTime fields
                        AddedBy = Int32.Parse(_commonfunctions.GetCurrentUserId()),
                        BrID = dto.BranchId,
                        ModifiedBy = 0,
                        VerifiedBy = isAutoVerification ? Int32.Parse(_commonfunctions.GetCurrentUserId()) : 0,
                        VoucherNarration = narration ?? "Saving account closed with amount: " + dto.TotalAmount,
                        OtherBrID = 0,
                        VoucherNo = nextVrNo,
                        VoucherStatus = isAutoVerification ? "V" : "A",
                        VoucherType = (int)Enums.VoucherType.Saving,
                        VoucherSubType = (int)Enums.VoucherSubType.Withdrawal,
                    };

                    var voucherInfo = _memberService.MapToEntity(voucherDTO);
                    await _context.voucher.AddAsync(voucherInfo);
                    await _context.SaveChangesAsync();
                    DateTime valueDate = DateTime.SpecifyKind(voucherDate, DateTimeKind.Utc);
                    VoucherCreditDebitDetails voucherCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(debitAccountId, dto.BranchId), dto.CreditAccountId, dto.BranchId, Enums.VoucherStatus.Cr.ToString(), "", totalDebit - (dto.closingCharges ?? 0), voucherDTO.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);

                    _context.vouchercreditdebitdetails.Add(voucherCreditInfo);
                    row++;

                    if(dto.closingCharges > 0 && dto.IncomeAccountId > 0)
                    {
                        VoucherCreditDebitDetails voucherIncomeCreditInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId((int)dto.IncomeAccountId, dto.BranchId), (int)dto.IncomeAccountId, dto.BranchId, Enums.VoucherStatus.Cr.ToString(), "Account Closing Charges: " + dto.closingCharges, (decimal)dto.closingCharges, voucherDTO.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);

                        _context.vouchercreditdebitdetails.Add(voucherIncomeCreditInfo);
                        row++;
                    }

                    VoucherCreditDebitDetails voucherDebitInfo = _memberService.voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(debitAccountId, dto.BranchId), (int)debitAccountId, dto.BranchId, Enums.VoucherStatus.Dr.ToString(), "", totalDebit, voucherDTO.VoucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                    _context.vouchercreditdebitdetails.Add(voucherDebitInfo);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                return "Success";
            }
            catch(Exception ex)
            {
                await transaction.RollbackAsync();
                return $"Error: {ex.Message}";
            }
        }
        public class CloseSavingAccDTO
        {
            public int AccountId { get; set; }
            public int BranchId { get; set; }
            public int CreditAccountId { get; set; }
            public int DebitAccountId { get; set; }
            public int? IncomeAccountId { get; set; }
            public DateTime VoucherDate { get; set; }
            public decimal TotalAmount { get; set; }
            public decimal TotalInterestAmount { get; set; }
            public string? Narration { get; set; }
            public decimal? closingCharges { get; set; }
            public int SavingProductId { get; set; }
        }
    }
}
