namespace BankingPlatform.API.DTO.Location.State
{
    public class StateDTO
    {
        public StateDTO() { }
        public StateDTO(string stateCode , string stateName, int stateId = 0) { 
            StateCode = stateCode;
            StateName = stateName;
            StateId = stateId;
        }
        [Required] public string StateCode { get; set; }
        [Required] public string StateName { get; set; }

        public int StateId { get; set; } = 0;

    }
}
