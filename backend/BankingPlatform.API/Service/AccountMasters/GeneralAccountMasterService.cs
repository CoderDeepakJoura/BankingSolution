using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.Member;
using BankingPlatform.Infrastructure;
using BankingPlatform.Infrastructure.Models.AccMasters;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileSystemGlobbing.Internal;
using Microsoft.IdentityModel.Tokens;
using System.Threading.Tasks;

namespace BankingPlatform.API.Service.AccountMasters
{
    public class GeneralAccountMasterService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;

        public GeneralAccountMasterService(BankingDbContext context, CommonFunctions commonFunctions)
        {
            _context = context;
            _commonfunctions = commonFunctions;
        }
        public async Task<string> CreateNewGeneralAccAsync(CommonAccMasterDTO dto)
        {
            var duplicateFields = await _context.accountmaster
                                 .Where(x => x.ID != dto.AccountMasterDTO!.AccId
                                 && x.BranchId == dto.AccountMasterDTO.BranchId
                                 && x.AccTypeId == (int)Enums.AccountTypes.General)
                                .Select(x => new { x.AccountName, x.AccountNumber })
                                .ToListAsync();

            string result = "";
            if (duplicateFields.Any(x=> x.AccountName!.ToLower() == dto.AccountMasterDTO!.AccountName.ToLower()))
                result = "Account Name";
            if (duplicateFields.Any(x => x.AccountNumber == dto.AccountMasterDTO?.AccountNumber))
                result = result != "" ? result + ", Account Number" : "Account Number";

            if (result != "")
                return $"{result} already exists";

            if (dto.GSTInfoDTO != null)
            {
                if (!string.IsNullOrEmpty(dto.GSTInfoDTO!.GSTInNo))
                {
                    var duplicateGST = await _context.accgstinfo.FirstOrDefaultAsync(x =>
                                       x.BranchId == dto.GSTInfoDTO!.BranchId &&
                                       dto.GSTInfoDTO.GSTInNo != "" &&
                                       x.GSTInNo == dto.GSTInfoDTO.GSTInNo );

                    if (duplicateGST != null)
                        return "GSTInNo already exists";
                }
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var accountMasterInfo = MapToEntity(dto.AccountMasterDTO!);
                await _context.accountmaster.AddAsync(accountMasterInfo);
                await _context.SaveChangesAsync();

                if (dto.GSTInfoDTO != null)
                {
                    dto.GSTInfoDTO.AccId = accountMasterInfo.ID;
                    var gstInfo = MapToEntity(dto.GSTInfoDTO!);
                    await _context.accgstinfo.AddAsync(gstInfo);
                    await _context.SaveChangesAsync();
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return "Error";
            }

            return "Success";
        }

        public async Task<(List<CommonAccMasterDTO> Items, int TotalCount)> GetAllGeneralAccountsAsync(int branchId, LocationFilterDTO filter)
        {
            var query = _context.accountmaster
                .AsNoTracking()
                .Where(x => x.BranchId == branchId);

            // Search filter
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm;
                query = query.Where(m =>
                    m.AccountName!.ToLower().Contains(term.ToLower()) ||
                    m.AccountNumber.ToLower().Contains(term.ToLower()) ||
                    m.HeadCode.ToString().ToLower().Contains(term.ToLower()));
            }

            var totalCount = await query.CountAsync();
            var accountMasterInfo = await query
                .OrderBy(m => m.AccountName)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var accIds = accountMasterInfo.Select(m => m.ID).ToList();
            var accGstInfo = await _context.accgstinfo
                .Where(g => accIds.Contains(g.AccId) && g.BranchId == branchId)
                .ToListAsync();

            var items = accountMasterInfo.Select(m =>
            {
                var gst = accGstInfo.FirstOrDefault(g => g.AccId == m.ID);

                return new CommonAccMasterDTO
                {
                    AccountMasterDTO = MapToDTO(m),
                    GSTInfoDTO = gst != null ? MapToDTO(gst) : null
                };
            }).ToList();

            return (items, totalCount);
        }

