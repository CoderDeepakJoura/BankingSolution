using BankingPlatform.API.DTO.Voucher;
using FluentValidation;

namespace BankingPlatform.API.Validators;

public class VoucherDTOValidator : AbstractValidator<VoucherDTO>
{
    public VoucherDTOValidator()
    {
        RuleFor(x => x.BrID)
            .GreaterThan(0).WithMessage("Branch ID is required.");

        RuleFor(x => x.VoucherDate)
            .NotEmpty().WithMessage("Voucher date is required.")
            .Must(d => d.Year >= 2000 && d.Year <= 2100)
            .WithMessage("Voucher date is out of valid range.");

        RuleFor(x => x.TotalDebit)
            .GreaterThan(0).When(x => x.TotalDebit.HasValue)
            .WithMessage("Voucher amount must be greater than zero.");

        RuleFor(x => x.DebitAccountId)
            .GreaterThan(0).When(x => x.DebitAccountId.HasValue && x.DebitAccountId != 0)
            .WithMessage("Debit account ID must be valid.");

        RuleFor(x => x.VoucherNarration)
            .MaximumLength(500).When(x => x.VoucherNarration != null)
            .WithMessage("Narration cannot exceed 500 characters.");
    }
}
