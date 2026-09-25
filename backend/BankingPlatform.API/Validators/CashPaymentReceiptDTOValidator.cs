using BankingPlatform.API.DTO.Voucher.Cash;
using FluentValidation;

namespace BankingPlatform.API.Validators;

public class CashPaymentReceiptDTOValidator : AbstractValidator<CashPaymentReceiptDTO>
{
    public CashPaymentReceiptDTOValidator()
    {
        RuleFor(x => x.BrID)
            .GreaterThan(0).WithMessage("Branch ID is required.");

        RuleFor(x => x.VoucherDate)
            .NotEmpty().WithMessage("Voucher date is required.")
            .Must(d => d.Year >= 2000 && d.Year <= 2100)
            .WithMessage("Voucher date is out of valid range.");

        RuleFor(x => x.CashAccountId)
            .GreaterThan(0).WithMessage("Cash account is required.");

        RuleFor(x => x.Entries)
            .NotEmpty().WithMessage("At least one entry is required.")
            .Must(e => e.Count <= 100).WithMessage("Cannot have more than 100 entries in a single voucher.");

        RuleForEach(x => x.Entries).SetValidator(new CashVoucherEntryDTOValidator());
    }
}

public class CashVoucherEntryDTOValidator : AbstractValidator<CashVoucherEntryDTO>
{
    public CashVoucherEntryDTOValidator()
    {
        RuleFor(x => x.AccountId)
            .GreaterThan(0).WithMessage("Account ID is required.");

        RuleFor(x => x.EntryType)
            .NotEmpty().WithMessage("Entry type is required.")
            .Must(t => t == "Cr" || t == "Dr")
            .WithMessage("Entry type must be 'Cr' or 'Dr'.");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Amount must be greater than zero.");
    }
}
