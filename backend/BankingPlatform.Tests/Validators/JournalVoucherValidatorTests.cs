using BankingPlatform.API.DTO.Voucher.Journal;
using BankingPlatform.API.Validators;
using FluentValidation.TestHelper;

namespace BankingPlatform.Tests.Validators;

public class JournalVoucherValidatorTests
{
    private readonly JournalVoucherDTOValidator _validator = new();

    private static JournalVoucherDTO BalancedDto() => new()
    {
        BrID = 1,
        VoucherDate = new DateTime(2025, 9, 15),
        Entries =
        [
            new JournalVoucherEntryDTO { AccountId = 5,  EntryType = "Dr", Amount = 1000 },
            new JournalVoucherEntryDTO { AccountId = 10, EntryType = "Cr", Amount = 1000 }
        ]
    };

    [Fact]
    public void BalancedJournalVoucher_PassesValidation()
    {
        var result = _validator.TestValidate(BalancedDto());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void UnbalancedEntries_FailsValidation()
    {
        var dto = BalancedDto();
        dto.Entries[0].Amount = 1500; // Dr 1500, Cr 1000
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.Entries);
    }

    [Fact]
    public void SingleEntry_FailsValidation()
    {
        var dto = BalancedDto();
        dto.Entries = [dto.Entries[0]];
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.Entries);
    }

    [Fact]
    public void ZeroBranchId_FailsValidation()
    {
        var dto = BalancedDto(); dto.BrID = 0;
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.BrID);
    }
}
