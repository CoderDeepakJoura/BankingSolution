namespace BankingPlatform.API.DTO.Relation
{
    public class RelationDTO
    {
        public RelationDTO() { }
        public RelationDTO(int relationid, string description, string descriptionSL)
        {
            RelationId = relationid;
            Description = description;
            DescriptionSL = descriptionSL;
        }
        public int RelationId { get; set; } = 0;
        [Required, StringLength(100, ErrorMessage = "Description should not be more than 100 characters.")]
        public string Description { get; set; } = string.Empty;
        public string DescriptionSL { get; set; } = string.Empty;
    }
}
