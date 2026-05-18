namespace BankingPlatform.API.DTO.Miscalleneous
{
    public class UserDTO
    {
        public int? Id { get; set; }
        public int BranchId { get; set; }
        public string? Username { get; set; }
        public string? Password { get; set; }
        public int IsAuthorized { get; set; }
        public int IsSu { get; set; }
        public int IsBranchSu { get; set; }
        public int UserType { get; set; }
    }

    public class UserListDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public string Username { get; set; } = null!;
        public int IsAuthorized { get; set; }
        public int IsSu { get; set; }
        public int IsBranchSu { get; set; }
        public int UserType { get; set; }
    }

    public class UserFilterDTO
    {
        public int BranchId { get; set; }
        public string? SearchTerm { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
