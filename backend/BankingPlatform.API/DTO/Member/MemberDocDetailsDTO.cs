namespace BankingPlatform.API.DTO.Member
{
    public class MemberDocDetailsDTO
    {
        [Required]
        public int Id { get; set; }

        [Required]
        public int BranchId { get; set; }

        [Required]
        public int MemberId { get; set; }

        // Document Details — all optional when the UI toggles permit
        [StringLength(20)]
        public string? PanCardNo { get; set; }

        [StringLength(20)]
        public string? AadhaarCardNo { get; set; }

        [StringLength(10)]
        public string? MemberPicExt { get; set; }

        [StringLength(10)]
        public string? MemberSignExt { get; set; }
    }
}
