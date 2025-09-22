
namespace BankingPlatform.API.Common.CommonFunctions
{
    public class CommonFunctions
    {
        private readonly BankingDbContext _context;
        public CommonFunctions(
            BankingDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
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

    }
}
