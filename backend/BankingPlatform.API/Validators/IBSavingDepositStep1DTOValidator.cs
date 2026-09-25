using BankingPlatform.API.DTO.InterBranch;
using FluentValidation;

namespace BankingPlatform.API.Validators;

public class IBSavingDepositStep1DTOValidator : AbstractValidator<IBSavingDepositStep1DTO>
{
    public IBSavingDepositStep1DTOValidator()
    {
        RuleFor(x => x.BrId)
            .GreaterThan(0).WithMessage("Source branch ID is required.");

        RuleFor(x => x.DestBrId)
            .GreaterThan(0).WithMessage("Destination branch ID is required.");

        RuleFor(x => x.DestBrId)
            .NotEqual(x => x.BrId).WithMessage("Source and destination branches must be different.");

        RuleFor(x => x.DestAccId)
            .GreaterThan(0).WithMessage("Destination account is required.");

        RuleFor(x => x.DrAccId)
            .GreaterThan(0).WithMessage("Debit account is required.");

        RuleFor(x => x.CrAccId)
            .GreaterThan(0).WithMessage("Credit account is required.");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Amount must be greater than zero.")
            .LessThanOrEqualTo(99_999_999m).WithMessage("Amount exceeds maximum allowed value.");

        RuleFor(x => x.VoucherDate)
            .Must(d => d.Year >= 2000 && d.Year <= 2100)
            .WithMessage("Voucher date is out of valid range.");

        RuleFor(x => x.FlowType)
            .NotEmpty().WithMessage("Flow type is required.")
            .Must(f => f == "HOToBranch" || f == "BranchToBranch")
            .WithMessage("Flow type must be 'HOToBranch' or 'BranchToBranch'.");

        RuleFor(x => x.Narration)
            .MaximumLength(500).When(x => x.Narration != null)
            .WithMessage("Narration cannot exceed 500 characters.");
    }
}
