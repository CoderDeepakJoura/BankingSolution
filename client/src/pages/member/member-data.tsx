
// member-crud.tsx - Updated to route instead of popup
import { encryptId, decryptId } from '../../utils/encryption';
import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import CRUDMaster from "../../components/Location/CRUDOperations";
import MemberTable from "./member-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import memberAPIService, {
  MemberFilter,
  CombinedMemberDTO,
} from "../../services/member/memberServiceapi";
import commonservice, { AccountMaster } from "../../services/common/commonservice";

const fetchMembers = async (
  filter: MemberFilter,
  branchId: number
): Promise<{
  success: boolean;
  data: CombinedMemberDTO[];
  totalCount: number;
  message: string;
}> => {
  try {
    const res = await memberAPIService.fetchMembers(filter, branchId);
    return {
      success: res.success ?? false,
      data: res.memberInfo || [],
      totalCount: res.totalCount ?? 0,
      message: res.message ?? "",
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      totalCount: 0,
      message: error.message || "Failed to fetch members",
    };
  }
};

const MemberMasterCRUD: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const fetchMembersWithBranch = useCallback(
    async (filter: MemberFilter) => {
      return await fetchMembers(filter, user.branchid);
    },
    [user.branchid]
  );

  // Handle Add - Route to member master
  const handleAddMember = () => {
    navigate("/member"); // Route to member master for add
  };

  // Handle Modify - Route to member master with ID
  const handleModifyMember = (dto: CombinedMemberDTO) => {
    navigate(`/member/${encryptId(Number(dto.member?.id))}`); // Route with member ID
  };

  // Handle Delete
  const handleDeleteMember = async (dto: CombinedMemberDTO) => {
    const result = await Swal.fire({
      title: "Delete Member?",
      html: `
        <div style="text-align:left;padding:10px;">
          <p style="margin-bottom:10px;">Are you sure you want to delete this member?</p>
          <div style="background:#f3f4f6;padding:12px;border-radius:6px;">
            <p style="font-weight:600;margin:0;">${dto.member?.memberName}</p>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">Account: ${dto.accMaster?.accountNumber}</p>
          </div>
          <p style="color:#ef4444;font-size:13px;margin-top:12px;">⚠️ This action cannot be undone!</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        const memberId = dto.member?.id;
        const voucherId = dto?.voucherId || 0;
        if (!memberId) throw new Error("Member ID not found");
        
        await memberAPIService.deleteMember(memberId, user.branchid, Number(voucherId));
        await Swal.fire({
          title: "Deleted!",
          text: `Member "${dto.member?.memberName}" has been deleted.`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        // Trigger refresh
        window.location.reload();
      } catch (err: any) {
        await Swal.fire({
          title: "Error!",
          text: err.message || "Failed to delete member.",
          icon: "error",
        });
      }
    }
  };

  return (
    <CRUDMaster<CombinedMemberDTO>
      fetchData={fetchMembersWithBranch}
      addEntry={handleAddMember}
      modifyEntry={handleModifyMember}
      deleteEntry={handleDeleteMember}
      pageTitle="Member Master Operations"
      addLabel="Add Member"
      onClose={() => navigate("/member-operations")}
      searchPlaceholder="Search by member name, membership no, phone..."
      renderTable={(members, handleModify, handleDelete) => (
        <MemberTable
          members={members}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(dto) => dto.member?.id || 0}
    />
  );
};

export default MemberMasterCRUD;
