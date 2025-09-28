
using BankingPlatform.Infrastructure.Models;

namespace BankingPlatform.API.Common.CommonFunctions
{
    public class CommonFunctions
    {
        private readonly BankingDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public CommonFunctions(
            BankingDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<branchMaster?> GetBranchInfoFromBranchCodeAsync(string branchCode)
        {
            if (string.IsNullOrEmpty(branchCode) || string.IsNullOrWhiteSpace(branchCode))
                return null;

            return await _context.branchmaster
        .FirstOrDefaultAsync(x => x.branchmaster_code == branchCode);
        }
        public async Task<branchMaster?> GetBranchInfoFromBranchIdAsync(int branchId)
        {
            if (branchId <= 0)
                return null;

            return await _context.branchmaster
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
                var data = _context.accounthead.FirstOrDefault(x => x.branchid == branchId && x.id == id);
                if (data != null)
                    result = data.headcode + "-" + data.name;
            }
            return result;
        }

        public async Task<string> GetZoneNameFromId(int zoneId, int branchId) =>await _context.zone
                                     .Where(x => x.branchid == branchId && x.id == zoneId)
                                     .Select(x => x.zonename)
                                     .FirstOrDefaultAsync() ?? "";
        public async Task<string> GetThanaNameFromId(int zoneId, int branchId) => await _context.thana
                                     .Where(x => x.branchid == branchId && x.id == zoneId)
                                     .Select(x => x.thananame)
                                     .FirstOrDefaultAsync() ?? ""; 
        public async Task<string> GetPostOfficeNameFromId(int zoneId, int branchId) => await _context.postoffice
                                     .Where(x => x.branchid == branchId && x.id == zoneId)
                                     .Select(x => x.postofficename)
                                     .FirstOrDefaultAsync() ?? "";
        public async Task<string> GetTehsilFromId(int zoneId, int branchId) => await _context.tehsil
                                     .Where(x => x.branchid == branchId && x.id == zoneId)
                                     .Select(x => x.tehsilname)
                                     .FirstOrDefaultAsync() ?? "";

        public string GetStateFromId(int stateId) => _context.state
                                    .Where(x => x.id == stateId)
                                    .Select(x => x.statename)
                                    .FirstOrDefault() ?? "";

        public string GetCategoryNameFromId(int categoryId, int branchId) => _context.category
                                    .Where(x => x.id == categoryId
                                    && x.branchid == branchId)
                                    .Select(x => x.categoryname)
                                    .FirstOrDefault() ?? "";

        public string GetAccountHeadTypeNameFromId(int headTypeId, int branchId) => _context.accountheadtype
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
                ErrorDateTime = DateTime.Now.ToUniversalTime(),
                ErrorMessage = ex.Message,
                StackTrace = ex.StackTrace ?? "",
                InnerException = ex.InnerException?.Message,
                FunctionName = functionName,
                ScreenName = screenName,
                UserId = 1
            };
             _context.errorlog.Add(ErrorlogInfo);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> CheckIfAccountHeadTypeInUse(int headTypeId, int branchId) => await _context.accounthead
            .Where(x => x.branchid == branchId && x.accountheadtypeid == headTypeId).AnyAsync();
        public async Task<bool> CheckIfStateInUse(int stateId, int branchId) => await _context.accgstinfo
            .Where(x => x.BranchId == branchId && x.StateId == stateId).AnyAsync();
        public async Task<bool> CheckIfLocationDataInUse(int branchId, int zoneId = 0 , int thanaId = 0, int postOfficeId = 0, int tehsilId = 0 ) => await _context.village
            .Where(x => x.branchid == branchId && ((x.zoneid > 0 && x.zoneid == zoneId) || (x.thanaid > 0 && x.thanaid == thanaId) || (x.postofficeid > 0 && x.postofficeid == postOfficeId) || (x.tehsilid > 0 && x.tehsilid == tehsilId))).AnyAsync();


    }
}
