using BankingPlatform.Infrastructure.Models;

namespace BankingPlatform.API.DTO.Village
{

    public class VillageDTO
    {
        public VillageDTO() { }

        public VillageDTO(int villageId, int branchId, string villageName, string? villageNameSL, int zoneId, int thanaId, int tehsilId, int postOfficeId, string? zoneName = "", string? tehsilName = "", string? postOfficeName = "", string? thanaName = "")
        {
            VillageId = villageId;
            VillageName = villageName;
            VillageNameSL = villageNameSL;
            ZoneId = zoneId;
            ThanaId = thanaId;
            PostOfficeId = postOfficeId;
            TehsilId = tehsilId;
            PostOfficeName = postOfficeName;
            TehsilName = tehsilName;
            ZoneName = zoneName;
            ThanaName = thanaName;
            BranchId = branchId;
            
        }
        public int VillageId { get; set; }
        [Required]
        public int BranchId { get; set; }
        [Required ]
        [StringLength(100, ErrorMessage = "Village Name must not be greater than 100 characters.")]
        public string VillageName { get; set; } = ""!;
        public string? VillageNameSL { get; set; } = ""!;
        [Required]
        public int ZoneId { get; set; }
        [Required]
        public int TehsilId { get; set; }
        [Required]
        public int PostOfficeId { get; set; }
        [Required]
        public int ThanaId { get; set; }
        public string? ThanaName { get; set; }
        public string? TehsilName { get; set; }
        public string? ZoneName { get; set; }
        public string? PostOfficeName { get; set; }
        
    }
}
