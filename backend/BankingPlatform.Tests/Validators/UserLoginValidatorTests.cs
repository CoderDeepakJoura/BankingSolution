using BankingPlatform.API.DTO;
using BankingPlatform.API.Validators;
using FluentValidation.TestHelper;

namespace BankingPlatform.Tests.Validators;

public class UserLoginValidatorTests
{
    private readonly UserLoginDtoValidator _validator = new();

    [Fact]
    public void ValidLogin_PassesValidation()
    {
        var dto = new UserLoginDto { Username = "admin", Password = "secret123", BranchCode = "BR01" };
        var result = _validator.TestValidate(dto);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void EmptyUsername_FailsValidation()
    {
        var dto = new UserLoginDto { Username = "", Password = "secret123", BranchCode = "BR01" };
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.Username);
    }

    [Fact]
    public void EmptyPassword_FailsValidation()
    {
        var dto = new UserLoginDto { Username = "admin", Password = "", BranchCode = "BR01" };
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void EmptyBranchCode_FailsValidation()
    {
        var dto = new UserLoginDto { Username = "admin", Password = "secret123", BranchCode = "" };
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.BranchCode);
    }

    [Fact]
    public void UsernameTooLong_FailsValidation()
    {
        var dto = new UserLoginDto { Username = new string('a', 101), Password = "secret123", BranchCode = "BR01" };
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.Username);
    }
}
