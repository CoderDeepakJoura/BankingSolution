using BankingPlatform.API.DTO.Member;
using BankingPlatform.Infrastructure;
using BankingPlatform.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.API.Services
{
    public class MemberService
    {
        private readonly BankingDbContext _context;

        public MemberService(BankingDbContext context)
        {
            _context = context;
        }

        // CREATE
        public async Task<CombinedMemberDTO> CreateMemberAsync(CombinedMemberDTO dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var member = MapToEntity(dto.Member);
                await _context.member.AddAsync(member);
                await _context.SaveChangesAsync();

                foreach (var nomineeDto in dto.Nominees)
                {
                    var nominee = MapToEntity(nomineeDto);
                    nominee.MemberId = member.Id;
                    nominee.BranchId = member.MemberBranchId;
                    await _context.membernominee.AddAsync(nominee);
                }

                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }

            return dto;
        }

        // READ (all members with nominees)
        public async Task<List<CombinedMemberDTO>> GetAllMembersAsync()
        {
            var members = await _context.member.ToListAsync();
            var nominees = await _context.membernominee.ToListAsync();

            return members.Select(m => new CombinedMemberDTO
            {
                Member = MapToDTO(m),
                Nominees = nominees.Where(n => n.MemberId == m.Id && n.BranchId == m.MemberBranchId)
                                   .Select(MapToDTO)
                                   .ToList()
            }).ToList();
        }

        // READ (single by id)
        public async Task<CombinedMemberDTO?> GetMemberByIdAsync(int id, int branchId)
        {
            var member = await _context.member.FirstOrDefaultAsync(m => m.Id == id && m.MemberBranchId == branchId);
            if (member == null) return null;

            var nominees = await _context.membernominee
                .Where(n => n.MemberId == id && n.BranchId == branchId)
                .ToListAsync();

            return new CombinedMemberDTO
            {
                Member = MapToDTO(member),
                Nominees = nominees.Select(MapToDTO).ToList()
            };
        }

        // UPDATE
        public async Task<bool> UpdateMemberAsync(CombinedMemberDTO dto)
        {
            var member = await _context.member.FirstOrDefaultAsync(m => m.Id == dto.Member.Id && m.MemberBranchId == dto.Member.MemberBranchId);
            if (member == null) return false;

            // Update Member
            MapToEntity(dto.Member, member);
            _context.member.Update(member);

            // Update Nominees
            var existingNominees = await _context.membernominee
                .Where(n => n.MemberId == member.Id && n.BranchId == member.MemberBranchId)
                .ToListAsync();

            _context.membernominee.RemoveRange(existingNominees);

            foreach (var nomineeDto in dto.Nominees)
            {
                var nominee = MapToEntity(nomineeDto);
                nominee.MemberId = member.Id;
                nominee.BranchId = member.MemberBranchId;
                await _context.membernominee.AddAsync(nominee);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        // DELETE
        public async Task<bool> DeleteMemberAsync(int id, int branchId)
        {
            var member = await _context.member.FirstOrDefaultAsync(m => m.Id == id && m.MemberBranchId == branchId);
            if (member == null) return false;

            var nominees = await _context.membernominee.Where(n => n.MemberId == id && n.BranchId == branchId).ToListAsync();

            _context.membernominee.RemoveRange(nominees);
            _context.member.Remove(member);

            await _context.SaveChangesAsync();
            return true;
        }

        // ---------------- Mapping Helpers ----------------

        private Member MapToEntity(MemberDTO dto, Member? entity = null)
        {
            entity ??= new Member();
            entity.Id = dto.Id;
            entity.MemberBranchId = dto.MemberBranchId;
            entity.MemberDefAreaBrId = dto.MemberDefAreaBrId;
            entity.MemberMemberType = dto.MemberMemberType;
            entity.MemberNominalMembershipNo = dto.MemberNominalMembershipNo;
            entity.MemberPermanentMembershipNo = dto.MemberPermanentMembershipNo;
            entity.MemberFirstName = dto.MemberFirstName;
            entity.MemberLastName = dto.MemberLastName;
            entity.MemberFirstNameSL = dto.MemberFirstNameSL;
            entity.MemberLastNameSL = dto.MemberLastNameSL;
            entity.MemberRelFirstName = dto.MemberRelFirstName;
            entity.MemberRelLastName = dto.MemberRelLastName;
            entity.MemberRelationId = dto.MemberRelationId;
            entity.MemberGender = dto.MemberGender;
            entity.MemberDOB = dto.MemberDOB;
            entity.MemberCasteId = dto.MemberCasteId;
            entity.MemberJoiningDate = dto.MemberJoiningDate;
            entity.MemberOccupationId = dto.MemberOccupationId;
            entity.MemberThana = dto.MemberThana;
            entity.MemberAddressLine1 = dto.MemberAddressLine1;
            entity.MemberAddressLineSL1 = dto.MemberAddressLineSL1;
            entity.MemberVillageId1 = dto.MemberVillageId1;
            entity.MemberPO1 = dto.MemberPO1;
            entity.MemberTehsil1 = dto.MemberTehsil1;
            entity.MemberAddressLine2 = dto.MemberAddressLine2;
            entity.MemberAddressLineSL2 = dto.MemberAddressLineSL2;
            entity.MemberVillageId2 = dto.MemberVillageId2;
            entity.MemberPO2 = dto.MemberPO2;
            entity.MemberTehsil2 = dto.MemberTehsil2;
            entity.MemberPhoneType1 = dto.MemberPhoneType1;
            entity.MemberPhonePrefix1 = dto.MemberPhonePrefix1;
            entity.MemberPhoneNo1 = dto.MemberPhoneNo1;
            entity.MemberPhoneType2 = dto.MemberPhoneType2;
            entity.MemberPhonePrefix2 = dto.MemberPhonePrefix2;
            entity.MemberPhoneNo2 = dto.MemberPhoneNo2;
            entity.MemberStatus = dto.MemberStatus;
            entity.MemberStatusDate = dto.MemberStatusDate;
            entity.MemberZoneId = dto.MemberZoneId;
            entity.MemberPanCardNo = dto.MemberPanCardNo;
            entity.MemberAadhaarCardNo = dto.MemberAadhaarCardNo;
            entity.MemberGSTINO = dto.MemberGSTINO;
            entity.MemberCategoryId = dto.MemberCategoryId;
            return entity;
        }

        private MemberDTO MapToDTO(Member entity) => new()
        {
            Id = entity.Id,
            MemberBranchId = entity.MemberBranchId,
            MemberDefAreaBrId = entity.MemberDefAreaBrId,
            MemberMemberType = entity.MemberMemberType,
            MemberNominalMembershipNo = entity.MemberNominalMembershipNo,
            MemberPermanentMembershipNo = entity.MemberPermanentMembershipNo,
            MemberFirstName = entity.MemberFirstName,
            MemberLastName = entity.MemberLastName,
            MemberFirstNameSL = entity.MemberFirstNameSL,
            MemberLastNameSL = entity.MemberLastNameSL,
            MemberRelFirstName = entity.MemberRelFirstName,
            MemberRelLastName = entity.MemberRelLastName,
            MemberRelationId = entity.MemberRelationId,
            MemberGender = entity.MemberGender,
            MemberDOB = entity.MemberDOB,
            MemberCasteId = entity.MemberCasteId,
            MemberJoiningDate = entity.MemberJoiningDate,
            MemberOccupationId = entity.MemberOccupationId,
            MemberThana = entity.MemberThana,
            MemberAddressLine1 = entity.MemberAddressLine1,
            MemberAddressLineSL1 = entity.MemberAddressLineSL1,
            MemberVillageId1 = entity.MemberVillageId1,
            MemberPO1 = entity.MemberPO1,
            MemberTehsil1 = entity.MemberTehsil1,
            MemberAddressLine2 = entity.MemberAddressLine2,
            MemberAddressLineSL2 = entity.MemberAddressLineSL2,
            MemberVillageId2 = entity.MemberVillageId2,
            MemberPO2 = entity.MemberPO2,
            MemberTehsil2 = entity.MemberTehsil2,
            MemberPhoneType1 = entity.MemberPhoneType1,
            MemberPhonePrefix1 = entity.MemberPhonePrefix1,
            MemberPhoneNo1 = entity.MemberPhoneNo1,
            MemberPhoneType2 = entity.MemberPhoneType2,
            MemberPhonePrefix2 = entity.MemberPhonePrefix2,
            MemberPhoneNo2 = entity.MemberPhoneNo2,
            MemberStatus = entity.MemberStatus,
            MemberStatusDate = entity.MemberStatusDate,
            MemberZoneId = entity.MemberZoneId,
            MemberPanCardNo = entity.MemberPanCardNo,
            MemberAadhaarCardNo = entity.MemberAadhaarCardNo,
            MemberGSTINO = entity.MemberGSTINO,
            MemberCategoryId = entity.MemberCategoryId
        };

        private MemberNominee MapToEntity(MemberNomineeDTO dto, MemberNominee? entity = null)
        {
            entity ??= new MemberNominee();
            entity.Id = dto.Id;
            entity.BranchId = dto.BranchId;
            entity.MemberId = dto.MemberId;
            entity.FirstName = dto.FirstName;
            entity.LastName = dto.LastName;
            entity.FirstNameSL = dto.FirstNameSL;
            entity.LastNameSL = dto.LastNameSL;
            entity.Relation = dto.Relation;
            entity.Age = dto.Age;
            entity.IsMinor = dto.IsMinor;
            entity.DOB = dto.DOB;
            entity.NameOfGuardian = dto.NameOfGuardian;
            entity.NameOfGuardianSL = dto.NameOfGuardianSL;
            entity.NominationDate = dto.NominationDate;
            entity.AadhaarCardNo = dto.AadhaarCardNo;
            return entity;
        }

        private MemberNomineeDTO MapToDTO(MemberNominee entity) => new()
        {
            Id = entity.Id,
            BranchId = entity.BranchId,
            MemberId = entity.MemberId,
            FirstName = entity.FirstName,
            LastName = entity.LastName,
            FirstNameSL = entity.FirstNameSL,
            LastNameSL = entity.LastNameSL,
            Relation = entity.Relation,
            Age = entity.Age,
            IsMinor = entity.IsMinor,
            DOB = entity.DOB,
            NameOfGuardian = entity.NameOfGuardian,
            NameOfGuardianSL = entity.NameOfGuardianSL,
            NominationDate = entity.NominationDate,
            AadhaarCardNo = entity.AadhaarCardNo
        };
    }
}
