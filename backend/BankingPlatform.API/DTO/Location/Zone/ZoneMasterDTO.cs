using System.ComponentModel.DataAnnotations;

public class ZoneMasterDto
{
    public ZoneMasterDto() { }

    public ZoneMasterDto(string zoneName, string zoneCode, string? zoneNameSl, int zoneId, int branchId)
    {
        ZoneName = zoneName;
        ZoneCode = zoneCode;
        ZoneNameSL = zoneNameSl;
        ZoneId = zoneId;
        BranchId = branchId;
    }

    [Required(ErrorMessage = "Zone Code is required")]
    [StringLength(10, ErrorMessage = "Zone Code cannot exceed 10 characters.")]
    public string ZoneCode { get; set; } = string.Empty;

    [Required(ErrorMessage = "Zone Name is required")]
    [StringLength(50, ErrorMessage = "Zone Name cannot exceed 50 characters.")]
    public string ZoneName { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "Zone Name SL cannot exceed 50 characters.")]
    public string? ZoneNameSL { get; set; } = string.Empty;

    public int ZoneId { get; set; } = 0;
    [Required]
    public int BranchId { get; set; } = 0;
}