        public async Task<string> UpdateGeneralAccountAsync(CommonAccMasterDTO dto)
        {
            var accountMasterInfo = await _context.accountmaster.FirstOrDefaultAsync(m => m.ID == dto.AccountMasterDTO!.AccId && m.BranchId == dto.AccountMasterDTO.BranchId);
            if (accountMasterInfo == null) return "Account not found.";

            var duplicateFields = await _context.accountmaster
                                 .Where(x => x.ID != dto.AccountMasterDTO!.AccId
                                 && x.BranchId == dto.AccountMasterDTO.BranchId
                                 && x.AccTypeId == (int)Enums.AccountTypes.General)
                                .Select(x => new { x.AccountName, x.AccountNumber })
                                .ToListAsync();

            string result = "";
            if (duplicateFields.Any(x => x.AccountName!.ToLower() == dto.AccountMasterDTO!.AccountName.ToLower()))
                result = "Account Name";
            if (duplicateFields.Any(x => x.AccountNumber == dto.AccountMasterDTO?.AccountNumber))
                result = result != "" ? result + ", Account Number" : "Account Number";

            if (result != "")
                return $"{result} already exists";
            if (dto.GSTInfoDTO != null)
            {
                if (!string.IsNullOrEmpty(dto.GSTInfoDTO!.GSTInNo))
                {
                    var duplicateGST = await _context.accgstinfo.FirstOrDefaultAsync(x =>
                                       x.BranchId == dto.GSTInfoDTO!.BranchId &&
                                       x.GSTInNo == dto.GSTInfoDTO.GSTInNo &&
                                       x.AccId != dto.AccountMasterDTO!.AccId);

                    if (duplicateGST != null)
                        return "GSTInNo already exists";
                }
            }

            // Update Member
            MapToEntity(dto.AccountMasterDTO!, accountMasterInfo);
            _context.accountmaster.Update(accountMasterInfo);

            var gstDetail = await _context.accgstinfo
                           .FirstOrDefaultAsync(n => n.AccId == accountMasterInfo.ID
                           && n.BranchId == accountMasterInfo.BranchId);

            if (dto.GSTInfoDTO == null )
            {
                if (gstDetail != null)
                {
                    _context.accgstinfo.Remove(gstDetail);
                }
            }
            else
            {
                if (gstDetail == null)
                {
                    var newGst = MapToEntity(dto.GSTInfoDTO);
                    newGst.AccId = accountMasterInfo.ID;
                    newGst.BranchId = accountMasterInfo.BranchId;

                    await _context.accgstinfo.AddAsync(newGst);
                }
                else
                {
                    gstDetail.StateId = dto.GSTInfoDTO.StateId;
                    gstDetail.GSTInNo = dto.GSTInfoDTO.GSTInNo;
                    _context.accgstinfo.Update(gstDetail);
                }
            }

            await _context.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> DeleteAccountMasterAsync(int AccId, int branchId)
        {
            var accountMasterInfo = await _context.accountmaster.FirstOrDefaultAsync(m => m.ID == AccId && m.BranchId == branchId);
            if (accountMasterInfo == null) return "Account not found.";

            var gstInfo = await _context.accgstinfo.FirstOrDefaultAsync(x=> x.AccId == AccId && x.BranchId == branchId);
            if (gstInfo != null)
                _context.accgstinfo.Remove(gstInfo);

            var accMasterInfo = await _context.accountmaster.FirstOrDefaultAsync(x => x.ID == AccId && x.BranchId == branchId);
            if (accMasterInfo == null) return "Account Not Found";

            _context.accountmaster.Remove(accMasterInfo);

            await _context.SaveChangesAsync();
            return "Success";
        }
        // AccountMaster
        private AccountMaster MapToEntity(AccountMasterDTO dto, AccountMaster entity = null)
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

        private AccountMasterDTO MapToDTO(AccountMaster entity) => new()
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


        // GSTInfo
        private GSTInfo MapToEntity(GSTInfoDTO dto, GSTInfo? entity = null)
        {
           
            entity ??= new GSTInfo();
            entity.ID = dto.GSTInfoId;
            entity.BranchId = dto.BranchId;
            entity.AccId = dto.AccId;
            entity.StateId = dto.StateId;
            entity.GSTInNo = dto.GSTInNo!;
            return entity;
        }

        private GSTInfoDTO MapToDTO(GSTInfo entity) => new()
        {
            
            GSTInfoId = entity.ID,
            BranchId = entity.BranchId,
            AccId = entity.AccId,
            StateId = entity.StateId,
            GSTInNo = entity.GSTInNo,
            StateName = entity.StateId > 0 ? _commonfunctions.GetStateFromId(entity.StateId) : ""
        };

    }
}
