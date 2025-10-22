
using BankingPlatform.API.DTO.Settings;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.Miscalleneous;
using BankingPlatform.Infrastructure.Models.voucher;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion.Internal;
using System;

namespace BankingPlatform.API.Common.CommonFunctions
{
    public class CommonFunctions
    {
        public const long shareMoneyCapitalHeadCode = 101103101000;
        public const long dividendPayableHeadCode = 140101000000;
        private readonly BankingDbContext _appcontext;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public CommonFunctions(
            BankingDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _appcontext = context ?? throw new ArgumentNullException(nameof(context));
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<branchMaster?> GetBranchInfoFromBranchCodeAsync(string branchCode)
        {
            if (string.IsNullOrEmpty(branchCode) || string.IsNullOrWhiteSpace(branchCode))
                return null;

            return await _appcontext.branchmaster
        .FirstOrDefaultAsync(x => x.branchmaster_code == branchCode);
        }
        public async Task<branchMaster?> GetBranchInfoFromBranchIdAsync(int branchId)
        {
            if (branchId <= 0)
                return null;

            return await _appcontext.branchmaster
        .FirstOrDefaultAsync(x => x.id == branchId);
        }

        public static int GetLastValue(string input)
        {
            // Check if the input string is null or empty to prevent errors.
            if (string.IsNullOrEmpty(input))
            {
                return 0; 
            }
            string[] parts = input.Split('-');
            return parts.Length > 0 ? Int32.Parse(parts[parts.Length - 1]) : 0 ;
        }

        public string GetHeadCodeFromId(int? id, int branchId)
        {
            string result = "";
            if (id != null && branchId > 0)
            {
                var data = _appcontext.accounthead.FirstOrDefault(x => x.branchid == branchId && x.id == id);
                if (data != null)
                    result = data.headcode + "-" + data.name;
            }
            return result;
        }

        public async Task<string> GetZoneNameFromId(int zoneId, int branchId) =>await _appcontext.zone
                                     .Where(x => x.branchid == branchId && x.id == zoneId)
                                     .Select(x => x.zonename)
                                     .FirstOrDefaultAsync() ?? "";
        public async Task<string> GetThanaNameFromId(int zoneId, int branchId) => await _appcontext.thana
                                     .Where(x => x.branchid == branchId && x.id == zoneId)
                                     .Select(x => x.thananame)
                                     .FirstOrDefaultAsync() ?? ""; 
        public async Task<string> GetPostOfficeNameFromId(int zoneId, int branchId) => await _appcontext.postoffice
                                     .Where(x => x.branchid == branchId && x.id == zoneId)
                                     .Select(x => x.postofficename)
                                     .FirstOrDefaultAsync() ?? "";
        public async Task<string> GetTehsilFromId(int zoneId, int branchId) => await _appcontext.tehsil
                                     .Where(x => x.branchid == branchId && x.id == zoneId)
                                     .Select(x => x.tehsilname)
                                     .FirstOrDefaultAsync() ?? "";

        public async Task<string> GetPatwarFromId(int patwarId, int branchId) => await _appcontext.patwar
                                     .Where(x => x.branchid == branchId && x.id == patwarId)
                                     .Select(x => x.description)
                                     .FirstOrDefaultAsync() ?? "";

        public string GetStateFromId(int stateId) => _appcontext.state
                                    .Where(x => x.id == stateId)
                                    .Select(x => x.statename)
                                    .FirstOrDefault() ?? "";

        public string GetCategoryNameFromId(int categoryId, int branchId) => _appcontext.category
                                    .Where(x => x.id == categoryId
                                    && x.branchid == branchId)
                                    .Select(x => x.categoryname)
                                    .FirstOrDefault() ?? "";

        public string GetAccountHeadTypeNameFromId(int headTypeId, int branchId) => _appcontext.accountheadtype
                                    .Where(x => x.id == headTypeId
                                    && x.branchid == branchId)
                                    .Select(x => x.description)
                                    .FirstOrDefault() ?? "";

        public async Task LogErrors(Exception ex, string functionName, string screenName)
        {
            var user = _httpContextAccessor.HttpContext!.User!;
            int branchId = Int32.Parse(user.FindFirst("branchId")?.Value!);
            int userId = Int32.Parse(user.FindFirst("userId")?.Value!);
            var ErrorlogInfo = new ErrorLog
            {
                BranchId = branchId,
                ErrorDateTime = DateTimeOffset.UtcNow,
                ErrorMessage = ex.Message,
                StackTrace = ex.StackTrace ?? "",
                InnerException = ex.InnerException?.Message,
                FunctionName = functionName,
                ScreenName = screenName,
                UserId = 1
            };
            _appcontext.errorlog.Add(ErrorlogInfo);
            await _appcontext.SaveChangesAsync();
        }

        public async Task<bool> CheckIfAccountHeadTypeInUse(int headTypeId, int branchId) => await _appcontext.accounthead
            .Where(x => x.branchid == branchId && x.accountheadtypeid == headTypeId).AnyAsync();
        public async Task<bool> CheckIfStateInUse(int stateId, int branchId) => await _appcontext.accgstinfo
            .Where(x => x.BranchId == branchId && x.StateId == stateId).AnyAsync();
        public async Task<bool> CheckIfLocationDataInUse(int branchId, int zoneId = 0 , int thanaId = 0, int postOfficeId = 0, int tehsilId = 0 ) => await _appcontext.village
            .Where(x => x.branchid == branchId && ((x.zoneid > 0 && x.zoneid == zoneId) || (x.thanaid > 0 && x.thanaid == thanaId) || (x.postofficeid > 0 && x.postofficeid == postOfficeId) || (x.tehsilid > 0 && x.tehsilid == tehsilId))).AnyAsync();

        public async Task<int> GetLatestVoucherNo(int branchId)
        {
            var maxVoucherNo = await _appcontext.voucher
                               .Where(x => x.BrID == branchId)
                               .MaxAsync(x => (int?)x.VoucherNo); // Cast to nullable int (int?)
            int nextVoucherNo = (maxVoucherNo ?? 0) + 1;
            return nextVoucherNo;
        }

        public async Task<int> GetHeadIdFromHeadCode(int branchId, long headCode) => await _appcontext.accounthead.Where(x => x.branchid == branchId && x.headcode == headCode).Select(x => x.id > 0 ? x.id : 0).FirstOrDefaultAsync();

        public async Task<bool> IsAutoVerification(int branchId) => await _appcontext.vouchersettings.Where(x => x.branchid == branchId).Select(x => x.autoverification).FirstOrDefaultAsync();

        public async Task<SettingsDTO> GetAllSettings(int branchId)
        {
            var existingGeneralSettings = await _appcontext.generalsettings
                    .FirstOrDefaultAsync(s => s.branchid == branchId);
            var existingVoucherSettings = await _appcontext.vouchersettings
                    .FirstOrDefaultAsync(s => s.branchid == branchId);
            SettingsDTO settingsDTO = new SettingsDTO
            {
                GeneralSettings = existingGeneralSettings != null
         ? new GeneralSettingsDTO
         {
             AdmissionFeeAccountId = existingGeneralSettings.admissionFeeAccountId,
             AdmissionFeeAmount = existingGeneralSettings.admissionFeeAmount,
             BranchId = branchId
         }
         : new GeneralSettingsDTO { BranchId = branchId }, // Default if null

                VoucherSettings = existingVoucherSettings != null
         ? new VoucherSettingsDTO
         {
             AutoVerification = existingVoucherSettings.autoverification
         }
         : new VoucherSettingsDTO() // Default if null
            };

            return settingsDTO;

        }

        public async Task<string> GetAccountNameFromAccId(int accId, int branchId, bool withAccId = false)
        {
            string accountName = "";
            if(accId > 0 && branchId > 0)
            {
                accountName = await _appcontext.accountmaster.Where(x => x.BranchId == branchId && x.ID == accId).Select(x => x.AccountName != "" ? x.AccountName : "").FirstOrDefaultAsync() ?? "";
                if (withAccId && !string.IsNullOrEmpty(accountName))
                    accountName = $"{accountName}-{accId}";
            }
            return accountName;
        }

        public async Task<long> GetAccountHeadCodeFromAccId(int accId, int branchId)
        {
            long headCode = 0;
            if (accId > 0 && branchId > 0)
            {
                headCode = await _appcontext.accountmaster.Where(x => x.BranchId == branchId && x.ID == accId).Select(x => x.HeadCode).FirstOrDefaultAsync();
            }
            return headCode;
        }

        public async Task<int> GetVoucherIdFromVTypeAndSubType(int vrSubType, int vrType, int SMAccID, int branchId) => await (from p in _appcontext.vouchercreditdebitdetails.AsNoTracking()
                   join q in _appcontext.voucher.AsNoTracking()   
                   on new { vrId = p.VoucherID, brId = p.BrId }
                   equals new { vrId = q.Id, brId = q.BrID }
                   where q.VoucherSubType == vrSubType
                   && q.VoucherType == vrType
                   && p.AccountId == SMAccID
                   && p.BrId == branchId
                   select q.Id > 0 ? q.Id : 0)
                   .FirstOrDefaultAsync();

        public async Task<List<VoucherCreditDebitDetails>> GetVoucherInfoFromVoucherId(int voucherId, int branchId) => await _appcontext.vouchercreditdebitdetails.Where(x => x.BrId == branchId && x.VoucherID == voucherId).ToListAsync();

        public string getHeadTypeCategoryNameFromId(int id)
        {
            string name = "";
            switch (id) {
                case 1:
                    name = "Assets";
                    break;
                case 2:
                    name = "Liabilities";
                    break;
                case 3:
                    name = "Indirect Income";
                    break;
                case 4:
                    name = "Indirect Expense";
                    break;
                case 5:
                    name = "Direct Income";
                    break;
                case 6:
                    name = "Direct Expense";
                    break;
                case 7:
                    name = "Sale Return";
                    break;
                case 8:
                    name = "Purchase Return";
                    break;
                case 9:
                    name = "Sale";
                    break;
                case 10:
                    name = "Purchase";
                    break;
            }

            return name;
        }


    }
}
