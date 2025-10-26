using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountHead;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.CommonDTO;
using BankingPlatform.API.DTO.Location.Patwar;
using BankingPlatform.API.DTO.Location.PostOffice;
using BankingPlatform.API.DTO.Location.Relation;
using BankingPlatform.API.DTO.Location.State;
using BankingPlatform.API.DTO.Location.Tehsil;
using BankingPlatform.API.DTO.Location.Village;
using BankingPlatform.API.DTO.Miscalleneous;
using BankingPlatform.API.DTO.ProductMasters.Saving;
using BankingPlatform.API.DTO.Settings;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.member;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BankingPlatform.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FetchDataController : ControllerBase
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonFunctions;
        public FetchDataController(BankingDbContext context, CommonFunctions commonFunctions ) 
        {
            _context = context;
            _commonFunctions = commonFunctions;
        }

        [HttpPost("get_all_accountheadtypes")]
        public async Task<IActionResult> GetHeadType([FromBody] CommonDTO commonDTO)
        {
            var headTypes = await _context.accountheadtype
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new AccountHeadTypeDTO
            {
                AccountHeadTypeId = x.id,
                AccountHeadTypeName = x.description
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = headTypes
            }
            );
        }

        [HttpPost("get_all_accountheads")]
        public async Task<IActionResult> GetAllHeads([FromBody] CommonDTO commonDTO)
        {
            var heads = await _context.accounthead
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new AccountHeadDTO
            {
                AccountHeadId = x.id,
                AccountHeadName = x.headcode + "-" + x.name            
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = heads
            }
            );
        }

        [HttpPost("get_all_postoffices")]
        public async Task<IActionResult> GetAllPostOffices([FromBody] CommonDTO commonDTO)
        {
            var POs = await _context.postoffice
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new PostOfficeMasterDTO
            {
                PostOfficeId = x.id,
                PostOfficeName = x.postofficename
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = POs
            }
            );
        }
        [HttpPost("get_all_zones")]
        public async Task<IActionResult> GetAllZones([FromBody] CommonDTO commonDTO)
        {
            var zones = await _context.zone
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new ZoneMasterDto
            {
                ZoneId = x.id,
                ZoneName = x.zonename
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = zones
            }
            );
        }
        
        [HttpPost("get_all_thanas")]
        public async Task<IActionResult> GetAllThanas([FromBody] CommonDTO commonDTO)
        {
            var thanas = await _context.thana
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new ThanaMasterDto
            {
                ThanaId = x.id,
                ThanaName = x.thananame
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = thanas
            }
            );
        }
        
        [HttpPost("get_all_tehsils")]
        public async Task<IActionResult> GetAllTehsils([FromBody] CommonDTO commonDTO)
        {
            if (commonDTO.BranchId == null || commonDTO.BranchId == 0)
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Some error occured while fetching Tehsils."
                });
            var tehsils = await _context.tehsil
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new TehsilMasterDTO
            {
                TehsilId = x.id,
                TehsilName = x.tehsilname
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = tehsils
            });
        }

        [HttpGet("states")]
        public async Task<IActionResult> GetAllStates()
        {
            var states = await _context.state
            .Select(x => new StateDTO
            {
                StateId = x.id,
                StateName = x.statecode + "-" + x.statename
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = states
            });
        }

        [HttpGet("relations")]
        public async Task<IActionResult> GetRelations()
        {
            var relations = await _context.relation
            .Select(x => new RelationDTO
            {
                RelationId = x.id,
                Description = x.description
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = relations
            });
        }
        [HttpGet("village-info/{branchId}")]
        public async Task<IActionResult> VillageInfo([FromRoute] int branchId)
        {
            var villages = await _context.village
                .Where(x=> x.branchid == branchId)
            .Select(x => new VillageDTO
            {
                VillageId = x.id,
                VillageName = x.villagename
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = villages
            });
        }

        [HttpGet("caste-info/{branchId}")]
        public async Task<IActionResult> GetCastes([FromRoute] int branchId)
        {
            var casteInfo = await _context.caste.Where(x => x.branchid == branchId)
            .Select(x => new CasteMasterDTO
            {
                CasteId = x.id,
                CasteDescription = x.description
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = casteInfo
            });
        }

        [HttpGet("category-info/{branchid}")]
        public async Task<IActionResult> GetAllCategorys([FromRoute] int branchid)
        {
            var states = await _context.category.Where(x=> x.branchid == branchid)
            .Select(x => new CategoryMasterDTO
            {
                CategoryId = x.id,
                CategoryName = x.categoryname
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = states
            });
        }

        [HttpGet("location-data/{villageId}/{branchid}")]
        public async Task<IActionResult> GetLocationData([FromRoute] int villageId, [FromRoute] int branchid)
        {

            var locationInfo = await (from village in _context.village.AsNoTracking()
                                      join zone in _context.zone.AsNoTracking() on new { zoneId = village.zoneid, branchId = village.branchid }
                                      equals new { zoneId = zone.id, branchId = zone.branchid }
                                      join thana in _context.thana.AsNoTracking()
                                      on new { thanaId = village.thanaid, branchId = village.branchid }
                                      equals new { thanaId = thana.id, branchId = thana.branchid }
                                      join postOffice in _context.postoffice.AsNoTracking()
                                      on new { postOfficeId = village.postofficeid, branchId = village.branchid }
                                      equals new { postOfficeId = postOffice.id, branchId = postOffice.branchid }
                                      join tehsil in _context.tehsil.AsNoTracking()
                                      on new { tehsilId = village.tehsilid, branchId = village.branchid }
                                      equals new { tehsilId = tehsil.id, branchId = tehsil.branchid }
                                      join patwar in _context.patwar.AsNoTracking()
                                      on new { patwarId = village.patwarId, branchId = village.branchid }
                                      equals new { patwarId = patwar.id, branchId = patwar.branchid }
                                      where village.branchid == branchid && village.id == villageId
                                      select new { zoneName = zone.zonename, thanaName = thana.thananame, postOfficeName = postOffice.postofficename, tehsilName = tehsil.tehsilname, zoneId = zone.id, thanaId = thana.id, postofficeId = postOffice.id, tehsilId = tehsil.id, pinCode = village.pincode, patwar = patwar.description ?? "", patwarId = patwar.id }
                               ).FirstOrDefaultAsync();
            if (locationInfo == null)
                return NotFound(new ResponseDto
                {
                    Success = false,
                    Message = "Village Info not found."
                });
            var locationData = new Dictionary<string, string?>
                                {
                                    { "ZoneName", locationInfo.zoneName + "-" + locationInfo.zoneId },
                                    { "ThanaName", locationInfo.thanaName + "-" + locationInfo.thanaId },
                                    { "TehsilName", locationInfo.tehsilName + "-" + locationInfo.tehsilId },
                                    { "PostOfficeName", locationInfo.postOfficeName + "-" + locationInfo.postofficeId },
                                    { "PinCode" , locationInfo.pinCode.ToString() },
                                    { "Patwar", locationInfo.patwar + "-" + locationInfo.patwarId}
                                };

            return Ok(new
            {
                Success = true,
                data = locationData
            });
        }

        [HttpGet("category-info-from-caste/{casteId}/{branchId}")]
        public async Task<IActionResult> GetCategory([FromRoute] int casteId, [FromRoute] int branchId)
        {
            var categoryInfo = await (from caste in _context.caste.AsNoTracking()
                              join category in _context.category.AsNoTracking()
                              on new { categoryId = caste.categoryid, branchId = caste.branchid }
                              equals new { categoryId = category.id, branchId = category.branchid }
                              where caste.id == casteId && caste.branchid == branchId
                              select new CategoryMasterDTO { CategoryName = category.categoryname + "-" + category.id }
                              ).FirstOrDefaultAsync();
            return Ok(new
            {
                Success = true,
                data = categoryInfo
            });
        }
        [HttpGet("occupations/{branchId}")]
        public async Task<IActionResult> OccupationInfo([FromRoute] int branchId)
        {
            var occupationInfo = await _context.occupation.Where(x => x.branchid == branchId).Select(x => new OccupationDTO
            {
                Description = x.description,
                OccupationId = x.id
            }).ToListAsync();

            return Ok(new
            {
                Success = true,
                data = occupationInfo
            });
        }

        [HttpGet("general-accounts/{branchId}")]
        public async Task<IActionResult> GetAllGeneralAccounts([FromRoute] int branchid)
        {
            var accounts = await _context.accountmaster.Where(x => x.BranchId == branchid)
            .Select(x => new AccountMasterDTO
            {
                AccId = x.ID,
                AccountName = x.AccountName!
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = accounts
            });
        }

        [HttpGet("settings/{branchId}")]
        public async Task<IActionResult> AllSettings([FromRoute] int branchId)
        {
            var settingsInfo = await _commonFunctions.GetAllSettings(branchId);
            int admissionAccId = settingsInfo.GeneralSettings.AdmissionFeeAccountId > 0 ? settingsInfo.GeneralSettings.AdmissionFeeAccountId : 0;
            string accName = await _commonFunctions.GetAccountNameFromAccId(admissionAccId, branchId, true);
            settingsInfo.GeneralSettings.AdmissionFeeAccName = accName;
            return Ok(new
            {
                Success = true,
                data = settingsInfo
            });
        }

        [HttpGet("account-number-exists/{account_number}/{branchId}/{accId}/{accTypeId}")]
        public async Task<IActionResult> CheckIfAccNoExists([FromRoute] int branchId, [FromRoute] string account_number, [FromRoute] int accId = 0, int accTypeId = 0)
        {
            var accNumberExists = await _context.accountmaster.Where(x => x.BranchId == branchId && x.AccountNumber.ToLower() == account_number.ToLower() && x.AccTypeId == accTypeId && x.ID != accId).AnyAsync();
            return Ok(new ResponseDto
            {
                Success = accNumberExists,
                Message = accNumberExists ? "Account Number already exists" : ""
            });
        }
        [HttpGet("nominal-membershipno-exists/{nominal_membershipno}/{branchId}/{memberId}")]
        public async Task<IActionResult> CheckIfNominalMemNoExists([FromRoute] int branchId, [FromRoute] string nominal_membershipno, [FromRoute] int memberId = 0)
        {
            var nomMemNoExists = await _context.member.Where(x => x.BranchId == branchId && x.NominalMembershipNo!.ToLower() == nominal_membershipno.ToLower() && x.Id != memberId).AnyAsync();
            return Ok(new ResponseDto
            {
                Success = nomMemNoExists,
                Message = nomMemNoExists ? "Nominal Membership already exists" : ""
            });
        }

        [HttpGet("permanent-membershipno-exists/{permanent_membershipno}/{branchId}/{memberId}")]
        public async Task<IActionResult> CheckIfPermanentMemNoExists([FromRoute] int branchId, [FromRoute] string permanent_membershipno, [FromRoute] int memberId = 0)
        {
            var permMemNoExists = await _context.member.Where(x => x.BranchId == branchId && x.PermanentMembershipNo!.ToLower() == permanent_membershipno.ToLower() && x.Id != memberId).AnyAsync();
            return Ok(new ResponseDto
            {
                Success = permMemNoExists,
                Message = permMemNoExists ? "Permanent Membership already exists" : ""
            });
        }

        [HttpGet("aadhaar-exists/{aadhaarNo}/{branchId}/{memberId}")]
        public async Task<IActionResult> ChkAadhaarExists([FromRoute] int branchId, [FromRoute] string aadhaarNo, [FromRoute] int memberId = 0)
        {
            var aadhaarExists = await _context.memberdocdetails.Where(x => x.BranchId == branchId && x.AadhaarCardNo == aadhaarNo && x.MemberId != memberId).AnyAsync();
            return Ok(new ResponseDto
            {
                Success = aadhaarExists,
                Message = aadhaarExists ? "Aadhaar Card No. already exists" : ""
            });
        }

        [HttpGet("PAN-exists/{PANNo}/{branchId}/{memberId}")]
        public async Task<IActionResult> ChkPANExists([FromRoute] int branchId, [FromRoute] string PANNo, [FromRoute] int memberId = 0)
        {
            var PANExists = await _context.memberdocdetails.Where(x => x.BranchId == branchId && x.PanCardNo.ToLower() == PANNo.ToLower() && x.MemberId != memberId).AnyAsync();
            return Ok(new ResponseDto
            {
                Success = PANExists,
                Message = PANExists ? "PAN already exists" : ""
            });
        }

        [HttpGet("patwars/{branchId}")]
        public async Task<IActionResult> PatwarInfo([FromRoute] int branchId)
        {
            var patwarInfo = await _context.patwar.Where(x => x.branchid == branchId).Select(x => new PatwarDTO
            {
                Description = x.description,
                PatwarId = x.id
            }).ToListAsync();

            return Ok(new
            {
                Success = true,
                data = patwarInfo
            });
        }
        [HttpGet("fd-productname-exists/{productName}/{branchId}/{productId}")]
        public async Task<IActionResult> IfProductNameExists([FromRoute] string productName, int branchId, int productId)
        {
            var productexists = await _context.fdproduct.Where(x => x.BranchId == branchId && x.ProductName.ToLower() == productName.ToLower() && x.Id != productId).AnyAsync();

            return Ok(new ResponseDto
            {
                Success = productexists,
                Message = productexists ? "FD Product Name already exists" : ""
            });
        }

        [HttpGet("fd-productcode-exists/{productCode}/{branchId}/{productId}")]
        public async Task<IActionResult> IfProductCodeExists([FromRoute] string productCode, int branchId, int productId)
        {
            var productcodeexists = await _context.fdproduct.Where(x => x.BranchId == branchId && x.ProductCode.ToLower() == productCode.ToLower() && x.Id != productId).AnyAsync();

            return Ok(new ResponseDto
            {
                Success = productcodeexists,
                Message = productcodeexists ? "FD Product Code already exists" : ""
            });
        }

        [HttpGet("saving-productname-exists/{productName}/{branchId}/{productId}")]
        public async Task<IActionResult> IfSavingProductNameExists([FromRoute] string productName, int branchId, int productId)
        {
            var productexists = await _context.savingproduct.Where(x => x.BranchId == branchId && x.ProductName.ToLower() == productName.ToLower() && x.Id != productId).AnyAsync();

            return Ok(new ResponseDto
            {
                Success = productexists,
                Message = productexists ? "Saving Name already exists" : ""
            });
        }

        [HttpGet("saving-productcode-exists/{productCode}/{branchId}/{productId}")]
        public async Task<IActionResult> IfSavingProductCodeExists([FromRoute] string productCode, int branchId, int productId)
        {
            var productcodeexists = await _context.savingproduct.Where(x => x.BranchId == branchId && x.ProductCode.ToLower() == productCode.ToLower() && x.Id != productId).AnyAsync();

            return Ok(new ResponseDto
            {
                Success = productcodeexists,
                Message = productcodeexists ? "Saving Product Code already exists" : ""
            });
        }

        [HttpGet("saving-products/{branchId}")]
        public async Task<IActionResult> SavingProducts([FromRoute] int branchId)
        {
            var productInfo = await _context.savingproduct.Where(x => x.BranchId == branchId).Select(x=> new SavingsProductDTO
            {
                ProductName = x.ProductCode + "-" + x.ProductName,
                Id = x.Id
            }).ToListAsync();

            return Ok(new
            {
                Success = true,
                data = productInfo

            });
        }

        [HttpGet("fd-products/{branchId}")]
        public async Task<IActionResult> FDProducts([FromRoute] int branchId)
        {
            var productInfo = await _context.fdproduct.Where(x => x.BranchId == branchId).Select(x => new SavingsProductDTO
            {
                ProductName = x.ProductCode + "-" + x.ProductName,
                Id = x.Id
            }).ToListAsync();

            return Ok(new
            {
                Success = true,
                data = productInfo
            });
        }

    }
}
