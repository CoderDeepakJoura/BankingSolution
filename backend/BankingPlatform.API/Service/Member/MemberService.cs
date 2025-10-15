using BankingPlatform.API.Common;
using BankingPlatform.API.Controllers.Member;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.Member;
using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.Service;
using BankingPlatform.Infrastructure;
using BankingPlatform.Infrastructure.Models.AccMasters;
using BankingPlatform.Infrastructure.Models.member;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Configuration;
using System;

namespace BankingPlatform.API.Services
{
    public class MemberService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;
        private readonly ImageService _imageService;
        public MemberService(BankingDbContext context, CommonFunctions commonFunctions, ImageService imageService)
        {
            _context = context;
            _commonfunctions = commonFunctions;
            _imageService = imageService;
        }

        // CREATE
        public async Task<CombinedMemberDTO> CreateMemberAsync(CombinedMemberDTO dto, IFormFile? memberPhoto = null,
    IFormFile? memberSignature = null)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                static DateTime ToUnspecified(DateTime dateTime) =>
        DateTime.SpecifyKind(dateTime, DateTimeKind.Unspecified);

                dto.Member.JoiningDate = ToUnspecified(dto.Member.JoiningDate);
                dto.Member.MemberStatusDate = ToUnspecified(dto.Member.MemberStatusDate);
                dto.Member.DOB = ToUnspecified(dto.Member.DOB);
                dto.Member.MemberName = dto.Member.MemberName.Trim();
                dto.Member.MemberType = dto.Member.NominalMembershipNo != "" ? 1 : 2;
                dto.Member.DefAreaBrId = dto.Member.BranchId;
                var member = MapToEntity(dto.Member);
                await _context.member.AddAsync(member);
                await _context.SaveChangesAsync();

                foreach (var nomineeDto in dto.Nominees)
                {
                    var nominee = MapToEntity(nomineeDto);
                    nominee.MemberId = member.Id;
                    nominee.BranchId = member.BranchId;
                    nominee.DOB = DateTime.SpecifyKind(nominee.DOB, DateTimeKind.Unspecified);
                    nominee.NominationDate = DateTime.SpecifyKind(nominee.NominationDate ?? DateTime.Now, DateTimeKind.Unspecified);
                    nominee.NomRelativeName = nomineeDto.NomRelativeName;
                    await _context.membernomineedetails.AddAsync(nominee);
                }
                await _context.SaveChangesAsync();

                var memberlocationdetails = MapToEntity(dto.LocationDetails!);
                memberlocationdetails.MemberId = member.Id;
                memberlocationdetails.BranchId = member.BranchId;
                await _context.memberlocationdetails.AddAsync(memberlocationdetails);
                await _context.SaveChangesAsync();

                var memberdocdetails = MapToEntity(dto.DocumentDetails!);
                if (memberPhoto != null)
                {
                    var (fileName, extension) = await _imageService.SaveImageAsync(
                        memberPhoto,
                        member.Id,
                        "picture",
                        "Member_Images",
                        "Pictures"
                    );
                    memberdocdetails.MemberPicExt = extension;
                    // Store filename in a new field or use a naming convention
                }

                if (memberSignature != null)
                {
                    var (fileName, extension) = await _imageService.SaveImageAsync(
                        memberSignature,
                        member.Id,
                        "signature",
                        "Member_Images",
                        "Signatures"
                    );
                    memberdocdetails.MemberSignExt = extension;
                }
                memberdocdetails.MemberId = member.Id;
                memberdocdetails.BranchId = member.BranchId;
                await _context.memberdocdetails.AddAsync(memberdocdetails);
                await _context.SaveChangesAsync();

                
                // SM Account
                dto.AccMaster!.AccOpeningDate = member.JoiningDate;
                dto.AccMaster.AccTypeId = (int)Enums.AccountTypes.ShareMoney;
                dto.AccMaster.BranchId = member.BranchId;
                dto.AccMaster.MemberId = member.Id;
                dto.AccMaster.MemberBranchId = member.BranchId;
                dto.AccMaster.HeadCode = CommonFunctions.shareMoneyCapitalHeadCode;
                dto.AccMaster.HeadId = await _commonfunctions.GetHeadIdFromHeadCode(member.BranchId, dto.AccMaster.HeadCode);

                var accountMasterInfo = MapToEntity(dto.AccMaster!);
                await _context.accountmaster.AddAsync(accountMasterInfo);
                await _context.SaveChangesAsync();
                int smAccountId = accountMasterInfo.ID;

                // Dividend Account
                dto.AccMaster.HeadCode = CommonFunctions.dividendPayableHeadCode;
                dto.AccMaster.HeadId = await _commonfunctions.GetHeadIdFromHeadCode(member.BranchId, dto.AccMaster.HeadCode);
                dto.AccMaster.AccTypeId = (int)Enums.AccountTypes.General;
                accountMasterInfo = MapToEntity(dto.AccMaster!);
                await _context.accountmaster.AddAsync(accountMasterInfo);
                await _context.SaveChangesAsync();

