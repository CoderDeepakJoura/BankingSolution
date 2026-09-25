using BankingPlatform.API.DTO.Voucher.Cash;
using BankingPlatform.API.Validators;
using FluentValidation.TestHelper;

namespace BankingPlatform.Tests.Validators;

public class CashVoucherValidatorTests
{
    private readonly CashPaymentReceiptDTOValidator _validator = new();

    private static CashPaymentReceiptDTO ValidDto() => new()
    {
        BrID = 1,
        VoucherDate = new DateTime(2025, 9, 15),
        CashAccountId = 10,
        Entries =
        [
            new CashVoucherEntryDTO { AccountId = 5, EntryType = "Cr", Amount = 1000 }
        ]
    };

    [Fact]
    public void ValidVoucher_PassesValidation()
    {
        var result = _validator.TestValidate(ValidDto());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void ZeroBranchId_FailsValidation()
    {
        var dto = ValidDto(); dto.BrID = 0;
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.BrID);
    }

    [Fact]
    public void ZeroCashAccountId_FailsValidation()
    {
        var dto = ValidDto(); dto.CashAccountId = 0;
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.CashAccountId);
    }

    [Fact]
    public void EmptyEntries_FailsValidation()
    {
        var dto = ValidDto(); dto.Entries = [];
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.Entries);
    }

    [Fact]
    public void NegativeEntryAmount_FailsValidation()
    {
        var dto = ValidDto();
        dto.Entries[0].Amount = -100;
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor("Entries[0].Amount");
    }

    [Fact]
    public void InvalidEntryType_FailsValidation()
    {
        var dto = ValidDto();
        dto.Entries[0].EntryType = "XX";
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor("Entries[0].EntryType");
    }

    [Fact]
    public void FutureDateBeyond2100_FailsValidation()
    {
        var dto = ValidDto();
        dto.VoucherDate = new DateTime(2101, 1, 1);
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.VoucherDate);
    }
}
