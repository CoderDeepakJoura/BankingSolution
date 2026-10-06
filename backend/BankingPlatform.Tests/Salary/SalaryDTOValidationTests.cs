using System.ComponentModel.DataAnnotations;
using BankingPlatform.API.DTO.Salary;

namespace BankingPlatform.Tests.Salary;

public class SalaryDTOValidationTests
{
    private static IList<ValidationResult> Validate(object dto)
    {
        var ctx = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(dto, ctx, results, validateAllProperties: true);
        return results;
    }

    // ── EmpGradeDTO ───────────────────────────────────────────────────────────

    [Fact]
    public void EmpGradeDTO_ValidValues_PassesValidation()
    {
        var dto = new EmpGradeDTO { BranchId = 1, Code = "GR01", Description = "Grade One" };
        Validate(dto).Should().BeEmpty();
    }

    [Fact]
    public void EmpGradeDTO_EmptyCode_FailsValidation()
    {
        var dto = new EmpGradeDTO { BranchId = 1, Code = "", Description = "Grade One" };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(EmpGradeDTO.Code)));
    }

    [Fact]
    public void EmpGradeDTO_CodeAtMaxLength_PassesValidation()
    {
        var dto = new EmpGradeDTO { BranchId = 1, Code = new string('X', 20), Description = "Grade One" };
        Validate(dto).Should().BeEmpty();
    }

    [Fact]
    public void EmpGradeDTO_CodeTooLong_FailsValidation()
    {
        var dto = new EmpGradeDTO { BranchId = 1, Code = new string('X', 21), Description = "Grade One" };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(EmpGradeDTO.Code)));
    }

    [Fact]
    public void EmpGradeDTO_EmptyDescription_FailsValidation()
    {
        var dto = new EmpGradeDTO { BranchId = 1, Code = "GR01", Description = "" };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(EmpGradeDTO.Description)));
    }

    [Fact]
    public void EmpGradeDTO_DescriptionTooLong_FailsValidation()
    {
        var dto = new EmpGradeDTO { BranchId = 1, Code = "GR01", Description = new string('D', 151) };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(EmpGradeDTO.Description)));
    }

    // ── BonusReportRequestDTO ─────────────────────────────────────────────────

    [Fact]
    public void BonusReportRequestDTO_ValidValues_PassesValidation()
    {
        var dto = new BonusReportRequestDTO { BranchId = 1, FromDate = "2025-04-01", ToDate = "2026-03-31", Days = 30 };
        Validate(dto).Should().BeEmpty();
    }

    [Fact]
    public void BonusReportRequestDTO_EmptyFromDate_FailsValidation()
    {
        var dto = new BonusReportRequestDTO { BranchId = 1, FromDate = "", ToDate = "2026-03-31", Days = 30 };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(BonusReportRequestDTO.FromDate)));
    }

    [Fact]
    public void BonusReportRequestDTO_EmptyToDate_FailsValidation()
    {
        var dto = new BonusReportRequestDTO { BranchId = 1, FromDate = "2025-04-01", ToDate = "", Days = 30 };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(BonusReportRequestDTO.ToDate)));
    }

    [Fact]
    public void BonusReportRequestDTO_ZeroDays_FailsValidation()
    {
        var dto = new BonusReportRequestDTO { BranchId = 1, FromDate = "2025-04-01", ToDate = "2026-03-31", Days = 0 };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(BonusReportRequestDTO.Days)));
    }

    [Fact]
    public void BonusReportRequestDTO_DaysBeyond365_FailsValidation()
    {
        var dto = new BonusReportRequestDTO { BranchId = 1, FromDate = "2025-04-01", ToDate = "2026-03-31", Days = 366 };
        Validate(dto).Should().ContainSingle(r => r.MemberNames.Contains(nameof(BonusReportRequestDTO.Days)));
    }

    [Fact]
    public void BonusReportRequestDTO_Days1_PassesValidation()
    {
        var dto = new BonusReportRequestDTO { BranchId = 1, FromDate = "2025-04-01", ToDate = "2026-03-31", Days = 1 };
        Validate(dto).Should().BeEmpty();
    }

    [Fact]
    public void BonusReportRequestDTO_Days365_PassesValidation()
    {
        var dto = new BonusReportRequestDTO { BranchId = 1, FromDate = "2025-04-01", ToDate = "2026-03-31", Days = 365 };
        Validate(dto).Should().BeEmpty();
    }

    // ── SalaryFilterDTO ───────────────────────────────────────────────────────

    [Fact]
    public void SalaryFilterDTO_Defaults_PageNumberOneAndPageSizeTwenty()
    {
        var dto = new SalaryFilterDTO();
        dto.PageNumber.Should().Be(1);
        dto.PageSize.Should().Be(20);
        dto.SearchTerm.Should().BeEmpty();
    }

    [Fact]
    public void SalaryFilterDTO_SearchTermCanBeSet()
    {
        var dto = new SalaryFilterDTO { SearchTerm = "John" };
        dto.SearchTerm.Should().Be("John");
    }

    // ── PayrollSettingsDTO ────────────────────────────────────────────────────

    [Fact]
    public void PayrollSettingsDTO_Defaults_AreCorrect()
    {
        var dto = new PayrollSettingsDTO();
        dto.StartDayOfMonth.Should().Be(1);
        dto.MaxSalaryForPf.Should().Be(15000m);
        dto.ExtraEmployeePf.Should().BeFalse();
        dto.ExtraEmployerPf.Should().BeFalse();
        dto.EmployeresicPerc.Should().Be(3.25m);
        dto.EsicLimit.Should().Be(21000m);
        dto.LoanProductIds.Should().NotBeNull().And.BeEmpty();
    }

    [Fact]
    public void PayrollSettingsDTO_LoanProductIds_CanAccumulateItems()
    {
        var dto = new PayrollSettingsDTO();
        dto.LoanProductIds.Add(101);
        dto.LoanProductIds.Add(102);
        dto.LoanProductIds.Should().HaveCount(2).And.Contain(101).And.Contain(102);
    }

    // ── EmployeeTransferDTO ───────────────────────────────────────────────────

    [Fact]
    public void EmployeeTransferDTO_Defaults_ZeroIds()
    {
        var dto = new EmployeeTransferDTO();
        dto.EmpId.Should().Be(0);
        dto.FromBranchId.Should().Be(0);
        dto.ToBranchId.Should().Be(0);
    }

    [Fact]
    public void EmployeeTransferDTO_Defaults_EmptyStrings()
    {
        var dto = new EmployeeTransferDTO();
        dto.TransferDate.Should().BeEmpty();
        dto.Remarks.Should().BeEmpty();
    }

    [Fact]
    public void EmployeeTransferDTO_SetValues_Roundtrip()
    {
        var dto = new EmployeeTransferDTO
        {
            EmpId = 7,
            FromBranchId = 1,
            ToBranchId = 2,
            TransferDate = "2025-10-01",
            Remarks = "Annual rotation"
        };
        dto.EmpId.Should().Be(7);
        dto.FromBranchId.Should().Be(1);
        dto.ToBranchId.Should().Be(2);
        dto.TransferDate.Should().Be("2025-10-01");
        dto.Remarks.Should().Be("Annual rotation");
    }

    // ── LoanRecoveryDetailRequestDTO ──────────────────────────────────────────

    [Fact]
    public void LoanRecoveryDetailRequestDTO_CanBeInstantiated()
    {
        var dto = new LoanRecoveryDetailRequestDTO { BranchId = 1, SalaryVoucherId = 42 };
        dto.BranchId.Should().Be(1);
        dto.SalaryVoucherId.Should().Be(42);
    }

    // ── LoanRecoveryDetailResponseDTO ─────────────────────────────────────────

    [Fact]
    public void LoanRecoveryDetailResponseDTO_Defaults_EmptyCollections()
    {
        var dto = new LoanRecoveryDetailResponseDTO();
        dto.DeductionComponents.Should().NotBeNull().And.BeEmpty();
        dto.Rows.Should().NotBeNull().And.BeEmpty();
        dto.TotalDeduction.Should().Be(0m);
        dto.BranchName.Should().BeEmpty();
        dto.SalaryMonth.Should().BeEmpty();
    }

    [Fact]
    public void LoanRecoveryDetailResponseDTO_RowDeductions_AccumulateCorrectly()
    {
        var row = new LoanRecoveryDetailRowDTO
        {
            SrNo = 1,
            EmpName = "Ramesh Kumar",
            Deductions =
            [
                new ComponentAmountDTO { CompId = 10, CompAlias = "PF", Amount = 1800m },
                new ComponentAmountDTO { CompId = 11, CompAlias = "ESIC", Amount = 375m },
            ]
        };
        row.TotalDeduction = row.Deductions.Sum(d => d.Amount);
        row.TotalDeduction.Should().Be(2175m);
    }

    // ── SalaryVoucherListRowDTO ───────────────────────────────────────────────

    [Fact]
    public void SalaryVoucherListRowDTO_Defaults_ZeroDecimals()
    {
        var dto = new SalaryVoucherListRowDTO();
        dto.TotalGross.Should().Be(0m);
        dto.TotalDeduction.Should().Be(0m);
        dto.TotalNetPay.Should().Be(0m);
        dto.EmployeeCount.Should().Be(0);
    }

    // ── SalaryVoucherListResponseDTO ──────────────────────────────────────────

    [Fact]
    public void SalaryVoucherListResponseDTO_Defaults_EmptyRows()
    {
        var dto = new SalaryVoucherListResponseDTO();
        dto.Rows.Should().NotBeNull().And.BeEmpty();
        dto.BranchName.Should().BeEmpty();
    }

    [Fact]
    public void SalaryVoucherListResponseDTO_Rows_CanAccumulateItems()
    {
        var dto = new SalaryVoucherListResponseDTO
        {
            BranchName = "Head Office",
            Rows =
            [
                new SalaryVoucherListRowDTO { VoucherId = 1, SalaryMonth = "September-2025", EmployeeCount = 12, TotalNetPay = 150000m },
                new SalaryVoucherListRowDTO { VoucherId = 2, SalaryMonth = "October-2025",   EmployeeCount = 12, TotalNetPay = 152000m },
            ]
        };
        dto.Rows.Should().HaveCount(2);
        dto.Rows.Sum(r => r.TotalNetPay).Should().Be(302000m);
    }

    // ── ComponentAmountHeader ─────────────────────────────────────────────────

    [Fact]
    public void ComponentAmountHeader_Defaults_AreEmpty()
    {
        var h = new ComponentAmountHeader();
        h.CompId.Should().Be(0);
        h.CompAlias.Should().BeEmpty();
    }

    [Fact]
    public void ComponentAmountHeader_SetValues_Roundtrip()
    {
        var h = new ComponentAmountHeader { CompId = 5, CompAlias = "PF" };
        h.CompId.Should().Be(5);
        h.CompAlias.Should().Be("PF");
    }
}
