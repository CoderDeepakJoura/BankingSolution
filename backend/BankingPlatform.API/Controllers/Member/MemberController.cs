using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Member;
using BankingPlatform.API.Service;
using BankingPlatform.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace BankingPlatform.API.Controllers.Member
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class MemberController : ControllerBase
    {
        private readonly MemberService _service;
        private readonly CommonFunctions _commonfunctions;
        private readonly ImageService _imageService;
        public MemberController(MemberService service, CommonFunctions commonfunctions, ImageService imageService)
        {
            _service = service;
            _commonfunctions = commonfunctions;
            _imageService = imageService;
        }


        [HttpPost]
        public async Task<IActionResult> CreateMember([FromForm] CreateMemberRequest request)
        {
            try
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = true
                };
                var dto = JsonSerializer.Deserialize<CombinedMemberDTO>(request.MemberData, options);


                var result = await _service.CreateMemberAsync(
                    dto!,
                    request.MemberPhoto,
                    request.MemberSignature
                );
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Member saved successfully"
                });
            }
            catch(Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(CreateMember), nameof(MemberController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while saving member."
                });
            }
        }
        [HttpPost("get_all_members/{branchId}")]
        public async Task<IActionResult> GetAllMembers([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                var result = await _service.GetAllMembersAsync(branchId, filter);

                return Ok(new
                {
                    Success = true,
                    memberInfo = result.Items,
                    TotalCount = result.TotalCount
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(GetAllMembers), "GeneralAccMasterController");
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while fetching General Accounts. Please try again later."
                });
            }
        }

        [HttpGet("get-member-info/{id}/{branchId}")]
        public async Task<IActionResult> GetMemberById(int id, int branchId)
        {
            var result = await _service.GetMemberByIdAsync(id, branchId);
            if (result == null) return NotFound();
            return Ok(new
            {
                Success = true,
                data = result
            });
        }

        [HttpPut]
        public async Task<IActionResult> UpdateMember([FromForm] CreateMemberRequest request)
        {
            try
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = true
                };
                var dto = JsonSerializer.Deserialize<CombinedMemberDTO>(request.MemberData, options);


                var result = await _service.UpdateMemberAsync(
                    dto!,
                    request.MemberPhoto,
                    request.MemberSignature
                );
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Member updated successfully."
                });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(CreateMember), nameof(MemberController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while saving member."
                });
            }
        }

        [HttpDelete("{id}/{branchId}/{voucherId}")]
        public async Task<IActionResult> DeleteMember(int id, int branchId, int voucherId)
        {
            try
            {
                var success = await _service.DeleteMemberAsync(id, branchId, voucherId);
                if (!success) return NotFound();
                return Ok(new { message = "Member deleted successfully" });
            }
            catch (Exception ex)
            {
                await _commonfunctions.LogErrors(ex, nameof(DeleteMember), nameof(MemberController));
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while deleting member."
                });
            }
        }

        [AllowAnonymous]
        [HttpGet("member-images/{fileName}/{type}")]
        public IActionResult GetMemberImage(
            [FromRoute] string fileName,
            [FromRoute] string type)
        {
            var fileData = _imageService.GetImageFile(fileName, "Member_Images", type);
            if (fileData == null)
                return NotFound("Image not found");

            var (bytes, contentType) = fileData!.Value;
            return File(bytes, contentType);
        }
    }

    public class DocPaths
    {
        public string MemberImagesDrive { get; set; } = ""!;
        public string AccountImagesDrive { get; set; } = ""!;
    }
}
