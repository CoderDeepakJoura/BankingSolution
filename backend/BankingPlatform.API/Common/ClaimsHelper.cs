using System.Security.Claims;

namespace BankingPlatform.API.Common
{
    public static class ClaimsHelper
    {
        public static int GetBranchId(ClaimsPrincipal user)
        {
            int.TryParse(user.FindFirst("branchId")?.Value, out var id);
            return id;
        }

        public static bool GetIsSu(ClaimsPrincipal user)
        {
            bool.TryParse(user.FindFirst("isSu")?.Value, out var isSu);
            return isSu;
        }

        /// <summary>
        /// Returns true if the authenticated user belongs to the requested branch,
        /// or if they are a super-user (who can access any branch).
        /// </summary>
        public static bool BranchMatches(ClaimsPrincipal user, int requestedBranchId)
        {
            return GetIsSu(user) || GetBranchId(user) == requestedBranchId;
        }
    }
}
