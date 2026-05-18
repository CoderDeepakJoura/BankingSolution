using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Miscalleneous;
using BankingPlatform.Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BankingPlatform.API.Controllers.Miscallenous
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly BankingDbContext _appContext;
        private readonly ILogger<UserController> _logger;
        private readonly CommonFunctions _commonFunctions;

        public UserController(BankingDbContext appContext, ILogger<UserController> logger, CommonFunctions commonFunctions)
        {
            _appContext = appContext;
            _logger = logger;
            _commonFunctions = commonFunctions;
        }

        [Authorize]
        [HttpPost("create_user")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> CreateUser([FromBody] UserDTO dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    return BadRequest(new ResponseDto { Success = false, Message = string.Join(", ", errors) });
                }

                if (string.IsNullOrWhiteSpace(dto.Username))
                    return BadRequest(new ResponseDto { Success = false, Message = "Username is required." });

                if (string.IsNullOrWhiteSpace(dto.Password))
                    return BadRequest(new ResponseDto { Success = false, Message = "Password is required." });

                var duplicate = await _appContext.user
                    .AnyAsync(u => u.branchid == dto.BranchId &&
                                   u.username.ToLower() == dto.Username.Trim().ToLower());

                if (duplicate)
                    return BadRequest(new ResponseDto { Success = false, Message = "Username already exists for this branch." });

                var newUser = new User
                {
                    branchid = dto.BranchId,
                    username = dto.Username.Trim(),
                    password = PasswordHasher.HashPassword(dto.Password),
                    isauthorized = dto.IsAuthorized,
                    issu = dto.IsSu,
                    isbranchsu = dto.IsBranchSu,
                    usertype = dto.UserType,
                };

                await _appContext.user.AddAsync(newUser);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto { Success = true, Message = "User created successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user: {Username}", dto?.Username);
                await _commonFunctions.LogErrors(ex, nameof(CreateUser), nameof(UserController));
                return StatusCode(500, new ResponseDto { Success = false, Message = "An unexpected error occurred." });
            }
        }

        [Authorize]
        [HttpPost("get_all_users")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> GetAllUsers([FromBody] UserFilterDTO filter)
        {
            try
            {
                var query = _appContext.user.AsNoTracking()
                    .Where(u => u.branchid == filter.BranchId);

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var term = filter.SearchTerm.ToLower();
                    query = query.Where(u => u.username.ToLower().Contains(term));
                }

                var totalCount = await query.CountAsync();

                var items = await query
                    .OrderBy(u => u.username)
                    .Skip((filter.PageNumber - 1) * filter.PageSize)
                    .Take(filter.PageSize)
                    .Select(u => new UserListDTO
                    {
                        Id = u.id,
                        BranchId = u.branchid,
                        Username = u.username,
                        IsAuthorized = u.isauthorized,
                        IsSu = u.issu,
                        IsBranchSu = u.isbranchsu,
                        UserType = u.usertype,
                    })
                    .ToListAsync();

                return Ok(new { Success = true, Users = items, TotalCount = totalCount });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching users.");
                await _commonFunctions.LogErrors(ex, nameof(GetAllUsers), nameof(UserController));
                return StatusCode(500, new ResponseDto { Success = false, Message = "An unexpected error occurred." });
            }
        }

        [Authorize]
        [HttpPost("modify_user")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> ModifyUser([FromBody] UserDTO dto)
        {
            try
            {
                if (dto.Id == null)
                    return BadRequest(new ResponseDto { Success = false, Message = "User ID is required." });

                if (string.IsNullOrWhiteSpace(dto.Username))
                    return BadRequest(new ResponseDto { Success = false, Message = "Username is required." });

                var existing = await _appContext.user
                    .FirstOrDefaultAsync(u => u.id == dto.Id && u.branchid == dto.BranchId);

                if (existing == null)
                    return NotFound(new ResponseDto { Success = false, Message = "User not found." });

                var duplicate = await _appContext.user
                    .AnyAsync(u => u.id != dto.Id && u.branchid == dto.BranchId &&
                                   u.username.ToLower() == dto.Username.Trim().ToLower());

                if (duplicate)
                    return BadRequest(new ResponseDto { Success = false, Message = "Username already exists for this branch." });

                existing.username = dto.Username.Trim();
                existing.isauthorized = dto.IsAuthorized;
                existing.issu = dto.IsSu;
                existing.isbranchsu = dto.IsBranchSu;
                existing.usertype = dto.UserType;

                if (!string.IsNullOrWhiteSpace(dto.Password))
                    existing.password = PasswordHasher.HashPassword(dto.Password);

                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto { Success = true, Message = "User updated successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error modifying user: {Id}", dto?.Id);
                await _commonFunctions.LogErrors(ex, nameof(ModifyUser), nameof(UserController));
                return StatusCode(500, new ResponseDto { Success = false, Message = "An unexpected error occurred." });
            }
        }

        [Authorize]
        [HttpPost("delete_user")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> DeleteUser([FromBody] UserDTO dto)
        {
            try
            {
                if (dto.Id == null)
                    return BadRequest(new ResponseDto { Success = false, Message = "User ID is required." });

                var existing = await _appContext.user
                    .FirstOrDefaultAsync(u => u.id == dto.Id && u.branchid == dto.BranchId);

                if (existing == null)
                    return NotFound(new ResponseDto { Success = false, Message = "User not found." });

                _appContext.user.Remove(existing);
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto { Success = true, Message = "User deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user: {Id}", dto?.Id);
                await _commonFunctions.LogErrors(ex, nameof(DeleteUser), nameof(UserController));
                return StatusCode(500, new ResponseDto { Success = false, Message = "An unexpected error occurred." });
            }
        }

        [Authorize]
        [HttpPost("unauthorize_user")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> UnauthorizeUser([FromBody] UserDTO dto)
        {
            try
            {
                if (dto.Id == null)
                    return BadRequest(new ResponseDto { Success = false, Message = "User ID is required." });

                var existing = await _appContext.user
                    .FirstOrDefaultAsync(u => u.id == dto.Id && u.branchid == dto.BranchId);

                if (existing == null)
                    return NotFound(new ResponseDto { Success = false, Message = "User not found." });

                existing.isauthorized = 0;
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto { Success = true, Message = "User unauthorised successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unauthorizing user: {Id}", dto?.Id);
                await _commonFunctions.LogErrors(ex, nameof(UnauthorizeUser), nameof(UserController));
                return StatusCode(500, new ResponseDto { Success = false, Message = "An unexpected error occurred." });
            }
        }

        [Authorize]
        [HttpPost("authorize_user")]
        [EnableRateLimiting("Auth")]
        public async Task<IActionResult> AuthorizeUser([FromBody] UserDTO dto)
        {
            try
            {
                if (dto.Id == null)
                    return BadRequest(new ResponseDto { Success = false, Message = "User ID is required." });

                var existing = await _appContext.user
                    .FirstOrDefaultAsync(u => u.id == dto.Id && u.branchid == dto.BranchId);

                if (existing == null)
                    return NotFound(new ResponseDto { Success = false, Message = "User not found." });

                existing.isauthorized = 1;
                await _appContext.SaveChangesAsync();

                return Ok(new ResponseDto { Success = true, Message = "User authorised successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error authorizing user: {Id}", dto?.Id);
                await _commonFunctions.LogErrors(ex, nameof(AuthorizeUser), nameof(UserController));
                return StatusCode(500, new ResponseDto { Success = false, Message = "An unexpected error occurred." });
            }
        }
    }
}
