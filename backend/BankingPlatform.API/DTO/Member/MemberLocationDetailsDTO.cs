namespace BankingPlatform.API.DTO.Member
{
    public class MemberLocationDetailsDTO
    {
        public int? Id { get; set; }

        [Required]
        public int BranchId { get; set; }

        // Foreign Key to Member (Required)
        [Required]
        public int MemberId { get; set; }

        [Required]
        [StringLength(150)]
        public string AddressLine1 { get; set; } = string.Empty;

        [StringLength(150)]
        public string? AddressLineSL1 { get; set; }

        [StringLength(150)]
        public string? AddressLine2 { get; set; }

        [StringLength(150)]
        public string? AddressLineSL2 { get; set; }

        [Required]
        public int VillageId1 { get; set; }

        public int VillageId2 { get; set; } // Note: Assuming non-required fields are nullable in the DTO

        [Required]
        public int PO1 { get; set; }

        public int PO2 { get; set; }

        [Required]
        public int Tehsil1 { get; set; }

        public int Tehsil2 { get; set; }

        [Required]
        public int ThanaId1 { get; set; }

        public int ThanaId2 { get; set; }

        [Required]
        public int ZoneId1 { get; set; }

        public int ZoneId2 { get; set; }
    }
}
