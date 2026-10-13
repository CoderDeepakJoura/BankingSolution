using BankingPlatform.API.DTO.Voucher.Loan;

namespace BankingPlatform.API.DTO.InterBranch
{
    public class IBLoanExpenseStep1DTO
    {
        public int    BrId              { get; set; }   // login branch (originating — cash collected here)
        public int    DestBrId          { get; set; }   // destination branch (loan account lives here)
        public int    DestAccId         { get; set; }   // loan account ID at dest branch
        public string DestAccNo         { get; set; } = "";
        public string DestAccName       { get; set; } = "";
        public int?   DestMemberId      { get; set; }
        public int    DrAccId           { get; set; }   // IB-Ref account at login branch (Dr side)
        public int    CrAccId           { get; set; }   // credit account at login branch (Cr side)
        public decimal Amount           { get; set; }   // NetAmount (expense + tax)
        public int    LoanProductId     { get; set; }
        public int    ExpenseCategoryId { get; set; }
        public decimal ExpenseAmount    { get; set; }   // base expense before tax
        public decimal TotalTax         { get; set; }
        public string? Remarks          { get; set; }
        public int    CrAccountTypeId   { get; set; }
        public string? Narration        { get; set; }
        public DateTime VoucherDate     { get; set; }
        public string WorkingDate       { get; set; } = "";
        public string? UserId           { get; set; }
        public string FlowType          { get; set; } = "BranchToBranch";
        // GST at source branch (optional — dest branch has its own GST for the loanexpense record)
        public GSTDetailDTO? GstDetail  { get; set; }
    }

    public class IBLoanExpenseFinalStepDTO
    {
        public int    DestBrId    { get; set; }
        public string WorkingDate { get; set; } = "";
        public string? UserId     { get; set; }
        public string? Narration  { get; set; }
    }

    public class IBLoanAdvancementStep1DTO
    {
        public int    BrId          { get; set; }   // login branch (originating — cash disbursed here)
        public int    DestBrId      { get; set; }   // destination branch (loan account lives here)
        public int    DestAccId     { get; set; }   // loan account ID at dest branch
        public string DestAccNo     { get; set; } = "";
        public string DestAccName   { get; set; } = "";
        public int?   DestMemberId  { get; set; }
        public int    DrAccId       { get; set; }   // IB-Ref account at login branch (Dr side)
        public int    CrAccId       { get; set; }   // Cash account at login branch (Cr side)
        public decimal Amount       { get; set; }
        public string? Narration    { get; set; }
        public DateTime VoucherDate { get; set; }
        public string WorkingDate   { get; set; } = "";
        public string? UserId       { get; set; }
        // "HOToBranch" = 2-step | "BranchToBranch" = 3-step
        public string FlowType      { get; set; } = "BranchToBranch";
    }


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

    public class IBLoanRecoveryStep1DTO
    {
        public int    BrId          { get; set; }   // login branch (originating — cash received here)
        public int    DestBrId      { get; set; }   // destination branch (loan account lives here)
        public int    DestAccId     { get; set; }   // loan account ID at dest branch
        public string DestAccNo     { get; set; } = "";
        public string DestAccName   { get; set; } = "";
        public int?   DestMemberId  { get; set; }
        public int    CrAccId       { get; set; }   // IB-Ref account at login branch (Cr side)
        public decimal TotalAmount  { get; set; }
        public List<LoanRecoveryDebitItemDTO> DebitItems { get; set; } = new();
        public int    LoanProductId { get; set; }   // for reference
        public string? Narration    { get; set; }
        public DateTime VoucherDate { get; set; }
        public string WorkingDate   { get; set; } = "";
        public string? UserId       { get; set; }
        public string FlowType      { get; set; } = "BranchToBranch";
    }

    public class IBLoanRecoveryFinalStepDTO
    {
        public int    DestBrId    { get; set; }
        public string WorkingDate { get; set; } = "";
        public string? UserId     { get; set; }
        public string? Narration  { get; set; }
        public decimal? IntAmount { get; set; }   // override for Stand loans
    }

    public class IBRDKistStep1DTO
    {
        public int     BrId         { get; set; }   // login branch (source — cash collected here)
        public int     DestBrId     { get; set; }   // destination branch (RD account lives here)
        public int     DestAccId    { get; set; }   // RD account ID at dest branch
        public string  DestAccNo    { get; set; } = "";
        public string  DestAccName  { get; set; } = "";
        public int?    DestMemberId { get; set; }
        public int     DrAccId      { get; set; }   // cash account at login branch
        public int     CrAccId      { get; set; }   // IB reference account at login branch
        public decimal Amount       { get; set; }   // total = kist + penalty
        public decimal PenaltyAmount { get; set; }
        public string? Narration    { get; set; }
        public DateTime VoucherDate { get; set; }
        public string  WorkingDate  { get; set; } = "";
        public string? UserId       { get; set; }
        public string  FlowType     { get; set; } = "BranchToBranch";
    }

    public class IBVoucherListDTO
    {
        public int     Id            { get; set; }
        public string  VoucherType   { get; set; } = "";
        public string  FlowType      { get; set; } = "BranchToBranch";
        public decimal Amount        { get; set; }
        public decimal PenaltyAmount { get; set; }
        public string? Narration     { get; set; }
        public DateTime EntryDate    { get; set; }
        public string  Status        { get; set; } = "";
        public int     FromBrId      { get; set; }
        public string? FromBrName    { get; set; }
        public string? FromBrCode    { get; set; }
        public int     DestBrId      { get; set; }
        public string? DestBrName    { get; set; }
        public string? DestBrCode    { get; set; }
        public int     DestAccId     { get; set; }
        public string  DestAccNo     { get; set; } = "";
        public string? DestAccName   { get; set; }
        // Step 1 accounts
        public int?    Step1VoucherId { get; set; }
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
        // Expense detail fields (IBLoanExpense vouchers only)
        public int?    ExpenseLoanProductId   { get; set; }
        public string? ExpenseLoanProductName { get; set; }
        public int?    ExpenseCategoryId      { get; set; }
        public string? ExpenseCategoryName    { get; set; }
        public decimal? ExpenseAmount         { get; set; }
        public decimal? ExpenseTotalTax       { get; set; }
        public decimal? ExpenseNetAmount      { get; set; }
        public string? ExpenseRemarks         { get; set; }
        public int?    ExpenseCrAccountTypeId { get; set; }
    }
}
