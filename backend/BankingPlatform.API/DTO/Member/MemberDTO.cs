using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.Member
{
    public class MemberDTO
    {
        // Primary keys (required)
        [Required]
        public int Id { get; set; }

        [Required]
        public int MemberBranchId { get; set; }

        [Required]
        public int MemberDefAreaBrId { get; set; }

        // Optional values
        public int? MemberMemberType { get; set; }

        [StringLength(20)]
        public string? MemberNominalMembershipNo { get; set; }

        [StringLength(20)]
        public string? MemberPermanentMembershipNo { get; set; }

        [Required, StringLength(100)]
        public string MemberFirstName { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string MemberLastName { get; set; } = string.Empty;

        [StringLength(100)]
        public string? MemberFirstNameSL { get; set; }

        [StringLength(100)]
        public string? MemberLastNameSL { get; set; }

        [Required, StringLength(100)]
        public string? MemberRelFirstName { get; set; }

        [StringLength(100)]
        public string? MemberRelLastName { get; set; }

        public int? MemberRelationId { get; set; }
        [Required]
        public int? MemberGender { get; set; }

        [Required]
        public DateTime MemberDOB { get; set; }

        public int? MemberCasteId { get; set; }

        [Required]
        public DateTime MemberJoiningDate { get; set; }
        public int? MemberOccupationId { get; set; }

        [StringLength(100)]
        public string? MemberThana { get; set; }

        [Required, StringLength(150)]
        public string MemberAddressLine1 { get; set; } = string.Empty;

        [StringLength(150)]
        public string? MemberAddressLineSL1 { get; set; }

        [Required]
        public int? MemberVillageId1 { get; set; }
        public int? MemberPO1 { get; set; }
        public int? MemberTehsil1 { get; set; }

        [StringLength(150)]
        public string? MemberAddressLine2 { get; set; }

        [StringLength(150)]
        public string? MemberAddressLineSL2 { get; set; }

        public int? MemberVillageId2 { get; set; }
        public int? MemberPO2 { get; set; }
        public int? MemberTehsil2 { get; set; }

        public int? MemberPhoneType1 { get; set; }
        [StringLength(5)]
        public string? MemberPhonePrefix1 { get; set; }
        [StringLength(20)]
        public string? MemberPhoneNo1 { get; set; }

        public int? MemberPhoneType2 { get; set; }
        [StringLength(5)]
        public string? MemberPhonePrefix2 { get; set; }
        [StringLength(20)]
        public string? MemberPhoneNo2 { get; set; }

        public int? MemberStatus { get; set; }
        public DateTime? MemberStatusDate { get; set; }

        public int? MemberZoneId { get; set; }

        [StringLength(20)]
        public string? MemberPanCardNo { get; set; }

        [StringLength(20)]
        public string? MemberAadhaarCardNo { get; set; }

        [StringLength(25)]
        public string? MemberGSTINO { get; set; }

        public int? MemberCategoryId { get; set; }
        [Required, StringLength(100)]
        public string AccountNumber { get; set; } = ""!;
    }
}
