namespace BankingPlatform.API.DTO.Miscalleneous
{
    public class OccupationDTO
    {
        public OccupationDTO() { }

        public OccupationDTO(string description, string? descriptionSl, int occupationId, int branchId)
        {
            Description = description;
            DescriptionSL = descriptionSl;
            OccupationId = occupationId;
            BranchId = branchId;

        }

        [Required(ErrorMessage = "Description is required")]
        [StringLength(50, ErrorMessage = "Description cannot exceed 50 characters.")]
        public string Description { get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Description SL cannot exceed 50 characters.")]
        public string? DescriptionSL { get; set; } = string.Empty;

        public int OccupationId { get; set; } = 0;
        [Required]
        public int BranchId { get; set; }
    }
}
