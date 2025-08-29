using System.ComponentModel.DataAnnotations;

public class ThanaMasterDto
{
    public ThanaMasterDto() { }

    public ThanaMasterDto(string thanaName, string thanaCode, string? thanaNameSl, int thanaId)
    {
        ThanaName = thanaName;
        ThanaCode = thanaCode;
        ThanaNameSL = thanaNameSl;
        ThanaId = thanaId;
    }

    [Required(ErrorMessage = "Thana Code is required")]
    [StringLength(10, ErrorMessage = "Thana Code cannot exceed 10 characters.")]
    public string ThanaCode { get; set; } = string.Empty;

    [Required(ErrorMessage = "Thana Name is required")]
    [StringLength(50, ErrorMessage = "Thana Name cannot exceed 50 characters.")]
    public string ThanaName { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "Thana Name SL cannot exceed 50 characters.")]
    public string? ThanaNameSL { get; set; } = string.Empty;

    public int ThanaId { get; set; } = 0;
}
