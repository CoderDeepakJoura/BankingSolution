using BankingPlatform.API.DTO.Voucher.Loan;
using FluentValidation;

namespace BankingPlatform.API.Validators;

public class LoanAdvancementVoucherDTOValidator : AbstractValidator<LoanAdvancementVoucherDTO>
{
    public LoanAdvancementVoucherDTOValidator()
    {
        RuleFor(x => x.BrId)
            .GreaterThan(0).WithMessage("Branch ID is required.");

        RuleFor(x => x.VoucherDate)
            .Must(d => d.Year >= 2000 && d.Year <= 2100)
            .WithMessage("Voucher date is out of valid range.");

        RuleFor(x => x.LoanAccountId)
            .GreaterThan(0).WithMessage("Loan account is required.");

        RuleFor(x => x.TotalAmount)
            .GreaterThan(0).WithMessage("Total amount must be greater than zero.")
            .LessThanOrEqualTo(99_999_999m).WithMessage("Total amount exceeds maximum allowed value.");

        RuleFor(x => x.Narration)
            .MaximumLength(500).When(x => x.Narration != null)
            .WithMessage("Narration cannot exceed 500 characters.");

        RuleFor(x => x.CreditItems)
            .NotEmpty().WithMessage("At least one credit item is required.")
            .Must(items => items.Count <= 50).WithMessage("Cannot have more than 50 credit items.");

        RuleForEach(x => x.CreditItems).SetValidator(new LoanAdvancementCreditItemDTOValidator());
    }
}

public class LoanAdvancementCreditItemDTOValidator : AbstractValidator<LoanAdvancementCreditItemDTO>
{
    public LoanAdvancementCreditItemDTOValidator()
    {
        RuleFor(x => x.AccountId)
            .GreaterThan(0).WithMessage("Credit account ID is required.");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Credit item amount must be greater than zero.");
    }
}
