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

        // Document Details
        [Required]
        [StringLength(20)]
        public string PanCardNo { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string AadhaarCardNo { get; set; } = string.Empty;

        [Required]
        [StringLength(10)]
        public string MemberPicExt { get; set; } = string.Empty;

        [Required]
        [StringLength(10)]
        public string MemberSignExt { get; set; } = string.Empty;
    }
}
