using Azure;
using BankingPlatform.API.Common;
using BankingPlatform.API.Common.CommonFunctions;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.AccountHead;
using BankingPlatform.API.DTO.AccountMasters;
using BankingPlatform.API.DTO.BranchSession;
using BankingPlatform.API.DTO.CommonDTO;
using BankingPlatform.API.DTO.Location.Patwar;
using BankingPlatform.API.DTO.Location.PostOffice;
using BankingPlatform.API.DTO.Location.Relation;
using BankingPlatform.API.DTO.Location.State;
using BankingPlatform.API.DTO.Location.Tehsil;
using BankingPlatform.API.DTO.Location.Village;
using BankingPlatform.API.DTO.Miscalleneous;
using BankingPlatform.API.DTO.ProductMasters.RD;
using BankingPlatform.API.DTO.ProductMasters.Saving;
using BankingPlatform.API.DTO.Settings;
using BankingPlatform.API.Service.AccountMasters;
using BankingPlatform.Common.Common.CommonClasses;
using BankingPlatform.Infrastructure.Models;
using BankingPlatform.Infrastructure.Models.InterestSlabs.FD;
using BankingPlatform.Infrastructure.Models.member;
using BankingPlatform.Infrastructure.Models.ProductMasters.RD;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Identity.Client;
using System.Reflection;

