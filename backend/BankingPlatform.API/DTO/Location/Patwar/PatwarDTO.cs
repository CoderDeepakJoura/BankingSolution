namespace BankingPlatform.API.DTO.Location.Patwar
{
    public class PatwarDTO
    {
        public PatwarDTO() { }

        public PatwarDTO(string description, string? descriptionSl, int patwarId, int branchId)
        {
            Description = description;
            DescriptionSL = descriptionSl;
            PatwarId = patwarId;
            BranchId = branchId;

        }

        [Required(ErrorMessage = "Description is required")]
        [StringLength(50, ErrorMessage = "Description cannot exceed 50 characters.")]
        public string Description { get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Description SL cannot exceed 50 characters.")]
        public string? DescriptionSL { get; set; } = string.Empty;

        public int PatwarId { get; set; } = 0;
        [Required]
        public int BranchId { get; set; }
    }
}
