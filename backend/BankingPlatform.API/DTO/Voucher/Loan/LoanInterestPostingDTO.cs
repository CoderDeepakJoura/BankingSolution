namespace BankingPlatform.API.DTO.Voucher.Loan
{
    public class LoanInterestPostingVoucherDTO
    {
        public int BrId { get; set; }
        public int LoanAccountId { get; set; }
        public DateTime VoucherDate { get; set; }
        public decimal StdInterestAmount { get; set; }
        public decimal PenalInterestAmount { get; set; }
        public string? Narration { get; set; }
    }

    public class LoanInterestPostingInfoDTO
    {
        public int LoanAccId { get; set; }
        public string AccountNumber { get; set; } = string.Empty;
        public string MemberName { get; set; } = string.Empty;
        public string? MemberRelativeName { get; set; }
        public string? PhoneNo { get; set; }
        public string? LoanNo { get; set; }
        public DateTime? LoanDate { get; set; }
        public double? StandardInterestRate { get; set; }
        public double? OverdueInterestRate { get; set; }
        public decimal PrincipalBalance { get; set; }
        public decimal UnpostedStdInterest { get; set; }
        public decimal UnpostedPenalInterest { get; set; }
        public decimal TotalPostable { get; set; }
        public DateTime? InterestCalcFromDate { get; set; }
        public DateTime? InterestCalcToDate { get; set; }
        public string IntCalcMethod { get; set; } = "Schedule";
        public int? ActOnIntPosting { get; set; }
    }

    // ── Batch calculation DTOs ────────────────────────────────────────────────────

    public class InterestCalcSegmentDTO
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal Balance { get; set; }
        public int Days { get; set; }
        public double Rate { get; set; }
        public decimal Interest { get; set; }
    }

    public class LoanInterestBatchItemDTO
    {
        public int LoanAccId { get; set; }
        public string AccountNumber { get; set; } = string.Empty;
        public string MemberName { get; set; } = string.Empty;
        public string? MemberRelativeName { get; set; }
        public decimal PrincipalBalance { get; set; }
        public decimal StdInterest { get; set; }        // unposted accrued standard interest
        public decimal PenalInterest { get; set; }      // unposted accrued penal interest
        public decimal StdRecoverable { get; set; }     // posted but not yet recovered
        public decimal TotalPostable { get; set; }      // StdInterest + PenalInterest
        public DateTime? CalcFromDate { get; set; }     // last IP date or opening date
        public DateTime? CalcToDate { get; set; }
        public double? StdInterestRate { get; set; }
        public double? OverdueInterestRate { get; set; }
        public string IntCalcMethod { get; set; } = "Schedule";
        // 1=AddInBalance (interest embedded in principal), 2=Stand; null=unknown
        public int? ActOnIntPosting { get; set; }
        // Reason why TotalPostable is 0 (empty = has postable interest)
        public string? NoInterestReason { get; set; }
        // Day-weighted breakdown (Balance / WO-schedule-fallback method only)
        public List<InterestCalcSegmentDTO>? CalcBreakdown { get; set; }
    }

    public class LoanInterestBatchPostItemDTO
    {
        public int LoanAccountId { get; set; }
        public decimal StdInterestAmount { get; set; }
        public decimal PenalInterestAmount { get; set; }
    }

    public class LoanInterestBatchPostRequestDTO
    {
        public int BrId { get; set; }
        public DateTime VoucherDate { get; set; }
        public string? Narration { get; set; }
        public List<LoanInterestBatchPostItemDTO> Items { get; set; } = new();
    }

    public class LoanInterestBatchPostResultDTO
    {
        public int SuccessCount { get; set; }
        public int FailCount { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}