namespace BankingPlatform.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FetchDataController : ControllerBase
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonFunctions;
        private readonly FDAccountService _fdAccountService;
        private readonly RDAccountService _rdAccountService;
        public FetchDataController(BankingDbContext context, CommonFunctions commonFunctions, FDAccountService fdAccountService, RDAccountService rdAccountService)
        {
            _context = context;
            _commonFunctions = commonFunctions;
            _fdAccountService = fdAccountService;
            _rdAccountService = rdAccountService;
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
            var categoryInfo = await _context.category.Where(x=> x.branchid == branchid)
            .Select(x => new CategoryMasterDTO
            {
                CategoryId = x.id,
                CategoryName = x.categoryname
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = categoryInfo
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
            int accType = (int)Enums.AccountTypes.General;
            var accounts = await _context.accountmaster.Where(x => x.BranchId == branchid && x.AccTypeId == accType)
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
                Message = accNumberExists ? "Account Number already exists." : ""
            });
        }
        [HttpGet("nominal-membershipno-exists/{nominal_membershipno}/{branchId}/{memberId}")]
        public async Task<IActionResult> CheckIfNominalMemNoExists([FromRoute] int branchId, [FromRoute] string nominal_membershipno, [FromRoute] int memberId = 0)
        {
            var nomMemNoExists = await _context.member.Where(x => x.BranchId == branchId && x.NominalMembershipNo!.ToLower() == nominal_membershipno.ToLower() && x.Id != memberId).AnyAsync();
            return Ok(new ResponseDto
            {
                Success = nomMemNoExists,
                Message = nomMemNoExists ? "Nominal Membership already exists." : ""
            });
        }

        [HttpGet("permanent-membershipno-exists/{permanent_membershipno}/{branchId}/{memberId}")]
        public async Task<IActionResult> CheckIfPermanentMemNoExists([FromRoute] int branchId, [FromRoute] string permanent_membershipno, [FromRoute] int memberId = 0)
        {
            var permMemNoExists = await _context.member.Where(x => x.BranchId == branchId && x.PermanentMembershipNo!.ToLower() == permanent_membershipno.ToLower() && x.Id != memberId).AnyAsync();
            return Ok(new ResponseDto
            {
                Success = permMemNoExists,
                Message = permMemNoExists ? "Permanent Membership already exists." : ""
            });
        }

        [HttpGet("aadhaar-exists/{aadhaarNo}/{branchId}/{memberId}")]
        public async Task<IActionResult> ChkAadhaarExists([FromRoute] int branchId, [FromRoute] string aadhaarNo, [FromRoute] int memberId = 0)
        {
            var aadhaarExists = await _context.memberdocdetails.Where(x => x.BranchId == branchId && x.AadhaarCardNo == aadhaarNo && x.MemberId != memberId).AnyAsync();
            return Ok(new ResponseDto
            {
                Success = aadhaarExists,
                Message = aadhaarExists ? "Aadhaar Card No. already exists." : ""
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
                Message = productexists ? "FD Product Name already exists." : ""
            });
        }

        [HttpGet("fd-productcode-exists/{productCode}/{branchId}/{productId}")]
        public async Task<IActionResult> IfProductCodeExists([FromRoute] string productCode, int branchId, int productId)
        {
            var productcodeexists = await _context.fdproduct.Where(x => x.BranchId == branchId && x.ProductCode.ToLower() == productCode.ToLower() && x.Id != productId).AnyAsync();

            return Ok(new ResponseDto
            {
                Success = productcodeexists,
                Message = productcodeexists ? "FD Product Code already exists." : ""
            });
        }

        [HttpGet("saving-productname-exists/{productName}/{branchId}/{productId}")]
        public async Task<IActionResult> IfSavingProductNameExists([FromRoute] string productName, int branchId, int productId)
        {
            var productexists = await _context.savingproduct.Where(x => x.BranchId == branchId && x.ProductName.ToLower() == productName.ToLower() && x.Id != productId).AnyAsync();

            return Ok(new ResponseDto
            {
                Success = productexists,
                Message = productexists ? "Saving Name already exists." : ""
            });
        }

        [HttpGet("saving-productcode-exists/{productCode}/{branchId}/{productId}")]
        public async Task<IActionResult> IfSavingProductCodeExists([FromRoute] string productCode, int branchId, int productId)
        {
            var productcodeexists = await _context.savingproduct.Where(x => x.BranchId == branchId && x.ProductCode.ToLower() == productCode.ToLower() && x.Id != productId).AnyAsync();

            return Ok(new ResponseDto
            {
                Success = productcodeexists,
                Message = productcodeexists ? "Saving Product Code already exists." : ""
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

        [HttpGet("slabname-exists/{slabName}/{branchId}/{slabId}")]
        public async Task<IActionResult> IfSlabNameExists([FromRoute] string slabName, int branchId, int slabId)
        {
            var productexists = await _context.savinginterestslab.Where(x => x.BranchId == branchId && x.SlabName.ToLower() == slabName.ToLower() && x.Id != slabId).AnyAsync();

            return Ok(new ResponseDto
            {
                Success = productexists,
                Message = productexists ? "Slab Name already exists." : ""
            });
        }

        [HttpGet("member-info-with-accno/{branchId}/{accountNo}")]
        public async Task<IActionResult> getMemberInfoFromAccNo([FromRoute] string accountNo, int branchId)
        {
            var memberInfo = await (from p in _context.accountmaster.AsNoTracking()
                              join q in _context.member.AsNoTracking() on new { memberId = (int)p.MemberId!, memberBranchId = (int)p.MemberBranchID! }
                              equals new { memberId = q.Id, memberBranchId = q.BranchId }
                              join k in _context.memberlocationdetails on new { memberId = q.Id , memberBranchId = q.BranchId }
                              equals new { memberId = k.MemberId, memberBranchId = k.BranchId }
                              where p.BranchId == branchId && p.AccountNumber == accountNo
                              select new { memberName = q.MemberName, relativeName = q.RelativeName, gender = q.Gender, addressLine1 =  k.AddressLine1, dateOfBirth = q.DOB, phoneNo = q.PhoneNo1, emailId = q.Email1, memberId = q.Id, memberBranchId = q.BranchId }).FirstOrDefaultAsync();
            return Ok(new
            {
                Success = true,
                data = memberInfo
            });

        }

        [HttpGet("member-info-with-membershipno/{branchId}/{memberShipNo}/{memberType}")]
        public async Task<IActionResult> getMemberInfoFromMembershipNo([FromRoute] string memberShipNo, int branchId, int memberType)
        {
            var memberInfo = await (from q in _context.member.AsNoTracking()
                              join k in _context.memberlocationdetails on new { memberId = q.Id, memberBranchId = q.BranchId }
                              equals new { memberId = k.MemberId, memberBranchId = k.BranchId }
                              where q.BranchId == branchId && q.MemberType == memberType
                              && (q.NominalMembershipNo == memberShipNo || q.PermanentMembershipNo == memberShipNo)
                              select new { memberName = q.MemberName, relativeName = q.RelativeName, gender = q.Gender, addressLine1 = k.AddressLine1, dateOfBirth = q.DOB, phoneNo = q.PhoneNo1, emailId = q.Email1, memberId = q.Id, memberBranchId = q.BranchId }).FirstOrDefaultAsync();
            
            return Ok(new
            {
                Success = true,
                data = memberInfo
            });

        }

        [HttpGet("savingproduct-prefix-and-suffix/{productId}/{branchId}")]
        public async Task<IActionResult> SavingProductPrefix([FromRoute]int productId, int branchId)
        {
            int productsuffix = 0;
            string productPrefix = await _context.savingproduct.Where(x => x.Id == productId && x.BranchId == branchId)
                .Select(x=> x.ProductCode).FirstOrDefaultAsync() ?? "";
            if(productPrefix != null)
            {
                int accountType = (int)Enums.AccountTypes.Saving;
                productsuffix = _context.accountmaster.Where(x => x.BranchId == branchId && x.AccTypeId == accountType && x.AccPrefix == productPrefix).Select(x => x.AccSuffix).Max() ?? productsuffix;
                productsuffix++;
            }
            return Ok(new
            {
                Success = true,
                data = productPrefix + "-" + productsuffix
            });
        }

        [HttpGet("saving-suffix-exists/{productId}/{branchId}/{accountId}/{suffix}")]
        public async Task<IActionResult> SuffixExists([FromRoute] int productId, int branchId, int accountId, int suffix)
        {
            bool suffixExists = await _context.accountmaster.Where(x => x.GeneralProductId == productId && x.BranchId == branchId && x.ID != accountId && x.AccSuffix == suffix)
                .Select(x => x.AccSuffix).AnyAsync() ;
            return Ok(new ResponseDto
            {
                Success = suffixExists,
                Message = suffixExists ? "Account Suffix already exists." : ""
            });
        }

        [HttpGet("memberpic-and-sign-ext/{branchId}/{memberId}")]
        public async Task<IActionResult> getMemberInfoFromAccNo([FromRoute] int branchId, int memberId)
        {
            var memberInfo = await _context.memberdocdetails.AsNoTracking().Where(x => x.MemberId == memberId && x.BranchId == branchId).FirstOrDefaultAsync();
            return Ok(new
            {
                Success = true,
                data = new
                {
                    memberPicExt = memberInfo!.MemberPicExt ?? "",
                    memberSignExt = memberInfo!.MemberSignExt ?? "",
                }
              
            });

        }

        [HttpGet("branch-session-info/{branchId}")]
        public async Task<IActionResult> BranchSessions([FromRoute] int branchId)
        {
            var branchSessionInfo = await _context.branchsession.Where(x => x.branchid == branchId)
            .Select(x => new BranchSessionDTO
            {
                Id = x.id,
                BranchSessionInfo = x.sessionfrom + "-" + x.sessionto
            })
            .ToListAsync();
            return Ok(new
            {
                Success = true,
                data = branchSessionInfo
            });
        }

        [HttpGet("deposit-accounts-info/{branchId}/{productId}/{accountType}/{isClosed}")]
        public async Task<IActionResult> DepositAccountsInfo([FromRoute] int branchId, int productId, int accountType, bool isClosed = false)
        {
            if (branchId > 0 && productId > 0)
            {
                var depositAccountInfo = await _context.accountmaster.AsNoTracking()
                    .Where(x => x.BranchId == branchId && x.GeneralProductId == productId && x.AccTypeId == accountType && x.IsAccClosed == isClosed)
                    .Select(x => new
                    {
                        AccId = x.ID,
                        AccountName = x.AccPrefix + "-" + x.AccSuffix + "-" + x.AccountName + "-" + x.ID,
                    })
                    .ToListAsync();

                return Ok(new
                {
                    Success = true,
                    data = depositAccountInfo
                });
            }
            else
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Invalid parameters."
                });
        }

        // valid for fd, rd, saving accounts
        [HttpGet("account-info-for-deposit-accounts/{branchId}/{accountId}/{accountType}/{isClosed}")]
        public async Task<IActionResult> DepositAccountsInfoFromDepositAccount([FromRoute] int branchId, int accountId, int accountType, bool isClosed = false)
        {
            if(branchId > 0 && accountId > 0 && accountType > 0)
            {
                if (accountType == (int)Enums.AccountTypes.Saving)
                {
                    var memberInfo = await (from p in _context.accountmaster.AsNoTracking()
                                            join q in _context.savingproduct.AsNoTracking()
                                                on new { productId = (int)p.GeneralProductId!, branchId = p.BranchId }
                                                equals new { productId = q.Id, branchId = q.BranchId }
                                            join k in _context.member.AsNoTracking()
                                                on new { memberId = (int)p.MemberId!, memberBranchId = (int)p.MemberBranchID! }
                                                equals new { memberId = k.Id, memberBranchId = k.BranchId }
                                            join l in _context.savingproductrules.AsNoTracking()
                                                on new { productId = q.Id, branchId = q.BranchId }
                                                equals new { productId = l.SavingsProductId, branchId = l.BranchId }
                                            join h in _context.memberdocdetails.AsNoTracking()
                                                on new { memberId = k.Id, memberBranchId = k.BranchId }
                                                equals new { memberId = h.MemberId, memberBranchId = h.BranchId }
                                            join m in _context.memberlocationdetails.AsNoTracking()
                                                on new { memberId = k.Id, memberBranchId = k.BranchId }
                                                equals new { memberId = m.MemberId, memberBranchId = m.BranchId }
                                            join accdocdet in _context.accountdocdetails on new { accountId = p.ID, accountBranchId = p.BranchId }
                                            equals new { accountId = accdocdet.AccountId, accountBranchId = accdocdet.BranchId }
                                            // LEFT JOIN for nominee details
                                            join f in _context.membernomineedetails.AsNoTracking()
                                                on new { memberId = k.Id, memberBranchId = k.BranchId }
                                                equals new { memberId = f.MemberId, memberBranchId = f.BranchId }
                                                into nomineeDetailsGroup
                                            from nominee in nomineeDetailsGroup.DefaultIfEmpty()
                                            where p.BranchId == branchId
                                                && p.ID == accountId
                                                && p.AccTypeId == accountType
                                                && p.IsAccClosed == isClosed
                                            select new
                                            {
                                                MemberName = k.MemberName,
                                                RelativeName = k.RelativeName,
                                                MemberShipNo = k.MemberType == (int)Enums.MemberType.Permanent
                                                    ? k.PermanentMembershipNo
                                                    : k.NominalMembershipNo,
                                                AccountOpeningDate = p.AccOpeningDate.ToString("dd-MMM-yyyy"),
                                                MinimumBalanceRequired = l.MinBalanceAmt,
                                                Address = m.AddressLine1 ?? "",
                                                ContactNo = k.PhoneNo1,
                                                EmailId = k.Email1,
                                                AadhaarNo = h.AadhaarCardNo,
                                                PANCardNo = h.PanCardNo,
                                                nomineeDetails = nominee != null ? new
                                                {
                                                    NomineeName = nominee.NomineeName,
                                                } : null,
                                                MemberId = k.Id,
                                                MemberBrId = k.BranchId,
                                                AccountPicExt = accdocdet.PicExt,
                                                AccountSignExt = accdocdet.SignExt
                                            }).FirstOrDefaultAsync();

                    return Ok(new
                    {
                        Success = true,
                        data = memberInfo
                    });
                }
                else if(accountType == (int)Enums.AccountTypes.RD)
                {
                    var memberInfo = await (from p in _context.accountmaster.AsNoTracking()
                                            join q in _context.rdproduct.AsNoTracking()
                                                on new { productId = (int)p.GeneralProductId!, branchId = p.BranchId }
                                                equals new { productId = q.Id, branchId = q.BrId }
                                            join k in _context.member.AsNoTracking()
                                                on new { memberId = (int)p.MemberId!, memberBranchId = (int)p.MemberBranchID! }
                                                equals new { memberId = k.Id, memberBranchId = k.BranchId }
                                            join h in _context.memberdocdetails.AsNoTracking()
                                                on new { memberId = k.Id, memberBranchId = k.BranchId }
                                                equals new { memberId = h.MemberId, memberBranchId = h.BranchId }
                                            join m in _context.memberlocationdetails.AsNoTracking()
                                                on new { memberId = k.Id, memberBranchId = k.BranchId }
                                                equals new { memberId = m.MemberId, memberBranchId = m.BranchId }
                                            join n in _context.rdaccountdetail.AsNoTracking()
                                                on new { accountId = p.ID, branchId = p.BranchId }
                                                equals new { accountId = (int)n.AccId, branchId = n.BrId }
                                                // LEFT JOIN for nominee details
                                            join f in _context.membernomineedetails.AsNoTracking()
                                                on new { memberId = k.Id, memberBranchId = k.BranchId }
                                                equals new { memberId = f.MemberId, memberBranchId = f.BranchId }
                                                into nomineeDetailsGroup
                                            from nominee in nomineeDetailsGroup.DefaultIfEmpty()
                                            where p.BranchId == branchId
                                                && p.ID == accountId
                                                && p.AccTypeId == accountType
                                                && p.IsAccClosed == isClosed
                                            select new
                                            {
                                                MemberName = k.MemberName,
                                                RelativeName = k.RelativeName,
                                                MemberShipNo = k.MemberType == (int)Enums.MemberType.Permanent
                                                    ? k.PermanentMembershipNo
                                                    : k.NominalMembershipNo,
                                                AccountOpeningDate = p.AccOpeningDate.ToString("dd-MMM-yyyy"),
                                                Address = m.AddressLine1,
                                                ContactNo = k.PhoneNo1,
                                                EmailId = k.Email1,
                                                AadhaarNo = h.AadhaarCardNo,
                                                PANCardNo = h.PanCardNo,
                                                nomineeDetails = nominee != null ? new
                                                {
                                                    NomineeName = nominee.NomineeName,
                                                } : null,
                                                MemberId = k.Id,
                                                MemberBrId = k.BranchId,
                                                AccountPicExt = h.MemberPicExt,
                                                AccountSignExt = h.MemberSignExt,
                                                rdDetails = new RDAccountDetailDTO
                                                {
                                                    RdNumber = n.RdNumber,
                                                    InterestRate = n.InterestRate,
                                                    FirstKistDate = n.FirstKistDate,
                                                    MaturityDate = n.MaturityDate,
                                                    KistAmt = n.KistAmt,
                                                    RdAmount = n.RdAmount
                                                }
                                            }).FirstOrDefaultAsync();

                    return Ok(new
                    {
                        Success = true,
                        data = memberInfo
                    });
                }
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Invalid parameters."
                });
            }
            else
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Invalid parameters."
                });
        }

        [HttpGet("account-balance/{branchId}/{accountId}")]
        public async Task<IActionResult> GetAccountBalance([FromRoute] int branchId, int accountId)
        {
            if (branchId <= 0 || accountId <= 0)
                return BadRequest(new ResponseDto { Success = false, Message = "Invalid parameters." });

            decimal crTotal = await _context.vouchercreditdebitdetails
                .Where(x => x.BrId == branchId && x.AccountId == accountId
                         && (x.VoucherStatus == "V" || x.VoucherStatus == "A")
                         && x.VoucherEntryType == "Cr")
                .SumAsync(x => (decimal?)x.VoucherAmount) ?? 0;

            decimal drTotal = await _context.vouchercreditdebitdetails
                .Where(x => x.BrId == branchId && x.AccountId == accountId
                         && (x.VoucherStatus == "V" || x.VoucherStatus == "A")
                         && x.VoucherEntryType == "Dr")
                .SumAsync(x => (decimal?)x.VoucherAmount) ?? 0;

            return Ok(new { Success = true, data = crTotal - drTotal });
        }

        [HttpGet("joint-acc-info/{accountId}/{branchId}")]
        public async Task<IActionResult> GetJointAccountInfoFromAccountId([FromRoute]int accountId, int branchId)
        {
            if(accountId > 0 && branchId > 0)
            {
                var jointAccInfo = await  _context.jointaccountinfo.Where(x => x.JointWithAccountId == accountId && x.BranchId == branchId).Select(x=> new JointAccountInfoDTO
                {
                    AccountName = x.AccountName,
                    AddressLine = x.AddressLine,
                    JointAccHolderAccountNumber = x.jointaccholderaccountnumber
                }).ToListAsync() ?? new();

                return Ok(new
                {
                    Success = true,
                    data = jointAccInfo
                });
            }
            else
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Invalid parameters."
                });
        }

        [HttpGet("default-cash-in-hand-account/{branchId}")]
        public async Task<IActionResult> GetDefaultCashInHandAccount([FromRoute] int branchId)
        {
            if (branchId > 0)
            {
                var defCIHAccId = await _context.generalsettings.Where(x => x.branchid == branchId).Select(x => x.defaultCashAccountId).FirstOrDefaultAsync();

                return Ok(new
                {
                    Success = true,
                    data = defCIHAccId
                });
            }
            else
                return BadRequest(new ResponseDto
                {
                    Success = false,
                    Message = "Invalid parameters."
                });
        }
        [HttpGet("fd-slabs/{branchId}")]
        public async Task<IActionResult> GetFDSlabs([FromRoute] int branchId)
        {
            var slabInfo = await _context.fdinterestslab.Where(x => x.BranchId == branchId).Select(x => new 
            {
                SlabName = x.SlabName,
                Id = x.Id
            }).ToListAsync();

            return Ok(new
            {
                Success = true,
                data = slabInfo
            });
        }
        [HttpGet("fd-account-type-from-fdproduct/{productId}/{branchId}")]
        public async Task<IActionResult> GetFDAccountTypeFromFDProduct([FromRoute] int productId, int branchId)
        {
            string accountType = await _commonFunctions.GetAccountTypeFromProductIdAndBranchId(productId, branchId);

            return Ok(new
            {
                Success = true,
                data = accountType
            });
        }
        [HttpGet("fetch-fd-related-info/{fdDate}/{periodInMonths}/{periodInDays}/{dob}/{productId}/{amount}/{branchId}")]
        public async Task<IActionResult> CalculateFDRelatedInfo([FromRoute] DateTime fdDate, int periodInMonths, int periodInDays, DateTime dob, int productId, decimal amount, int branchId)
        {
            DateTime maturityDate = await _fdAccountService.CalculateMaturityDate(fdDate, periodInMonths, periodInDays);
            (decimal intRate, string slabName, string compoundingInterval, int intCompoundingInterval, int slabId) = await _fdAccountService.SlabInfo(dob, amount, periodInMonths, periodInDays, fdDate, productId);
            decimal maturityAmount = await _fdAccountService.CalculateMaturityAmount(amount, intRate, fdDate, maturityDate, productId, branchId, intCompoundingInterval);

            return Ok(new
            {
                Success = true,
                data = new
                {
                    maturityDate = maturityDate,
                    interestRate = intRate,
                    slabName = slabName,
                    compoundingInterval = compoundingInterval,
                    maturityAmount = maturityAmount,
                    slabId = slabId
                }
            });
        }

        [HttpGet("calculate-fd-maturity-amount/{fdDate}/{periodInMonths}/{periodInDays}/{interestRate}")]
        public async Task<IActionResult> CalculateMaturityAmount([FromRoute] DateTime fdDate, int periodInMonths, int periodInDays)
        {
            DateTime maturityDate = await _fdAccountService.CalculateMaturityDate(fdDate, periodInMonths, periodInDays);

            return Ok(new
            {
                Success = true,
                data = maturityDate
            });
        }

        [HttpGet("fetch-mis-accounts/{memberId}/{memberBranchId}")]
        public async Task<IActionResult> AccountsForMIS([FromRoute] int memberId, int memberBranchId)
        {
            int rdAccountType = (int)Enums.AccountTypes.RD;
            int savingAccountType = (int)Enums.AccountTypes.Saving;
            var accountsData = await _context.accountmaster
                .Where(x=> x.MemberBranchID == memberBranchId && x.MemberId == memberId
                && (x.AccTypeId == rdAccountType || x.AccTypeId == savingAccountType)
                && x.IsAccClosed == false)
                .Select(x => new
                {
                    AccId = x.ID,
                    AccountName = x.AccPrefix + "-" + x.AccSuffix + "-" + x.AccountName,
                })
                .ToListAsync();

            return Ok(new
            {
                Success = true,
                data = accountsData
            });

        }
        [HttpGet("fetch-fd-prefix-and-suffix/{branchId}/{productId}")]
        public async Task<IActionResult> FDPrefix([FromRoute] int branchId, int productId)
        {
            int accountType = (int)Enums.AccountTypes.FD;
            var prefix = await _context.fdproduct.Where(x => x.Id == productId && x.BranchId == branchId)
                .Select(x => x.ProductCode).FirstOrDefaultAsync() ?? "";
            var accountMasterInfo = await _context.accountmaster.Where(x => x.BranchId == branchId && x.GeneralProductId == productId && x.AccTypeId == accountType)
                .Select(x => new { x.AccPrefix, x.AccSuffix }).ToListAsync();
            var suffix = accountMasterInfo.Select(x => x.AccSuffix).Max() + 1 ?? 1;
            return Ok(new
            {
                Success = true,
                data = prefix + "-" + suffix
            });

        }

        [HttpPost("get_all_accountheads-with-headCode")]
        public async Task<IActionResult> GetAllHeadsWithHeadCode([FromBody] CommonDTO commonDTO)
        {
            var heads = await _context.accounthead
            .Where(x => x.branchid == commonDTO.BranchId)
            .Select(x => new AccountHeadDTO
            {
                AccountHeadId = x.id,
                HeadCode = x.headcode.ToString(),
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

        [HttpGet("open-fd-accounts/{branchId}/{fdProductId}/{currentDate}")]
        public async Task<IActionResult> OpenFDAccounts([FromRoute] int branchId, int fdProductId, DateTime currentDate)
        {
            int fdStatus = (int)Enums.FDStatus.Open;
            int accountType = (int)Enums.AccountTypes.FD;
            var fdAccounts = await (from p in _context.accountmaster
                                    join q in _context.fdaccountdetail
                                    on new { accId = p.ID, branchId = p.BranchId }
                                    equals new { accId = q.AccountId, branchId = q.BranchId }
                                    where p.BranchId == branchId && q.FDStatus == fdStatus
                                    && p.GeneralProductId == fdProductId && p.AccTypeId == accountType
                                    && q.FDMaturityDate <= currentDate
                                    select new
                                    {
                                        AccId = p.ID,
                                        AccountName = p.AccPrefix + "-" + p.AccSuffix + "-" + p.AccountName,
                                    }
                                    ).ToListAsync();
            return Ok(new
            {
                Success = true,
                data = fdAccounts
            }
            );
        }

        [HttpGet("saving-accounts/{branchId}/{currentDate}")]
        public async Task<IActionResult> SavingAccounts([FromRoute] int branchId, DateTime currentDate)
        {
            int accountType = (int)Enums.AccountTypes.Saving;
            var savingAccounts = await (from p in _context.accountmaster
                                    where p.AccTypeId == accountType
                                    && p.AccOpeningDate <= currentDate
                                    && p.IsAccClosed == false
                                    select new
                                    {
                                        AccId = p.ID,
                                        AccountName = p.AccPrefix + "-" + p.AccSuffix + "-" + p.AccountName,
                                    }
                                    ).ToListAsync();
            return Ok(new
            {
                Success = true,
                data = savingAccounts
            }
            );
        }

        [HttpGet("fd-accounts-for-premature/{branchId}/{fdProductId}/{currentDate}")]
        public async Task<IActionResult> FDOpenAccountsForPremature([FromRoute] int branchId, int fdProductId, DateTime currentDate)
        {
            int openStatus = (int)Enums.FDStatus.Open;
            int accountType = (int)Enums.AccountTypes.FD;
            var fdAccounts = await (from p in _context.accountmaster
                                    join q in _context.fdaccountdetail
                                    on new { accId = p.ID, branchId = p.BranchId }
                                    equals new { accId = q.AccountId, branchId = q.BranchId }
                                    where p.BranchId == branchId
                                    && p.GeneralProductId == fdProductId && p.AccTypeId == accountType
                                    && q.FDStatus == openStatus
                                    && p.AccOpeningDate <= currentDate
                                    && q.FDMaturityDate < currentDate
                                    select new
                                    {
                                        AccId = p.ID,
                                        AccountName = p.AccPrefix + "-" + p.AccSuffix + "-" + p.AccountName,
                                    }
                                    ).ToListAsync();
            return Ok(new
            {
                Success = true,
                data = fdAccounts
            }
            );
        }

        [HttpGet("rd-products/{branchId}")]
        public async Task<IActionResult> RDProducts([FromRoute] int branchId)
        {
            var productInfo = await _context.rdproduct.Where(x => x.BrId == branchId).Select(x => new RDProductDTO
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

        [HttpGet("loan-products/{branchId}")]
        public async Task<IActionResult> LoanProducts([FromRoute] int branchId)
        {
            var productInfo = await _context.loanproduct.Where(x => x.BrId == branchId)
                .Select(x => new { id = x.Id, productName = x.Code + "-" + x.ProductName })
                .ToListAsync();
            return Ok(new { Success = true, data = productInfo });
        }

        [HttpGet("fetch-rd-prefix-and-suffix/{branchId}/{productId}")]
        public async Task<IActionResult> RDPrefixAndSuffix([FromRoute] int branchId, int productId)
        {
            int accountType = (int)Enums.AccountTypes.RD;
            var prefix = await _context.rdproduct.Where(x => x.Id == productId && x.BrId == branchId)
                .Select(x => x.ProductCode).FirstOrDefaultAsync() ?? "";
            var accountMasterInfo = await _context.accountmaster.Where(x => x.BranchId == branchId && x.GeneralProductId == productId && x.AccTypeId == accountType)
                .Select(x => new { x.AccPrefix, x.AccSuffix }).ToListAsync();
            var suffix = accountMasterInfo.Select(x => x.AccSuffix).Max() + 1 ?? 1;
            return Ok(new
            {
                Success = true,
                data = prefix + "-" + suffix
            });

        }

        [HttpGet("fetch-rd-related-info/{rdDate}/{periodInMonths}/{productId}/{kistAmount}/{branchId}/{intCompoundingInterval}")]
        public async Task<IActionResult> CalculateRDRelatedInfo([FromRoute] DateTime rdDate, int periodInMonths, int productId, decimal kistAmount, int branchId, int intCompoundingInterval)
        {
            DateTime maturityDate = await _rdAccountService.CalculateMaturityDate(rdDate, periodInMonths, 0);
            (decimal intRate, string slabName, string compoundingInterval, int IcompoundingInterval, int slabId) = await _rdAccountService.SlabInfo(kistAmount, periodInMonths, rdDate, productId, intCompoundingInterval);
            decimal maturityAmount = await _rdAccountService.CalculateMaturityAmount(kistAmount, intRate, rdDate, maturityDate, productId, branchId, intCompoundingInterval);

            return Ok(new
            {
                Success = true,
                data = new
                {
                    maturityDate = maturityDate,
                    interestRate = intRate,
                    slabName = slabName,
                    compoundingInterval = compoundingInterval,
                    maturityAmount = maturityAmount,
                    slabId = slabId
                }
            });
        }

        [HttpGet("open-rd-accounts/{branchId}/{rdProductId}/{currentDate}")]
        public async Task<IActionResult> OpenRDAccounts([FromRoute] int branchId, int rdProductId, DateTime currentDate)
        {
            int rdStatus = (int)Enums.FDStatus.Open;
            int accountType = (int)Enums.AccountTypes.RD;
            var rdAccounts = await (from p in _context.accountmaster
                                    join q in _context.rdaccountdetail
                                    on new { accId = p.ID, branchId = p.BranchId }
                                    equals new { accId = (int)q.AccId!, branchId = q.BrId }
                                    where p.BranchId == branchId && q.Status == rdStatus
                                    && p.GeneralProductId == rdProductId && p.AccTypeId == accountType
                                    && q.MaturityDate <= currentDate
                                    select new
                                    {
                                        AccId = p.ID,
                                        AccountName = p.AccPrefix + "-" + p.AccSuffix + "-" + p.AccountName,
                                    }
                                    ).ToListAsync();
            return Ok(new
            {
                Success = true,
                data = rdAccounts
            }
            );
        }

        [HttpGet("open-rd-accounts-for-premature/{branchId}/{rdProductId}/{currentDate}")]
        public async Task<IActionResult> OpenRDAccountsForPreMature([FromRoute] int branchId, int rdProductId, DateTime currentDate)
        {
            int rdStatus = (int)Enums.FDStatus.Open;
            int accountType = (int)Enums.AccountTypes.RD;
            var rdAccounts = await (from p in _context.accountmaster
                                    join q in _context.rdaccountdetail
                                    on new { accId = p.ID, branchId = p.BranchId }
                                    equals new { accId = (int)q.AccId!, branchId = q.BrId }
                                    where p.BranchId == branchId && q.Status == rdStatus
                                    && p.GeneralProductId == rdProductId && p.AccTypeId == accountType
                                    && q.MaturityDate > currentDate
                                    select new
                                    {
                                        AccId = p.ID,
                                        AccountName = p.AccPrefix + "-" + p.AccSuffix + "-" + p.AccountName,
                                    }
                                    ).ToListAsync();
            return Ok(new
            {
                Success = true,
                data = rdAccounts
            }
            );
        }

        [HttpGet("active-members/{branchId}")]
        public async Task<IActionResult> GetActiveMembers(int branchId)
        {
            var members = await _context.member.AsNoTracking()
                .Where(x => x.BranchId == branchId && x.MemberStatus == 1)
                .OrderBy(x => x.MemberName)
                .Select(x => new
                {
                    MemberId = x.Id,
                    MemberBrId = x.BranchId,
                    MemberName = x.MemberName,
                    RelativeName = x.RelativeName,
                    PermanentMembershipNo = x.PermanentMembershipNo,
                    NominalMembershipNo = x.NominalMembershipNo,
                })
                .ToListAsync();

            return Ok(new { Success = true, Data = members });
        }

        [HttpGet("fd-accounts-for-pledge/{branchId}/{openingDate}")]
        public async Task<IActionResult> GetFDAccountsForPledge(int branchId, DateTime openingDate)
        {
            int accType = (int)Enums.AccountTypes.FD;
            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId && x.AccTypeId == accType
                         && (!x.IsAccClosed || (x.IsAccClosed && x.ClosingDate > openingDate)) && x.AccOpeningDate <= openingDate)
                .OrderBy(x => x.AccSuffix)
                .Select(x => new { AccId = x.ID, AccountNumber = x.AccPrefix + "-" + x.AccSuffix, AccountName = x.AccountName })
                .ToListAsync();
            return Ok(new { Success = true, Data = accounts });
        }

        [HttpGet("rd-accounts-for-pledge/{branchId}/{openingDate}")]
        public async Task<IActionResult> GetRDAccountsForPledge(int branchId, DateTime openingDate)
        {
            int accType = (int)Enums.AccountTypes.RD;
            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId && x.AccTypeId == accType
                         && (!x.IsAccClosed || (x.IsAccClosed && x.ClosingDate > openingDate)) && x.AccOpeningDate <= openingDate)
                .OrderBy(x => x.AccSuffix)
                .Select(x => new { AccId = x.ID, AccountNumber = x.AccPrefix + "-" + x.AccSuffix, AccountName = x.AccountName })
                .ToListAsync();
            return Ok(new { Success = true, Data = accounts });
        }

        [HttpGet("loan-accounts-by-product/{branchId}/{productId}/{currentDate}")]
        public async Task<IActionResult> LoanAccountsByProduct([FromRoute] int branchId, int productId, DateTime currentDate)
        {
            int accountType = (int)Enums.AccountTypes.Loan;
            var loanAccounts = await (from p in _context.accountmaster.AsNoTracking()
                                      join q in _context.accountkistdetail.AsNoTracking()
                                      on new { accId = p.ID, branchId = p.BranchId }
                                      equals new { accId = q.AccountId, branchId = q.BrId }
                                      where p.BranchId == branchId && p.GeneralProductId == productId
                                      && p.AccTypeId == accountType && p.IsAccClosed == false
                                      && p.AccOpeningDate <= currentDate
                                      select new
                                      {
                                          AccId = p.ID,
                                          AccountName = p.AccountNumber + "-" + p.AccountName,
                                          LoanAmountPassed = q.LoanAmountPassed ?? 0
                                      }).ToListAsync();
            return Ok(new { Success = true, data = loanAccounts });
        }

        [HttpGet("accounts-by-type/{branchId}/{accountType}")]
        public async Task<IActionResult> AccountsByType([FromRoute] int branchId, int accountType)
        {
            int generalType = (int)Enums.AccountTypes.General;
            int loanType = (int)Enums.AccountTypes.Loan;
            int shareMoneyType = (int)Enums.AccountTypes.ShareMoney;
            var accounts = await _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId && x.AccTypeId == accountType && x.IsAccClosed == false)
                .Select(x => new
                {
                    AccId = x.ID,
                    AccountName = (x.AccTypeId == generalType || x.AccTypeId == loanType || x.AccTypeId == shareMoneyType)
                        ? x.AccountNumber + "-" + x.AccountName
                        : x.AccPrefix + "-" + x.AccSuffix + "-" + x.AccountName
                })
                .ToListAsync();
            return Ok(new { Success = true, data = accounts });
        }

        [HttpGet("member-name/{memberId}/{branchId}")]
        public async Task<IActionResult> GetMemberName([FromRoute] int memberId, int branchId)
        {
            var info = await _context.member.AsNoTracking()
                .Where(x => x.Id == memberId && x.BranchId == branchId)
                .Select(x => new { MemberName = x.MemberName, RelativeName = x.RelativeName })
                .FirstOrDefaultAsync();
            return Ok(new { Success = info != null, data = info });
        }

        [HttpGet("saving-account-by-accno/{branchId}/{accountNo}")]
        public async Task<IActionResult> GetSavingAccountByAccNo(int branchId, string accountNo)
        {
            int accType = (int)Enums.AccountTypes.Saving;
            var account = await _context.accountmaster.AsNoTracking()
                .Where(x => x.BranchId == branchId && x.AccountNumber == accountNo && x.AccTypeId == accType)
                .Select(x => new
                {
                    AccId = x.ID,
                    AccountNumber = x.AccountNumber,
                    AccountName = x.AccountName,
                    AccPrefix = x.AccPrefix,
                    AccSuffix = x.AccSuffix,
                    IsAccClosed = x.IsAccClosed,
                    MemberId = x.MemberId,
                })
                .FirstOrDefaultAsync();

            if (account == null)
                return Ok(new { Success = false, Data = (object?)null, Message = "Saving account not found." });

            return Ok(new { Success = true, Data = account, Message = "" });
        }

        [HttpGet("can-modify-account/{accountId}/{branchId}")]
        public async Task<IActionResult> CanModifyAccount([FromRoute] int accountId, int branchId)
        {
            var accOpeningDate = await _context.accountmaster.AsNoTracking()
                .Where(x => x.ID == accountId && x.BranchId == branchId)
                .Select(x => x.AccOpeningDate)
                .FirstOrDefaultAsync();

            if (accOpeningDate == default(DateTime))
                return Ok(new { Success = false, Message = "Account not found." });

            var canModify = await _commonFunctions.CanModifyAccountInCurrentSession(branchId, accOpeningDate);
            return Ok(new
            {
                Success = canModify,
                Message = canModify ? "OK" : "This account can only be modified in the session it was opened in."
            });
        }

    }
}
