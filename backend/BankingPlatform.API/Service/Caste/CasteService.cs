using BankingPlatform.API.Common;
using BankingPlatform.API.Controllers;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.Miscalleneous;
using System;

namespace BankingPlatform.API.Service.Caste
{
    public class CasteService
    {
        private readonly BankingDbContext _appContext;
        private readonly CommonFunctions _commonfunctions;

        public CasteService(BankingDbContext context, CommonFunctions commonFunctions)
        {
            _appContext = context;
            _commonfunctions = commonFunctions;
        }
        public async Task<string> CreateNewCasteAsync(CasteMasterDTO dto)
        {
            string inputName = dto.CasteDescription.Trim().ToLower();
            string? inputNameSL = dto.CasteDesciptionSL?.Trim().ToLower();

            var duplicateCaste = await _appContext.caste
                .Where(c => c.branchid == dto.BranchId)
                .Where(c => c.description.ToLower() == inputName ||
                           (!string.IsNullOrEmpty(inputNameSL) && c.descriptionsl != null && c.descriptionsl.ToLower() == inputNameSL))
                .ToListAsync();

            var errors = new List<string>();

            if (duplicateCaste.Any(c => c.description.ToLower() == inputName))
                errors.Add("Caste Name already exists.");

            if (!string.IsNullOrEmpty(inputNameSL) &&
                duplicateCaste.Any(c => c.descriptionsl != null && c.descriptionsl.ToLower() == inputNameSL))
                errors.Add("Caste Name SL already exists.");

            if (errors.Any())
            {
                return string.Join(Environment.NewLine, errors);
            }
            dto.CasteDescription = dto.CasteDescription?.Trim() ?? "";
            dto.CasteDesciptionSL = dto.CasteDesciptionSL?.Trim() ?? "";


            await _appContext.caste.AddAsync(new Infrastructure.Models.Miscalleneous.Caste
            {
                branchid = dto.BranchId,
                description = dto.CasteDescription,
                categoryid = dto.CategoryId,
                descriptionsl = dto.CasteDesciptionSL

            });
            await _appContext.SaveChangesAsync();

            return "Success";
        }

        public async Task<(List<CasteMasterDTO> Items, int TotalCount)> GetAllCasteAsync(int branchId, LocationFilterDTO filter)
        {
            var query = _appContext.caste
                .AsNoTracking()
                .Where(x => x.branchid == branchId);

            // Search filter
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm;
                query = query.Where(m =>
                    m.description!.ToLower().Contains(term.ToLower()) ||
                    m.descriptionsl!.ToLower().Contains(term.ToLower()));
            }

            var totalCount = await query.CountAsync();
            var casteEntities = await query
                                .OrderBy(m => m.description)
                                .Skip((filter.PageNumber - 1) * filter.PageSize)
                                .Take(filter.PageSize)
                                .ToListAsync();

            var casteInfo = casteEntities.Select(MapToDTO).ToList();

            return (casteInfo, totalCount);
        }

        public async Task<string> UpdateCasteAsync(CasteMasterDTO casteMasterDTO)
        {
            var casteInfo = await _appContext.caste.FirstOrDefaultAsync(m => m.id == casteMasterDTO!.CasteId && m.branchid == casteMasterDTO.BranchId);
            if (casteInfo == null) return "Caste not found.";

            var duplicateFields = await _appContext.caste
                                 .Where(x => x.id != casteMasterDTO!.CasteId
                                 && x.branchid == casteMasterDTO.BranchId)
                                .Select(x => new { x.description, x.descriptionsl })
                                .ToListAsync();

            string result = "";
            if (duplicateFields.Any(x => x.description!.ToLower() == casteMasterDTO!.CasteDescription.ToLower()))
                result = "Caste";
            if (!string.IsNullOrEmpty(casteMasterDTO?.CasteDesciptionSL) && duplicateFields.Any(x => x.descriptionsl == casteMasterDTO?.CasteDesciptionSL))
                result = result != "" ? result + ", Caste Name SL" : "Caste Name SL";

            if (result != "")
                return $"{result} already exists";

            // Update Member
            MapToEntity(casteMasterDTO!, casteInfo);
            _appContext.caste.Update(casteInfo);


            await _appContext.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> DeleteCasteAsync(int casteId, int branchId)
        {
            var casteInfo = await _appContext.caste.FirstOrDefaultAsync(m => m.id == casteId && m.branchid == branchId);
            if (casteInfo == null) return "Account not found.";

            _appContext.caste.Remove(casteInfo);

            await _appContext.SaveChangesAsync();
            return "Success";
        }
        
        private Infrastructure.Models.Miscalleneous.Caste MapToEntity(CasteMasterDTO dto, Infrastructure.Models.Miscalleneous.Caste entity = null)
        {
            entity ??= new Infrastructure.Models.Miscalleneous.Caste();
            entity.id = dto.CasteId;
            entity.branchid = dto.BranchId;
            entity.description = dto.CasteDescription!;
            entity.descriptionsl = dto.CasteDesciptionSL;
            entity.categoryid = dto.CategoryId;
            return entity;
        }

        private CasteMasterDTO MapToDTO(Infrastructure.Models.Miscalleneous.Caste entity) => new()
        {

            CasteDesciptionSL = entity.descriptionsl,
            CasteDescription = entity.description!,
            CasteId = entity.id,
            BranchId = entity.branchid,
            CategoryId = entity.categoryid,
            CategoryName = _commonfunctions.GetCategoryNameFromId(entity.categoryid, entity.branchid)
        };


    }
}
