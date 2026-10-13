import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { RootState } from "../../redux";
import agentApi, { AgentMaster, AgentLevel } from "../../services/agent/agentApi";
import CRUDMaster from "../../components/Location/CRUDOperations";
import AgentMasterTable from "./agent-master-table";

export default function AgentMasterData() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const [levelOpts, setLevelOpts] = useState<AgentLevel[]>([]);

  useEffect(() => {
    agentApi.getAgentLevelDropdown(branchId)
      .then((res: any) => setLevelOpts(res.items ?? []))
      .catch(() => {});
  }, [branchId]);

  const fetchData = useCallback(
    async (filter: { searchTerm: string; pageNumber: number; pageSize: number }) => {
      try {
        const res = await agentApi.getAgents(branchId, filter);
        return {
          success: true,
          data: (res as any).items ?? [],
          totalCount: (res as any).totalCount ?? 0,
          message: "",
        };
      } catch (e: any) {
        return { success: false, data: [], totalCount: 0, message: e.message };
      }
    },
    [branchId]
  );

  const openForm = useCallback(async (edit?: AgentMaster) => {
    const levelOptStr = levelOpts
      .map(l => `<option value="${l.id}" ${edit?.agentLevelId === l.id ? "selected" : ""}>${l.code} — ${l.description}</option>`)
      .join("");

    const { value: confirmed } = await Swal.fire({
      title: edit ? "Edit Agent" : "Add Agent",
      html: `
        <div class="space-y-4 text-left p-1">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Code <span class="text-red-500">*</span></label>
              <input id="ag-code" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                maxlength="20" placeholder="Agent code" value="${edit?.code ?? ''}" autocomplete="off"/>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Level</label>
              <select id="ag-level" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500 cursor-pointer">
                <option value="">— Select Level —</option>
                ${levelOptStr}
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Name <span class="text-red-500">*</span></label>
            <input id="ag-name" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500"
              maxlength="150" placeholder="Full agent name" value="${edit?.name ?? ''}" autocomplete="off"/>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
              <input id="ag-phone" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                maxlength="20" placeholder="Phone number" value="${edit?.phone ?? ''}" autocomplete="off"/>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Active</label>
              <select id="ag-active" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500 cursor-pointer">
                <option value="true" ${(edit?.isActive ?? true) ? "selected" : ""}>Yes</option>
                <option value="false" ${edit && !edit.isActive ? "selected" : ""}>No</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Address</label>
            <textarea id="ag-address" rows="2" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500 resize-none"
              maxlength="200" placeholder="Address">${edit?.address ?? ''}</textarea>
          </div>
        </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: edit ? "Update" : "Add",
      confirmButtonColor: "#4f46e5",
      width: 560,
      preConfirm: () => {
        const code = (document.getElementById("ag-code") as HTMLInputElement).value.trim();
        const name = (document.getElementById("ag-name") as HTMLInputElement).value.trim();
        const levelSel = document.getElementById("ag-level") as HTMLSelectElement;
        const activeSel = document.getElementById("ag-active") as HTMLSelectElement;
        const agentLevelId = levelSel.value ? parseInt(levelSel.value) : null;
        const isActive = activeSel.value === "true";
        const phone = (document.getElementById("ag-phone") as HTMLInputElement).value.trim();
        const address = (document.getElementById("ag-address") as HTMLTextAreaElement).value.trim();
        if (!code || !name) { Swal.showValidationMessage("Code and Name are required."); return false; }
        return { code, name, agentLevelId, phone, address, isActive };
      },
    });

    if (!confirmed) return;

    try {
      const dto = { ...confirmed, id: edit?.id ?? 0, branchId };
      if (edit) {
        await agentApi.updateAgent(dto);
        Swal.fire({ icon: "success", title: "Updated", timer: 1200, showConfirmButton: false });
      } else {
        await agentApi.createAgent(dto);
        Swal.fire({ icon: "success", title: "Added", timer: 1200, showConfirmButton: false });
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to save.", "error");
    }
  }, [branchId, levelOpts]);

  const handleDelete = useCallback(async (item: AgentMaster) => {
    const result = await Swal.fire({
      title: "Delete Agent?",
      text: `Delete "${item.name}" (${item.code})? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
    });
    if (!result.isConfirmed) return;
    try {
      await agentApi.deleteAgent(item.id, branchId);
      await Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire("Cannot Delete", err.message || "Failed to delete.", "error");
    }
  }, [branchId]);

  return (
    <CRUDMaster<AgentMaster>
      fetchData={fetchData}
      addEntry={async () => openForm()}
      modifyEntry={async (item) => openForm(item)}
      deleteEntry={handleDelete}
      pageTitle="Agent Master"
      addLabel="Add Agent"
      onClose={() => navigate("/agent-master")}
      searchPlaceholder="Search code or name..."
      renderTable={(items, onModify, onDelete) => (
        <AgentMasterTable items={items} onEdit={onModify} onDelete={onDelete} />
      )}
      getKey={(item) => item.id}
    />
  );
}
