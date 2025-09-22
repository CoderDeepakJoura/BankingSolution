namespace BankingPlatform.API.DTO.AccountMasters
{
    public class GSTInfoDTO
    {
        public GSTInfoDTO() { }
        public GSTInfoDTO(int branchId = 0, int accId = 0 , int stateId = 0, string gstInNo = "", int gstInfoId = 0, string? stateName = null)
        {
            BranchId = branchId;
            AccId = accId;
            StateId = stateId;
            GSTInfoId = gstInfoId;
            GSTInNo = gstInNo;
            StateName = stateName;
        }
        public int BranchId { get; set; }
        public int AccId { get; set; }
        public int GSTInfoId { get; set; }
        public int StateId { get; set; }
        public string? GSTInNo { get; set; }
        public string? StateName { get; set; }
    }
}
