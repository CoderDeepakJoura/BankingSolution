using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.AccountMasters.Loan;
using FluentValidation;

namespace BankingPlatform.API.Validators;

public class CombinedLoanAccountDTOValidator : AbstractValidator<CombinedLoanAccountDTO>
{
    public CombinedLoanAccountDTOValidator()
    {
        RuleFor(x => x.AccountMasterDTO)
            .NotNull().WithMessage("Account master details are required.")
            .SetValidator(new AccountMasterDTOValidator()!);
    }
}

public class AccountMasterDTOValidator : AbstractValidator<AccountMasterDTO>
{
    public AccountMasterDTOValidator()
    {
        RuleFor(x => x.BranchId)
            .GreaterThan(0).WithMessage("Branch ID is required.");

        RuleFor(x => x.HeadId)
            .GreaterThan(0).WithMessage("Account head is required.");

        RuleFor(x => x.AccTypeId)
            .GreaterThan(0).WithMessage("Account type is required.");

        RuleFor(x => x.AccountNumber)
            .NotEmpty().WithMessage("Account number is required.")
            .MaximumLength(20).WithMessage("Account number cannot exceed 20 characters.")
            .Matches(@"^\d+$").WithMessage("Account number must contain digits only.");

        RuleFor(x => x.AccountName)
            .NotEmpty().WithMessage("Account name is required.")
            .MaximumLength(100).WithMessage("Account name cannot exceed 100 characters.");

        RuleFor(x => x.AccOpeningDate)
            .Must(d => d.Year >= 2000 && d.Year <= 2100)
            .WithMessage("Account opening date is out of valid range.");
    }
}
