using BankingPlatform.API.DTO.Voucher;
using BankingPlatform.API.DTO.Voucher.Saving;
using FluentValidation;

namespace BankingPlatform.API.Validators;

public class SavingVoucherDTOValidator : AbstractValidator<SavingVoucherDTO>
{
    public SavingVoucherDTOValidator()
    {
        RuleFor(x => x.VoucherSubType)
            .NotEmpty().WithMessage("Voucher sub-type is required.")
            .Must(t => t == "D" || t == "W")
            .WithMessage("Voucher sub-type must be 'D' (Deposit) or 'W' (Withdrawal).");

        RuleFor(x => x.Voucher)
            .NotNull().WithMessage("Voucher details are required.")
            .SetValidator(new SavingVoucherInnerValidator()!);
    }
}

public class SavingVoucherInnerValidator : AbstractValidator<VoucherDTO>
{
    public SavingVoucherInnerValidator()
    {
        RuleFor(x => x.BrID)
            .GreaterThan(0).WithMessage("Branch ID is required.");

        RuleFor(x => x.VoucherDate)
            .NotEmpty().WithMessage("Voucher date is required.")
            .Must(d => d.Year >= 2000 && d.Year <= 2100)
            .WithMessage("Voucher date is out of valid range.");

        RuleFor(x => x.TotalDebit)
            .NotNull().WithMessage("Amount is required.")
            .GreaterThan(0).WithMessage("Amount must be greater than zero.")
            .LessThanOrEqualTo(99_999_999m).WithMessage("Amount exceeds maximum allowed value.");

        RuleFor(x => x.DebitAccountId)
            .NotNull().WithMessage("Debit account is required.")
            .GreaterThan(0).WithMessage("Debit account must be valid.");

        RuleFor(x => x.CreditAccountId)
            .NotNull().WithMessage("Credit account is required.")
            .GreaterThan(0).WithMessage("Credit account must be valid.");

        RuleFor(x => x.VoucherNarration)
            .MaximumLength(500).When(x => x.VoucherNarration != null)
            .WithMessage("Narration cannot exceed 500 characters.");
    }
}
