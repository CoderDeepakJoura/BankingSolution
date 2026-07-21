namespace BankingPlatform.API.DTO.InterBranch
{
    public class IBSavingDepositStep1DTO
    {
        public int    BrId          { get; set; }   // login branch (originating)
        public int    DestBrId      { get; set; }   // destination branch
        public int    DestAccId     { get; set; }   // saving account ID at dest branch
        public string DestAccNo     { get; set; } = "";
        public string DestAccName   { get; set; } = "";
        public int?   DestMemberId  { get; set; }
        public int    DrAccId       { get; set; }   // cash account at login branch
        public int    CrAccId       { get; set; }   // IB reference account at login branch
        public decimal Amount       { get; set; }
        public string? Narration    { get; set; }
        public DateTime VoucherDate { get; set; }   // working date
        public string WorkingDate   { get; set; } = "";
        public string? UserId       { get; set; }
        // "HOToBranch" = 2-step | "BranchToBranch" = 3-step
        public string FlowType      { get; set; } = "BranchToBranch";
    }

    public class IBSavingDepositStep2DTO
    {
        public int    HoBrId      { get; set; }
        public string WorkingDate { get; set; } = "";
        public string? UserId     { get; set; }
        public string? Narration  { get; set; }
    }

    public class IBSavingDepositStep3DTO
    {
        public int    DestBrId    { get; set; }   // login branch = destination branch
        public string WorkingDate { get; set; } = "";
        public string? UserId     { get; set; }
        public string? Narration  { get; set; }
    }

    public class IBNotificationItemDTO
    {
        public int     Id           { get; set; }
        public string  Type         { get; set; } = ""; // "incoming" | "pendingHO"
        public string  VoucherType  { get; set; } = "";
        public decimal Amount       { get; set; }
        public string? FromBrName   { get; set; }
        public string? DestBrName   { get; set; }
        public string? DestAccName  { get; set; }
    }

    public class IBNotificationDTO
    {
        public int IncomingCount  { get; set; }
        public int PendingHOCount { get; set; }
        public List<IBNotificationItemDTO> Items { get; set; } = new();
    }

    public class IBVoucherListDTO
    {
        public int     Id            { get; set; }
        public string  VoucherType   { get; set; } = "";
        public string  FlowType      { get; set; } = "BranchToBranch";
        public decimal Amount        { get; set; }
        public string? Narration     { get; set; }
        public DateTime EntryDate    { get; set; }
        public string  Status        { get; set; } = "";
        public int     FromBrId      { get; set; }
        public string? FromBrName    { get; set; }
        public string? FromBrCode    { get; set; }
        public int     DestBrId      { get; set; }
        public string? DestBrName    { get; set; }
        public string? DestBrCode    { get; set; }
        public string  DestAccNo     { get; set; } = "";
        public string? DestAccName   { get; set; }
        // Step 1 accounts
        public string? Step1DrAccName { get; set; }
        public string? Step1CrAccName { get; set; }
        // Step 2 accounts (shown at HO)
        public int?    Step2VoucherId  { get; set; }
        public string? Step2DrAccName { get; set; }
        public string? Step2CrAccName { get; set; }
        // Step 3 accounts (shown at dest branch)
        public int?    Step3VoucherId  { get; set; }
        public string? Step3DrAccName { get; set; }
        public string? Step3CrAccName { get; set; }
    }
}
