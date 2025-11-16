using BankingPlatform.API.Common;
using BankingPlatform.API.DTO;
using BankingPlatform.API.DTO.BranchMaster;
using BankingPlatform.Infrastructure;
using BankingPlatform.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BankingPlatform.API.Service
{
    public class BranchMasterService
    {
        private readonly BankingDbContext _context;
        private readonly CommonFunctions _commonfunctions;

        public BranchMasterService(BankingDbContext context, CommonFunctions commonFunctions)
        {
            _context = context;
            _commonfunctions = commonFunctions;
        }

        public async Task<string> CreateBranchAsync(BranchMasterDto dto)
        {
            if (await _commonfunctions.IsAnyBranchStatedAsMain() && dto.IsMainBranch == true)
                return "A Main Branch already exists. Only one branch can be set as Main Branch.";
            // Check for duplicate fields
            var duplicateFields = await _context.branchmaster
                .Where(x => x.id != dto.Id && x.branchmaster_societyid == dto.SocietyId)
                .Select(x => new { x.branchmaster_code, x.branchmaster_name, x.branchmaster_emailid, x.branchmaster_gstino })
                .ToListAsync();

            string result = "";
            if (duplicateFields.Any(x => x.branchmaster_code?.ToLower() == dto.Code?.ToLower()))
                result = "Branch Code";
            if (duplicateFields.Any(x => x.branchmaster_name.ToLower() == dto.Name.ToLower()))
                result = result != "" ? result + ", Branch Name" : "Branch Name";
            if (duplicateFields.Any(x => x.branchmaster_emailid.ToLower() == dto.EmailId.ToLower()))
                result = result != "" ? result + ", Email ID" : "Email ID";
            if (!string.IsNullOrEmpty(dto.GSTINNo) && duplicateFields.Any(x => x.branchmaster_gstino == dto.GSTINNo))
                result = result != "" ? result + ", GSTIN Number" : "GSTIN Number";

            if (result != "")
                return $"{result} already exists";

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var branchEntity = MapToEntity(dto);
                await _context.branchmaster.AddAsync(branchEntity);
                await _context.SaveChangesAsync();
                var superuserInfo = await _context.user.AsNoTracking().FirstOrDefaultAsync(x => x.issu == 1);
                if (superuserInfo != null)
                {
                    var newUser = superuserInfo;
                    newUser.id = 0;
                    newUser.branchid = branchEntity.id;
                    await _context.user.AddAsync(newUser);
                }
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return "Success";
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return "Error";
            }
        }

        public async Task<(List<BranchMasterDto> Items, int TotalCount)> GetAllBranchesAsync(int societyId, LocationFilterDTO filter)
        {
            var query = _context.branchmaster
                .AsNoTracking()
                .Where(x => x.branchmaster_societyid == societyId);

            // Search filter
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm;
                query = query.Where(b =>
                    b.branchmaster_code.ToLower().Contains(term.ToLower()) ||
                    b.branchmaster_name.ToLower().Contains(term.ToLower()) ||
                    b.branchmaster_emailid.ToLower().Contains(term.ToLower()) ||
                    b.branchmaster_addressline.ToLower().Contains(term.ToLower()));
            }

            var totalCount = await query.CountAsync();
            var branches = await query
                .OrderBy(b => b.branchmaster_code)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var items = branches.Select(b => MapToDTO(b)).ToList();

            return (items, totalCount);
        }

        public async Task<BranchMasterDto?> GetBranchByIdAsync(int branchId, int societyId)
        {
            var branch = await _context.branchmaster
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.id == branchId && b.branchmaster_societyid == societyId);

            return branch != null ? MapToDTO(branch) : null;
        }

        public async Task<string> UpdateBranchAsync(BranchMasterDto dto)
        {
            if (await _commonfunctions.IsAnyBranchStatedAsMain(dto.Id) && dto.IsMainBranch == true)
                return "A Main Branch already exists. Only one branch can be set as Main Branch.";
            var branchEntity = await _context.branchmaster
                .FirstOrDefaultAsync(b => b.id == dto.Id && b.branchmaster_societyid == dto.SocietyId);

            if (branchEntity == null)
                return "Branch not found.";

            // Check for duplicate fields (excluding current branch)
            var duplicateFields = await _context.branchmaster
                .Where(x => x.id != dto.Id && x.branchmaster_societyid == dto.SocietyId)
                .Select(x => new { x.branchmaster_code, x.branchmaster_name, x.branchmaster_emailid, x.branchmaster_gstino })
                .ToListAsync();

            string result = "";
            if (duplicateFields.Any(x => x.branchmaster_code?.ToLower() == dto.Code?.ToLower()))
                result = "Branch Code";
            if (duplicateFields.Any(x => x.branchmaster_name.ToLower() == dto.Name.ToLower()))
                result = result != "" ? result + ", Branch Name" : "Branch Name";
            if (duplicateFields.Any(x => x.branchmaster_emailid.ToLower() == dto.EmailId.ToLower()))
                result = result != "" ? result + ", Email ID" : "Email ID";
            if (!string.IsNullOrEmpty(dto.GSTINNo) && duplicateFields.Any(x => x.branchmaster_gstino == dto.GSTINNo))
                result = result != "" ? result + ", GSTIN Number" : "GSTIN Number";

            if (result != "")
                return $"{result} already exists";

            // Update branch entity
            MapToEntity(dto, branchEntity);
            _context.branchmaster.Update(branchEntity);

            await _context.SaveChangesAsync();
            return "Success";
        }

        public async Task<string> DeleteBranchAsync(int branchId, int societyId)
        {
            var branch = await _context.branchmaster
                .FirstOrDefaultAsync(b => b.id == branchId && b.branchmaster_societyid == societyId);

            if (branch == null)
                return "Branch not found.";

            _context.branchmaster.Remove(branch);
            await _context.SaveChangesAsync();

            return "Success";
        }

        // Mapping Methods
        private branchMaster MapToEntity(BranchMasterDto dto, branchMaster? entity = null)
        {
            entity ??= new branchMaster();

            entity.id = dto.Id;
            entity.branchmaster_societyid = dto.SocietyId;
            entity.branchmaster_code = dto.Code;
            entity.branchmaster_name = dto.Name;
            entity.branchmaster_namesl = dto.NameSL;
            entity.branchmaster_addressline = dto.AddressLine;
            entity.branchmaster_addresslinesl = dto.AddressLineSL;
            entity.branchmaster_addresstype = dto.AddressType;
            entity.branchmaster_stationid = dto.StationId;
            entity.branchmaster_phoneprefix1 = dto.PhonePrefix1;
            entity.branchmaster_phoneno1 = dto.PhoneNo1;
            entity.branchmaster_phonetype1 = dto.PhoneType1;
            entity.branchmaster_phoneprefix2 = dto.PhonePrefix2;
            entity.branchmaster_phoneno2 = dto.PhoneNo2;
            entity.branchmaster_phonetype2 = dto.PhoneType2;
            entity.branchmaster_ismainbranch = (short)(dto.IsMainBranch ? 1 : 0);
            entity.branchmaster_seqno = dto.SequenceNo;
            entity.branchmaster_emailid = dto.EmailId;
            entity.branchmaster_pincode = dto.Pincode;
            entity.branchmaster_tehsilid = dto.TehsilId;
            entity.branchmaster_gstino = dto.GSTINNo;
            entity.branchmaster_gstnoissuedate = dto.GSTNoIssueDate;
            entity.branchmaster_stateid = dto.StateId;

            return entity;
        }

        private BranchMasterDto MapToDTO(branchMaster entity) => new()
        {
            Id = entity.id,
            SocietyId = entity.branchmaster_societyid,
            Code = entity.branchmaster_code,
            Name = entity.branchmaster_name,
            NameSL = entity.branchmaster_namesl,
            AddressLine = entity.branchmaster_addressline,
            AddressLineSL = entity.branchmaster_addresslinesl,
            AddressType = entity.branchmaster_addresstype,
            StationId = entity.branchmaster_stationid,
            PhonePrefix1 = entity.branchmaster_phoneprefix1,
            PhoneNo1 = entity.branchmaster_phoneno1,
            PhoneType1 = entity.branchmaster_phonetype1,
            PhonePrefix2 = entity.branchmaster_phoneprefix2,
            PhoneNo2 = entity.branchmaster_phoneno2,
            PhoneType2 = entity.branchmaster_phonetype2,
            IsMainBranch = entity.branchmaster_ismainbranch == 1,
            SequenceNo = entity.branchmaster_seqno,
            EmailId = entity.branchmaster_emailid,
            Pincode = entity.branchmaster_pincode,
            TehsilId = entity.branchmaster_tehsilid,
            GSTINNo = entity.branchmaster_gstino,
            GSTNoIssueDate = entity.branchmaster_gstnoissuedate,
            StateId = entity.branchmaster_stateid,
        };
    }

    // Pagination Filter DTO
    public class PaginationFilter
    {
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string SearchTerm { get; set; } = string.Empty;
    }
}