                string narration = dto.Voucher.VoucherNarration!;
                int nextVrNo = await _commonfunctions.GetLatestVoucherNo(member.BranchId);
                bool isAutoVerification = await _commonfunctions.IsAutoVerification(member.BranchId);
                decimal smAmount = dto.Voucher.smAmount ?? 0;
                int admissionFeeAccountId = dto.Voucher.admissionFeesAccountId ?? 0;
                decimal admissionFeeAmount = dto.Voucher.admissionFeeAmount ?? 0;
                int debitAccountId = dto.Voucher.DebitAccountId ?? 0;
                decimal TotalDebit = dto.Voucher.TotalDebit ?? 0;
                decimal openingAmount = dto.Voucher.OpeningAmount ?? 0;
                dto.Voucher = new VoucherDTO
                {
                    ActualTime = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                    VoucherDate = DateTime.SpecifyKind(member.JoiningDate, DateTimeKind.Unspecified),

                    // Other non-DateTime fields
                    AddedBy = member.Id,
                    BrID = member.BranchId,
                    ModifiedBy = 0,
                    VerifiedBy = isAutoVerification ? member.Id : 0,
                    VoucherNarration = narration,
                    OtherBrID = 0,
                    VoucherNo = nextVrNo,
                    VoucherStatus = isAutoVerification ? "V" : "A",
                    VoucherType = (int)Enums.VoucherType.Member,
                    VoucherSubType = (int)Enums.VoucherSubType.ShareMoney,
                };

                var voucherInfo = MapToEntity(dto.Voucher!);
                await _context.voucher.AddAsync(voucherInfo);
                await _context.SaveChangesAsync();
                DateTime valueDate = DateTime.SpecifyKind(dto.Member.JoiningDate, DateTimeKind.Utc);
                int row = 1;
                VoucherCreditDebitDetails voucherCreditInfo = voucherCreditDebitDetails(CommonFunctions.shareMoneyCapitalHeadCode, smAccountId, member.BranchId, Enums.VoucherStatus.MemberSM.ToString(), narration, smAmount, dto.Voucher.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);

                _context.vouchercreditdebitdetails.Add(voucherCreditInfo);
                row++;

