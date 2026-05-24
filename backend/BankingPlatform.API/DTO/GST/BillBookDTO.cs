using System.ComponentModel.DataAnnotations;

namespace BankingPlatform.API.DTO.GST
{
    public class BillBookDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }

        [StringLength(100)]
        public string? Description { get; set; }

        [StringLength(5)]
        public string? BillNoPrefix { get; set; }

        public int BillNoFrom { get; set; }

        // 1=Financial Year, 2=Continuous
        public short BillNoGeneration { get; set; } = 1;
    }
}
