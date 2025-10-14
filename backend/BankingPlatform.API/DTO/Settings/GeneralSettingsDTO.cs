namespace BankingPlatform.API.DTO.Settings
{
    public class GeneralSettingsDTO
    {
        public GeneralSettingsDTO() { }

        public GeneralSettingsDTO(int branchId, int admissionFeeAccountId, decimal admissionFeeAmount)
        {
            BranchId = branchId;
            AdmissionFeeAccountId = admissionFeeAccountId;
            AdmissionFeeAmount = admissionFeeAmount;
        }

        [Required]
        public int BranchId { get; set; }

        public int AdmissionFeeAccountId { get; set; }
        public decimal AdmissionFeeAmount { get; set; }

        public string? AdmissionFeeAccName { get; set; }
    }

}