                if (admissionFeeAccountId > 0 && admissionFeeAmount > 0)
                {
                    VoucherCreditDebitDetails admissionFeeInfo = voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(admissionFeeAccountId, member.BranchId), (int)admissionFeeAccountId, member.BranchId, Enums.VoucherStatus.Cr.ToString(), "", admissionFeeAmount, dto.Voucher.VoucherStatus, valueDate, "Cr", voucherInfo.Id, row);
                    _context.vouchercreditdebitdetails.Add(admissionFeeInfo);
                    row++;
                }

                VoucherCreditDebitDetails voucherDebitInfo = voucherCreditDebitDetails(await _commonfunctions.GetAccountHeadCodeFromAccId(debitAccountId, member.BranchId), (int)debitAccountId, member.BranchId, Enums.VoucherStatus.Dr.ToString(), narration, TotalDebit, dto.Voucher.VoucherStatus, valueDate, "Dr", voucherInfo.Id, row);
                _context.vouchercreditdebitdetails.Add(voucherDebitInfo);

                if (openingAmount > 0)
                {
                    AccOpeningBalance accOpeningBalance = AccOpeningBalance(openingAmount, (int)Enums.AccountTypes.ShareMoney, smAccountId, member.BranchId, "Cr");
                    await _context.accopeningbalance.AddAsync(accOpeningBalance);

                }
                if (dto.Voucher.OpeningAmount > 0)
                {
                    AccOpeningBalance accOpeningBalance = AccOpeningBalance((decimal)dto.Voucher.OpeningAmount, (int)Enums.VoucherSubType.ShareMoney, smAccountId, member.BranchId, "Cr");
                    await _context.accopeningbalance.AddAsync(accOpeningBalance);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(CreateMemberAsync), nameof(MemberController));
                throw;
            }

            return dto;
        }

        // READ (all members with nominees)
        public async Task<(List<CombinedMemberDTO> Items, int TotalCount)> GetAllMembersAsync(int branchId, LocationFilterDTO filter)
        {
            var query = _context.member
                .AsNoTracking()
                .Where(x => x.BranchId == branchId);

            // Enhanced Search filter - searches across multiple tables
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.ToLower();

                // Get member IDs that match in related tables
                var matchingMemberIdsFromDocuments = await _context.memberdocdetails
                    .AsNoTracking()
                    .Where(d => d.BranchId == branchId &&
                           (d.PanCardNo.ToLower().Contains(term) ||
                            d.AadhaarCardNo.ToLower().Contains(term)))
                    .Select(d => d.MemberId)
                    .ToListAsync();

                var matchingMemberIdsFromLocation = await _context.memberlocationdetails
                    .AsNoTracking()
                    .Where(l => l.BranchId == branchId &&
                           (l.AddressLine1.ToLower().Contains(term) ||
                            l.AddressLine2.ToLower().Contains(term) ||
                            l.AddressLineSL1.ToLower().Contains(term) ||
                            l.AddressLineSL2.ToLower().Contains(term)))
                    .Select(l => l.MemberId)
                    .ToListAsync();

                var matchingMemberIdsFromAccount = await _context.accountmaster
                    .AsNoTracking()
                    .Where(a => a.MemberBranchID == branchId &&
                           a.MemberId != null &&
                           (a.AccTypeId == (int)Enums.AccountTypes.ShareMoney ||
                            a.AccTypeId == (int)Enums.AccountTypes.General) &&
                           (a.AccountNumber.ToLower().Contains(term) ||
                            a.AccountName.ToLower().Contains(term)))
                    .Select(a => a.MemberId.Value)
                    .ToListAsync();

                // Combine all matching member IDs
                var matchingMemberIds = new HashSet<int>(
                    matchingMemberIdsFromDocuments
                        .Concat(matchingMemberIdsFromLocation)
                        .Concat(matchingMemberIdsFromAccount)
                );

                // Apply search filter
                query = query.Where(m =>
                    // Search in Member table
                    m.MemberName.ToLower().Contains(term) ||
                    m.MemberNameSL.ToLower().Contains(term) ||
                    m.RelativeName.ToLower().Contains(term) ||
                    m.NominalMembershipNo.ToLower().Contains(term) ||
                    m.PermanentMembershipNo.ToLower().Contains(term) ||
                    m.PhoneNo1.ToLower().Contains(term) ||
                    m.PhoneNo2.ToLower().Contains(term) ||
                    // Search in related tables (via member IDs)
                    matchingMemberIds.Contains(m.Id)
                );
            }

            var totalCount = await query.CountAsync();

            var memberInfo = await query
                .OrderBy(m => m.MemberName)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            // Get all member IDs for batch loading related data
            var memberIds = memberInfo.Select(m => m.Id).ToList();

            // Batch load all related data
            var nominees = await _context.membernomineedetails
                .AsNoTracking()
                .Where(n => memberIds.Contains(n.MemberId) && n.BranchId == branchId)
                .ToListAsync();

            var locationDetails = await _context.memberlocationdetails
                .AsNoTracking()
                .Where(l => memberIds.Contains(l.MemberId) && l.BranchId == branchId)
                .ToListAsync();

            var documentDetails = await _context.memberdocdetails
                .AsNoTracking()
                .Where(d => memberIds.Contains(d.MemberId) && d.BranchId == branchId)
                .ToListAsync();

            var accountMasters = await _context.accountmaster
                .AsNoTracking()
                .Where(a => memberIds.Contains(a.MemberId ?? 0) &&
                           a.MemberBranchID == branchId &&
                           (a.AccTypeId == (int)Enums.AccountTypes.ShareMoney ||
                            a.AccTypeId == (int)Enums.AccountTypes.General))
                .ToListAsync();

            int SMAccID = accountMasters.Where(x => x.AccTypeId == (int)Enums.AccountTypes.ShareMoney).Select(x => x.ID).FirstOrDefault();
            int vrSubType = (int)Enums.VoucherSubType.ShareMoney;
            int vrType = (int)Enums.VoucherType.Member;

            int voucherId = await _commonfunctions.GetVoucherIdFromVTypeAndSubType(vrSubType, vrType, SMAccID, branchId);
            

            var items = memberInfo.Select(member =>
            {
                var memberNominees = nominees.Where(n => n.MemberId == member.Id).ToList();
                var memberLocation = locationDetails.FirstOrDefault(l => l.MemberId == member.Id);
                var memberDocuments = documentDetails.FirstOrDefault(d => d.MemberId == member.Id);
                var memberAccount = accountMasters.FirstOrDefault(a => a.MemberId == member.Id &&
                                                                      a.AccTypeId == (int)Enums.AccountTypes.ShareMoney);
               
                return new CombinedMemberDTO
                {
                    Member = MapToDTO(member),
                    Nominees = memberNominees.Select(MapToDTO).ToList(),
                    LocationDetails = MapToDTO(memberLocation!),
                    DocumentDetails = MapToDTO(memberDocuments!),
                    AccMaster = memberAccount != null ? MapToDTO(memberAccount) : null,
                    VoucherId = voucherId

                };
            }).ToList();

            return (items, totalCount);
        }


        // READ (single by id)
        public async Task<CombinedMemberDTO?> GetMemberByIdAsync(int id, int branchId)
       {
            var member = await _context.member.FirstOrDefaultAsync(m => m.Id == id && m.BranchId == branchId);
            if (member == null) return null;

            var nominees = await _context.membernomineedetails
                .Where(n => n.MemberId == id && n.BranchId == branchId)
                .ToListAsync();

            var documentDetails = await _context.memberdocdetails.FirstOrDefaultAsync(x => x.BranchId == branchId && x.MemberId == id) ?? new ();
            var locationDetails = await _context.memberlocationdetails.FirstOrDefaultAsync(x => x.BranchId == branchId && x.MemberId == id) ?? new();
            var smAccInfo = await _context.accountmaster
                .AsNoTracking()
                .Where(a => a.MemberId == id &&
                           a.MemberBranchID == branchId &&
                           a.AccTypeId == (int)Enums.AccountTypes.ShareMoney)
                .FirstOrDefaultAsync();

            int vrSubType = (int)Enums.VoucherSubType.ShareMoney;
            int vrType = (int)Enums.VoucherType.Member;
            int voucherId = await _commonfunctions.GetVoucherIdFromVTypeAndSubType(vrSubType, vrType, smAccInfo!.ID, branchId);
            var narration = await _context.voucher.Where(x => x.Id == voucherId && x.BrID == branchId).Select(x => x.VoucherNarration).FirstOrDefaultAsync() ?? "";

            var existingOpeningAccInfo = await _context.accopeningbalance.FirstOrDefaultAsync(x => x.BranchId == member.BranchId && x.AccTypeId == (int)Enums.AccountTypes.ShareMoney && x.AccountId == smAccInfo!.ID);

            List<VoucherCreditDebitDetails> voucherCreditDebitDetails = await _commonfunctions.GetVoucherInfoFromVoucherId(voucherId, branchId);
            decimal smAmount = voucherCreditDebitDetails.Where(x => x.EntryStatus == Enums.VoucherStatus.MemberSM.ToString()).Select(x => x.VoucherAmount).FirstOrDefault();
            var admissionFeeInfo = voucherCreditDebitDetails.FirstOrDefault(x => x.EntryStatus == Enums.VoucherStatus.Cr.ToString());
            var totalDebitInfo = voucherCreditDebitDetails.Where(x => x.EntryStatus == Enums.VoucherStatus.Dr.ToString()).FirstOrDefault();

            VoucherDTO voucherDto = new VoucherDTO
            {
                TotalDebit = totalDebitInfo?.VoucherAmount ?? 0,
                smAmount = smAmount,
                admissionFeesAccountId = admissionFeeInfo != null ? admissionFeeInfo!.AccountId : 0,
                admissionFeeAmount = admissionFeeInfo != null ? admissionFeeInfo!.VoucherAmount : 0,
                DebitAccountId = totalDebitInfo?.AccountId ?? 0,
                OpeningAmount = existingOpeningAccInfo?.OpeningAmount > 0 ? existingOpeningAccInfo.OpeningAmount : 0,
                VoucherNarration = narration,
                admissionFeesAccount = await _commonfunctions.GetAccountNameFromAccId(admissionFeeInfo != null ? admissionFeeInfo!.AccountId : 0, branchId, true)
            };

            AccountMasterDTO accountMasterDTO = new AccountMasterDTO
            {
                AccountNumber = smAccInfo.AccountNumber,
                BranchId = smAccInfo.BranchId,
                SMAccId = smAccInfo.ID
            };

            return new CombinedMemberDTO
            {
                Member = MapToDTO(member),
                Nominees = nominees.Select(MapToDTO).ToList(),
                DocumentDetails = MapToDTO(documentDetails),
                LocationDetails = MapToDTO(locationDetails),
                Voucher = voucherDto,
                VoucherId = voucherId,
                AccMaster = accountMasterDTO
            };
        }

        // UPDATE
        public async Task<bool> UpdateMemberAsync(CombinedMemberDTO dto, IFormFile? memberPhoto = null, IFormFile? memberSignature = null)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                static DateTime ToUnspecified(DateTime dateTime) =>
                    DateTime.SpecifyKind(dateTime, DateTimeKind.Unspecified);

                // Find existing member
                var member = await _context.member.FirstOrDefaultAsync(m => m.Id == dto.Member.Id && m.BranchId == dto.Member.BranchId);
                if (member == null) return false;

                // Update member entity with DateTime handling
                dto.Member.JoiningDate = ToUnspecified(dto.Member.JoiningDate);
                dto.Member.MemberStatusDate = ToUnspecified(dto.Member.MemberStatusDate);
                dto.Member.DOB = ToUnspecified(dto.Member.DOB);
                dto.Member.MemberName = dto.Member.MemberName.Trim();
                dto.Member.MemberType = dto.Member.NominalMembershipNo != "" ? 1 : 2;

                // Map updated values to existing member entity
                MapToEntity(dto.Member, member);
                await _context.SaveChangesAsync();

                // Update Nominees - Remove existing and add new ones
                var existingNominees = await _context.membernomineedetails
                    .Where(n => n.MemberId == member.Id && n.BranchId == member.BranchId)
                    .ToListAsync();

                _context.membernomineedetails.RemoveRange(existingNominees);

                foreach (var nomineeDto in dto.Nominees)
                {
                    var nominee = MapToEntity(nomineeDto);
                    nominee.MemberId = member.Id;
                    nominee.BranchId = member.BranchId;
                    nominee.DOB = DateTime.SpecifyKind(nominee.DOB, DateTimeKind.Unspecified);
                    nominee.NominationDate = DateTime.SpecifyKind(nominee.NominationDate ?? DateTime.Now, DateTimeKind.Unspecified);
                    await _context.membernomineedetails.AddAsync(nominee);
                }

                // Update Location Details
                var existingLocation = await _context.memberlocationdetails
                    .FirstOrDefaultAsync(m => m.MemberId == member.Id && m.BranchId == member.BranchId);

                if (existingLocation != null && dto.LocationDetails != null)
                {
                    // Store the keys before mapping
                    var locationId = existingLocation.Id;
                    var locationMemberId = existingLocation.MemberId;
                    var locationBranchId = existingLocation.BranchId;

                    MapToEntity(dto.LocationDetails, existingLocation);

                    // Restore the keys after mapping
                    existingLocation.Id = locationId;
                    existingLocation.MemberId = locationMemberId;
                    existingLocation.BranchId = locationBranchId;
                }

                // Update Document Details
                var existingDocuments = await _context.memberdocdetails
                    .FirstOrDefaultAsync(m => m.MemberId == member.Id && m.BranchId == member.BranchId);

                if (existingDocuments != null)
                {
                    // Store the keys before mapping
                    var docId = existingDocuments.Id;
                    var docMemberId = existingDocuments.MemberId;
                    var docBranchId = existingDocuments.BranchId;

                    // Handle member photo update
                    if (memberPhoto != null)
                    {
                        if (_imageService.DeleteImage(existingDocuments.MemberId, "picture", existingDocuments.MemberPicExt, "Member_Images", "Pictures"))
                        {
                            var (fileName, extension) = await _imageService.SaveImageAsync(
                                memberPhoto,
                                member.Id,
                                "picture",
                                "Member_Images",
                                "Pictures"
                            );
                            dto.DocumentDetails!.MemberPicExt = extension;
                        }
                    }
                    else
                        dto.DocumentDetails.MemberPicExt = existingDocuments.MemberPicExt;

                    // Handle member signature update
                    if (memberSignature != null)
                    {
                        if (_imageService.DeleteImage(existingDocuments.MemberId, "signature", existingDocuments.MemberSignExt, "Member_Images", "Signatures"))
                        {
                            var (fileName, extension) = await _imageService.SaveImageAsync(
                                memberSignature,
                                member.Id,
                                "signature",
                                "Member_Images",
                                "Signatures"
                            );
                            dto.DocumentDetails!.MemberSignExt = extension;
                        }
                    }
                    else
                        dto.DocumentDetails.MemberSignExt = existingDocuments.MemberSignExt;

                    if (dto.DocumentDetails != null && (memberPhoto != null || memberSignature != null))
                    {
                        MapToEntity(dto.DocumentDetails, existingDocuments);

                        // Restore the keys after mapping
                        existingDocuments.Id = docId;
                        existingDocuments.MemberId = docMemberId;
                        existingDocuments.BranchId = docBranchId;
                    }
                }

                // Update Account Master entries (SM and Dividend accounts)
                var smAccountType = (int)Enums.AccountTypes.ShareMoney;
                var generalAccountType = (int)Enums.AccountTypes.General;

                // Update SM Account
                var smAccount = await _context.accountmaster
                    .FirstOrDefaultAsync(a => a.MemberId == member.Id &&
                                             a.MemberBranchID == member.BranchId &&
                                             a.AccTypeId == smAccountType);

                if (smAccount != null && dto.AccMaster != null)
                {
                    // Store the keys before mapping
                    var smAccId = smAccount.ID;

                    dto.AccMaster.AccOpeningDate = member.JoiningDate;
                    dto.AccMaster.AccTypeId = smAccountType;
                    dto.AccMaster.BranchId = member.BranchId;
                    dto.AccMaster.MemberId = member.Id;
                    dto.AccMaster.MemberBranchId = member.BranchId;
                    dto.AccMaster.HeadCode = CommonFunctions.shareMoneyCapitalHeadCode;
                    dto.AccMaster.HeadId = await _commonfunctions.GetHeadIdFromHeadCode(member.BranchId, dto.AccMaster.HeadCode);

                    MapToEntity(dto.AccMaster, smAccount);

                    // Restore the key after mapping
                    smAccount.ID = smAccId;
                }

                // Update Dividend Account
                var dividendAccount = await _context.accountmaster
                    .FirstOrDefaultAsync(a => a.MemberId == member.Id &&
                                             a.MemberBranchID == member.BranchId &&
                                             a.AccTypeId == generalAccountType &&
                                             a.HeadCode == CommonFunctions.dividendPayableHeadCode);

                if (dividendAccount != null && dto.AccMaster != null)
                {
                    // Store the keys before mapping
                    var divAccId = dividendAccount.ID;

                    dto.AccMaster.HeadCode = CommonFunctions.dividendPayableHeadCode;
                    dto.AccMaster.HeadId = await _commonfunctions.GetHeadIdFromHeadCode(member.BranchId, dto.AccMaster.HeadCode);
                    dto.AccMaster.AccTypeId = generalAccountType;

                    MapToEntity(dto.AccMaster, dividendAccount);

                    // Restore the key after mapping
                    dividendAccount.ID = divAccId;
                }

                if(dto.Voucher.OpeningAmount > 0)
                {
                    var existingOpeningAccInfo = await _context.accopeningbalance.FirstOrDefaultAsync(x => x.BranchId == member.BranchId && x.AccTypeId == smAccountType && x.AccountId == smAccount!.ID);
                    if(existingOpeningAccInfo != null)
                        existingOpeningAccInfo.OpeningAmount = (decimal)dto.Voucher.OpeningAmount;
                    else
                    {
                        AccOpeningBalance accOpeningBalance = AccOpeningBalance((decimal)dto.Voucher.OpeningAmount, smAccountType, smAccount!.ID, member.BranchId, "Cr");
                        await _context.accopeningbalance.AddAsync(accOpeningBalance);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                await _commonfunctions.LogErrors(ex, nameof(UpdateMemberAsync), nameof(MemberController));
                throw;
            }
        }


        // DELETE
        public async Task<bool> DeleteMemberAsync(int id, int branchId, int voucherId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            var memberToDelete = await _context.member
                .FirstOrDefaultAsync(m => m.Id == id && m.BranchId == branchId);

            if (memberToDelete == null)
            {
                return false; // Member not found
            }
            var entitiesToDelete = new List<object>();

            // Nominees (Use ToListAsync() which returns an empty list, never null)
            var nominees = await _context.membernomineedetails
                .Where(n => n.MemberId == id && n.BranchId == branchId).ToListAsync();
            entitiesToDelete.AddRange(nominees);

            // Location and Documents (Can be null)
            var memberLocation = await _context.memberlocationdetails
                .FirstOrDefaultAsync(l => l.MemberId == id && l.BranchId == branchId);
            if (memberLocation != null) entitiesToDelete.Add(memberLocation);

            var memberDocuments = await _context.memberdocdetails
                .FirstOrDefaultAsync(d => d.MemberId == id && d.BranchId == branchId);
            if (memberDocuments != null) entitiesToDelete.Add(memberDocuments);

            // 3. Delete Accounts (Two separate fetches combined into one efficient query)
            var accountTypes = new List<int> {
        (int)Enums.AccountTypes.ShareMoney,
        (int)Enums.AccountTypes.General
    };

            var accountsToDelete = await _context.accountmaster
                .Where(x => x.MemberBranchID == branchId && x.MemberId == id && accountTypes.Contains(x.AccTypeId))
                .ToListAsync();

            entitiesToDelete.AddRange(accountsToDelete);

            // 4. Delete Voucher (if present)
            if (voucherId > 0)
            {
                // Load both voucher and its details in one go (more efficient than separate queries if needed)
                var voucher = await _context.voucher.FirstOrDefaultAsync(v => v.BrID == branchId && v.Id == voucherId);

                if (voucher != null)
                {
                    entitiesToDelete.Add(voucher);
                }
            }

            // 5. Queue all deletions and the member itself
            _context.RemoveRange(entitiesToDelete);
            _context.member.Remove(memberToDelete); // Delete the main entity last

            // 6. Commit the entire transaction to the database safely
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return true;
        }



        // ---------------- Mapping Helpers ----------------

        private Member MapToEntity(MemberDTO dto, Member? entity = null)
        {
            entity ??= new Member();

            entity.BranchId = dto.BranchId;
            entity.DefAreaBrId = dto.DefAreaBrId;

            // Core member details
            entity.MemberType = dto.MemberType;
            entity.NominalMembershipNo = dto.NominalMembershipNo;
            entity.PermanentMembershipNo = dto.PermanentMembershipNo;

            // Name fields
            entity.MemberName = dto.MemberName;
            entity.MemberNameSL = dto.MemberNameSL;

            // Relationship details
            entity.RelativeName = dto.RelativeName;
            entity.RelativeNameSL = dto.RelativeNameSL;
            entity.RelationId = dto.RelationId;

            // Personal information
            entity.Gender = dto.Gender;
            entity.DOB = dto.DOB;
            entity.CasteId = dto.CasteId;
            entity.CategoryId = dto.CategoryId;
            entity.JoiningDate = dto.JoiningDate;
            entity.OccupationId = dto.OccupationId;

            // Contact information
            entity.PhonePrefix1 = dto.PhonePrefix1;
            entity.PhoneType1 = dto.PhoneType1;
            entity.PhoneNo1 = dto.PhoneNo1;
            entity.PhonePrefix2 = dto.PhonePrefix2;
            entity.PhoneType2 = dto.PhoneType2;
            entity.PhoneNo2 = dto.PhoneNo2;

            // Status fields (corrected naming)
            entity.MemberStatus = dto.MemberStatus;
            entity.MemberStatusDate = dto.MemberStatusDate;
            entity.Email1 = dto.Email1;
            entity.Email2 = dto.Email2;

            return entity;
        }
        private MemberDTO MapToDTO(Member entity) => new MemberDTO
        {
            // Primary identifiers
            Id = entity.Id,
            BranchId = entity.BranchId,
            DefAreaBrId = entity.DefAreaBrId,

            // Core member details
            MemberType = entity.MemberType,
            NominalMembershipNo = entity.NominalMembershipNo,
            PermanentMembershipNo = entity.PermanentMembershipNo,

            // Name fields
            MemberName = entity.MemberName,
            MemberNameSL = entity.MemberNameSL,

            // Relationship details
            RelativeName = entity.RelativeName,
            RelativeNameSL = entity.RelativeNameSL,
            RelationId = entity.RelationId,

            // Personal information
            Gender = entity.Gender,
            DOB = entity.DOB,
            CasteId = entity.CasteId,
            CategoryId = entity.CategoryId,
            JoiningDate = entity.JoiningDate,
            OccupationId = entity.OccupationId,

            // Contact information
            PhonePrefix1 = entity.PhonePrefix1,
            PhoneType1 = entity.PhoneType1,
            PhoneNo1 = entity.PhoneNo1,
            PhonePrefix2 = entity.PhonePrefix2,
            PhoneType2 = entity.PhoneType2,
            PhoneNo2 = entity.PhoneNo2,

            // Status fields (corrected naming)
            MemberStatus = entity.MemberStatus,
            MemberStatusDate = entity.MemberStatusDate,
            Email1 = entity.Email1,
            Email2 = entity.Email2

        };

        private MemberDocDetails MapToEntity(MemberDocDetailsDTO dto, MemberDocDetails? entity = null)
        {
            entity ??= new MemberDocDetails();

            // Primary identifiers
            entity.Id = dto.Id;
            entity.BranchId = dto.BranchId;
            entity.MemberId = dto.MemberId;

            // Document details
            entity.PanCardNo = dto.PanCardNo;
            entity.AadhaarCardNo = dto.AadhaarCardNo;
            entity.MemberPicExt = dto.MemberPicExt;
            entity.MemberSignExt = dto.MemberSignExt;

            return entity;
        }
        private MemberDocDetailsDTO MapToDTO(MemberDocDetails entity) => new MemberDocDetailsDTO
        {
            // Primary identifiers
            Id = entity.Id,
            BranchId = entity.BranchId,
            MemberId = entity.MemberId,

            // Document details
            PanCardNo = entity.PanCardNo,
            AadhaarCardNo = entity.AadhaarCardNo,
            MemberPicExt = entity.MemberPicExt,
            MemberSignExt = entity.MemberSignExt
        };


        private MemberLocationDetails MapToEntity(MemberLocationDetailsDTO dto, MemberLocationDetails? entity = null)
        {
            entity ??= new MemberLocationDetails();

            entity.BranchId = dto.BranchId;
            entity.MemberId = dto.MemberId;

            // Address lines
            entity.AddressLine1 = dto.AddressLine1;
            entity.AddressLineSL1 = dto.AddressLineSL1;
            entity.AddressLine2 = dto.AddressLine2;
            entity.AddressLineSL2 = dto.AddressLineSL2;

            // Location IDs - Primary address
            entity.VillageId1 = dto.VillageId1;
            entity.PO1 = dto.PO1;
            entity.Tehsil1 = dto.Tehsil1;
            entity.ThanaId1 = dto.ThanaId1;
            entity.ZoneId1 = dto.ZoneId1;

            // Location IDs - Secondary address
            entity.VillageId2 = dto.VillageId2;
            entity.PO2 = dto.PO2;
            entity.Tehsil2 = dto.Tehsil2;
            entity.ThanaId2 = dto.ThanaId2;
            entity.ZoneId2 = dto.ZoneId2;

            return entity;
        }
        private MemberLocationDetailsDTO MapToDTO(MemberLocationDetails entity) => new MemberLocationDetailsDTO
        {
            // Primary identifiers
            Id = entity.Id,
            BranchId = entity.BranchId,
            MemberId = entity.MemberId,

            // Address lines
            AddressLine1 = entity.AddressLine1,
            AddressLineSL1 = entity.AddressLineSL1,
            AddressLine2 = entity.AddressLine2,
            AddressLineSL2 = entity.AddressLineSL2,

            // Location IDs - Primary address
            VillageId1 = entity.VillageId1,
            PO1 =  entity.PO1,
            Tehsil1 = entity.Tehsil1,
            ThanaId1 = entity.ThanaId1,
            ZoneId1 = entity.ZoneId1,

            // Location IDs - Secondary address
            VillageId2 = entity.VillageId2,
            PO2 = entity.PO2,
            Tehsil2 = entity.Tehsil2,
            ThanaId2 = entity.ThanaId2,
            ZoneId2 = entity.ZoneId2
        };

        private MemberNomineeDetails MapToEntity(MemberNomineeDetailsDTO dto, MemberNomineeDetails? entity = null)
        {
            entity ??= new MemberNomineeDetails();

            entity.BranchId = dto.BranchId;
            entity.MemberId = dto.MemberId;

            // Nominee personal details
            entity.NomineeName = dto.NomineeName;
            entity.NomRelativeName = dto.NomRelativeName;
            entity.RelationId = dto.RelationId;
            entity.RelationWithMember = dto.RelationWithMember;
            entity.Age = dto.Age;
            entity.DOB = dto.DOB;

            // Guardian details (for minors)
            entity.IsMinor = dto.IsMinor;
            entity.NameOfGuardian = dto.NameOfGuardian;
            entity.NameOfGuardianSL = dto.NameOfGuardianSL;
            entity.NominationDate = dto.NominationDate;

            // Document details
            entity.AadhaarCardNo = dto.AadhaarCardNo;
            entity.PanCardNo = dto.PanCardNo;

            // Share details
            entity.PercentageShare = dto.PercentageShare;

            return entity;
        }
        private MemberNomineeDetailsDTO MapToDTO(MemberNomineeDetails entity) => new MemberNomineeDetailsDTO
        {
            // Primary identifiers
            Id = entity.Id,
            BranchId = entity.BranchId,
            MemberId = entity.MemberId,

            // Nominee personal details
            NomineeName = entity.NomineeName,
            NomRelativeName = entity.NomRelativeName,
            RelationId = entity.RelationId,
            RelationWithMember = entity.RelationWithMember,
            Age = entity.Age,
            DOB = entity.DOB,

            // Guardian details
            IsMinor = entity.IsMinor,
            NameOfGuardian = entity.NameOfGuardian,
            NameOfGuardianSL = entity.NameOfGuardianSL,
            NominationDate = entity.NominationDate,

            // Document details
            AadhaarCardNo = entity.AadhaarCardNo,
            PanCardNo = entity.PanCardNo,

            // Share details
            PercentageShare = entity.PercentageShare
        };

        public AccountMaster MapToEntity(AccountMasterDTO dto, AccountMaster entity = null)
        {
            entity ??= new AccountMaster();
            entity.ID = dto.AccId;
            entity.BranchId = dto.BranchId;
            entity.HeadId = dto.HeadId;
            entity.HeadCode = dto.HeadCode;
            entity.AccTypeId = dto.AccTypeId;
            entity.GeneralProductId = dto.GeneralProductId;
            entity.AccountNumber = dto.AccountNumber;
            entity.AccPrefix = dto.AccPrefix;
            entity.AccSuffix = dto.AccSuffix;
            entity.AccountName = dto.AccountName;
            entity.AccountNameSL = dto.AccountNameSL;
            entity.MemberId = dto.MemberId;
            entity.MemberBranchID = dto.MemberBranchId;
            entity.AccOpeningDate = dto.AccOpeningDate;
            entity.IsAccClosed = dto.IsAccClosed;
            entity.ClosingDate = dto.ClosingDate;
            entity.ClosingRemarks = dto.ClosingRemarks;
            entity.IsAccAddedManually = dto.IsAccAddedManually;
            entity.IsJointAccount = dto.IsJointAccount;
            entity.IsSuspenseAccount = dto.IsSuspenseAccount;
            return entity;
        }

        public AccountMasterDTO MapToDTO(AccountMaster entity) => new()
        {

            AccId = entity.ID,
            BranchId = entity.BranchId,
            HeadId = entity.HeadId,
            HeadCode = entity.HeadCode,
            AccTypeId = entity.AccTypeId,
            GeneralProductId = entity.GeneralProductId,
            AccountNumber = entity.AccountNumber,
            AccPrefix = entity.AccPrefix,
            AccSuffix = entity.AccSuffix,
            AccountName = entity.AccountName!,
            AccountNameSL = entity.AccountNameSL,
            MemberId = entity.MemberId,
            MemberBranchId = entity.MemberBranchID,
            AccOpeningDate = entity.AccOpeningDate,
            IsAccClosed = entity.IsAccClosed,
            ClosingDate = entity.ClosingDate,
            ClosingRemarks = entity.ClosingRemarks,
            IsAccAddedManually = entity.IsAccAddedManually,
            IsJointAccount = entity.IsJointAccount,
            IsSuspenseAccount = entity.IsSuspenseAccount,
            HeadName = _commonfunctions.GetHeadCodeFromId(entity.HeadId, entity.BranchId)
        };

        public Voucher MapToEntity(VoucherDTO dto, Voucher entity = null)
        {
            entity ??= new Voucher();
            entity.Id = dto.Id;
            entity.AddedBy = dto.AddedBy;
            entity.VerifiedBy = dto.VerifiedBy;
            entity.OtherBrID = dto.OtherBrID;
            entity.ActualTime = DateTime.Now;
            entity.VoucherDate = dto.VoucherDate;
            entity.BrID = dto.BrID;
            entity.ModifiedBy = dto.ModifiedBy;
            entity.VoucherNarration = dto.VoucherNarration;
            entity.VoucherNo = dto.VoucherNo;
            entity.VoucherType = dto.VoucherType;
            entity.VoucherSubType = dto.VoucherSubType;
            entity.VoucherStatus = dto.VoucherStatus;

            return entity;
        }
        public VoucherDTO MapToDto(Voucher entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var dto = new VoucherDTO
            {
                Id = entity.Id,
                BrID = entity.BrID,

                // Voucher Identification
                VoucherNo = entity.VoucherNo,
                VoucherType = entity.VoucherType,
                VoucherSubType = entity.VoucherSubType,

                // Date and Time
                VoucherDate = entity.VoucherDate,
                ActualTime = entity.ActualTime,

                // Narration and Status
                VoucherNarration = entity.VoucherNarration,
                VoucherStatus = entity.VoucherStatus,

                // Audit and Verification
                AddedBy = entity.AddedBy,
                ModifiedBy = entity.ModifiedBy,
                VerifiedBy = entity.VerifiedBy,

                // System Synchronization
                OtherBrID = entity.OtherBrID,

            };

            return dto;
        }

        public VoucherCreditDebitDetailsDTO MapToDto(VoucherCreditDebitDetails entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            return new VoucherCreditDebitDetailsDTO
            {
                Id = entity.Id,
                BrId = entity.BrId,
                VoucherID = entity.VoucherID,

                // Account Details
                AccountId = entity.AccountId,
                AccHeadCode = entity.AccHeadCode,

                // Transaction Details
                VoucherAmount = entity.VoucherAmount,
                VoucherEntryType = entity.VoucherEntryType,

                // Narration and Status
                Narration = entity.Narration,
                EntryStatus = entity.EntryStatus,

                // Date & Sequence
                ValueDate = entity.ValueDate,
                VoucherSeqNo = entity.VoucherSeqNo,

                // Financial / Calculated
                IntDr = entity.IntDr,
                IntCr = entity.IntCr,
                ExpenseAmt = entity.ExpenseAmt,

                HCL1 = entity.HCL1,
                HCL2 = entity.HCL2,
                HCL3 = entity.HCL3,

                // System / Audit
                VoucherStatus = entity.VoucherStatus
            };
        }

        public VoucherCreditDebitDetails MapToEntity( VoucherCreditDebitDetailsDTO dto,VoucherCreditDebitDetails? entity = null)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            entity ??= new VoucherCreditDebitDetails();

            entity.Id = dto.Id;
            entity.BrId = dto.BrId;
            entity.VoucherID = dto.VoucherID;

            // Account Details
            entity.AccountId = dto.AccountId;
            entity.AccHeadCode = dto.AccHeadCode;

            // Transaction Details
            entity.VoucherAmount = dto.VoucherAmount;
            entity.VoucherEntryType = string.IsNullOrWhiteSpace(dto.VoucherEntryType)
                ? "DR"   // default to Debit if not provided (example)
                : dto.VoucherEntryType;

            // Narration and Status
            entity.Narration = dto.Narration;
            entity.EntryStatus = string.IsNullOrWhiteSpace(dto.EntryStatus)
                ? "Active"   // default status if blank
                : dto.EntryStatus;

            // Date & Sequence
            entity.ValueDate = dto.ValueDate == default
                ? DateTime.Now
                : dto.ValueDate;
            entity.VoucherSeqNo = dto.VoucherSeqNo;

            // Financial / Calculated
            entity.IntDr = dto.IntDr;
            entity.IntCr = dto.IntCr;
            entity.ExpenseAmt = dto.ExpenseAmt;

            entity.HCL1 = dto.HCL1;
            entity.HCL2 = dto.HCL2;
            entity.HCL3 = dto.HCL3;

            // System / Audit
            entity.VoucherStatus = dto.VoucherStatus;

            return entity;
        }

        public VoucherCreditDebitDetails voucherCreditDebitDetails(long headCode, int accId, int branchId, string entryStatus, string narration, decimal voucherAmount, string voucherStatus, DateTime valueDate, string entryType, int voucherId, int voucherSeqNo)
        {
            return new VoucherCreditDebitDetails
            {
                AccHeadCode = headCode,
                AccountId = accId,
                BrId = branchId,
                EntryStatus = entryStatus,
                Narration = narration,
                VoucherAmount = voucherAmount,
                ExpenseAmt = 0,
                VoucherStatus = voucherStatus,
                ValueDate = valueDate,
                VoucherEntryType = entryType,
                VoucherID = voucherId,
                VoucherSeqNo = voucherSeqNo,
                HCL1 = 0,
                HCL2 = 0,
                HCL3 = 0,
            };
        }

        public AccOpeningBalance AccOpeningBalance(decimal openingAmount, int accTypeId, int accId, int branchId, string entryType, decimal fdIntPayable = 0, decimal openingInterest = 0, decimal overdueAmount = 0, int openingNoOfKist = 0, decimal tdsAmount = 0, DateTime overdueDate = default(DateTime))
        {
            return new AccOpeningBalance
            {
                OpeningAmount = openingAmount,
                AccountId = accId,
                AccTypeId = accTypeId,
                BranchId = branchId,
                EntryType = entryType,
                FdIntPayable = fdIntPayable,
                OpeningInterest = openingInterest,
                OpeningNoOfKist = openingNoOfKist,
                OverDueAmount = overdueAmount,
                OverDueDate = overdueDate != default(DateTime) ? overdueDate : null,
                TdsAmount = tdsAmount
            };
        }


    }
}
