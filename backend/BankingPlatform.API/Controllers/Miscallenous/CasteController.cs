using BankingPlatform.API.Controllers.AccountMasters;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.Miscalleneous;
using BankingPlatform.API.Service.AccountMasters;
using BankingPlatform.API.Service.Caste;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers.Miscallenous
{
    [Route("api/[controller]")]
    [ApiController]
    public class CasteController : ControllerBase
    {
        private readonly CasteService _service;
        public ILogger<CasteController> _logger;
        private readonly CommonFunctions _commonFns;
        public CasteController(CasteService service, ILogger<CasteController> logger, CommonFunctions commonFns)
        {
            _service = service;
            _logger = logger;
            _commonFns = commonFns;
        }

        [HttpPost]
        public async Task<IActionResult> AddCaste([FromBody] CasteMasterDTO dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Create new Caste attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }
                var result = await _service.CreateNewCasteAsync(dto);
                if (result != "Success")
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = result
                    });
                return Ok(new ResponseDto
                {
                    Success = true,
                    Message = "Caste added successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while adding Caste.");
                await _commonFns.LogErrors(ex, nameof(AddCaste), "CasteController");
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while adding Caste. Please try again later."
                });
            }
        }
        [HttpPost("get_all_caste/{branchId}")]
        public async Task<IActionResult> GetAllCaste([FromRoute] int branchId, [FromBody] LocationFilterDTO filter)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Get All Caste attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }

                var result = await _service.GetAllCasteAsync(branchId, filter);

                return Ok(new
                {
                    Success = true,
                    Castes = result.Items,
                    result.TotalCount
                });
            }
            catch(Exception ex)
            {
                await _commonFns.LogErrors(ex, nameof(GetAllCaste), "CasteController");
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message  = "An error occurred while retrieving Castes. Please try again later."
                });
            }
        }


        [HttpPut]
        [Route("")]
        public async Task<IActionResult> UpdateCaste([FromBody] CasteMasterDTO dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Update Caste attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }
                var result = await _service.UpdateCasteAsync(dto);
                if (result != "Success") return NotFound(new { Success = false, Message = result });
                return Ok(new { Success = true, message = "Caste updated successfully" });
            }
            catch (Exception ex)
            {
                await _commonFns.LogErrors(ex, nameof(UpdateCaste), "CasteController");
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpDelete("{id}/{branchId}")]
        public async Task<IActionResult> DeleteCaste(int id, int branchId)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var Modelerrors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    _logger.LogWarning("Delete Caste attempt with invalid data: {Errors}", string.Join(", ", Modelerrors));
                    return BadRequest(new ResponseDto
                    {
                        Success = false,
                        Message = "Invalid request data: " + string.Join(", ", Modelerrors)
                    });
                }
                var result = await _service.DeleteCasteAsync(id, branchId);
                if (result is not "Success") return NotFound(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while deleting Caste."
                });
                return Ok(new ResponseDto { Success = true, Message = "Caste deleted successfully." });
            }
            catch (Exception ex)
            {
                // Log exception for debugging (e.g., Serilog, NLog, built-in ILogger)
                _logger.LogError(ex, "Error occurred while deleting Caste.");
                await _commonFns.LogErrors(ex, nameof(DeleteCaste), "CasteController");
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "An error occurred while deleting the Caste."
                });
            }
        }
    }
}
