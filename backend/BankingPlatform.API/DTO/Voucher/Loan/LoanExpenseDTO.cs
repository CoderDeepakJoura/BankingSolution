namespace BankingPlatform.API.DTO.Voucher.Loan
{
    public class TaxLineDTO
    {
        public int TaxTypeId { get; set; }
        public string? TaxTypeName { get; set; }
        public decimal Perc { get; set; }
        public decimal TaxAmt { get; set; }
        public int AccId { get; set; }
    }

    public class GSTDetailDTO
    {
        public int BillBookId { get; set; }
        public int BillNo { get; set; }
        public int StateId { get; set; }
        public string? StateName { get; set; }
        public int SupplyTypeId { get; set; }
        public string? GstinNo { get; set; }
        public int ServiceId { get; set; }
        public string? ServiceName { get; set; }
        public int TaxId { get; set; }
        public string? TaxName { get; set; }
        public List<TaxLineDTO> TaxLines { get; set; } = new();
    }

    public class LoanExpenseDTO
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public DateTime Date { get; set; }
        public int LoanProductId { get; set; }
        public int DrAccountId { get; set; }
        public int ExpenseCategoryId { get; set; }
        public decimal ExpenseAmount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal NetAmount { get; set; }
        public string? Remarks { get; set; }
        public int CrAccountTypeId { get; set; }
        public int CrAccountId { get; set; }
        public GSTDetailDTO? GstDetail { get; set; }
    }

    public class LoanExpenseListDTO
    {
        public int Id { get; set; }
        public string? Date { get; set; }
        public string? LoanProductName { get; set; }
        public string? AccountName { get; set; }
        public string? ExpenseCategoryName { get; set; }
        public decimal ExpenseAmount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal NetAmount { get; set; }
        public string? Remarks { get; set; }
        public int VoucherNo { get; set; }
    }

    public class ServiceLookupDTO
    {
        public bool HasService { get; set; }
        public int ServiceId { get; set; }
        public string? ServiceName { get; set; }
        public int TaxId { get; set; }
        public string? TaxName { get; set; }
        public List<TaxLineDTO> TaxLines { get; set; } = new();
    }

    public class BillBookDTO
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public int BillNoGeneration { get; set; }
        public int NextBillNo { get; set; }
    }
}
