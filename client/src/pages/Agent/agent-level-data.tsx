import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { RootState } from "../../redux";
import agentApi, { AgentLevel } from "../../services/agent/agentApi";
import CRUDMaster from "../../components/Location/CRUDOperations";
import AgentLevelTable from "./agent-level-table";

export default function AgentLevelData() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const [levelOpts, setLevelOpts] = useState<AgentLevel[]>([]);

  const loadDropdown = useCallback(async () => {
    try {
      const res = await agentApi.getAgentLevelDropdown(branchId);
      setLevelOpts((res as any).items ?? []);
    } catch { /* non-critical */ }
  }, [branchId]);

  useEffect(() => { loadDropdown(); }, [loadDropdown]);

  const fetchData = useCallback(
    async (filter: { searchTerm: string; pageNumber: number; pageSize: number }) => {
      try {
        const res = await agentApi.getAgentLevels(branchId, filter);
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

  const openForm = useCallback(async (edit?: AgentLevel) => {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="space-y-4 text-left p-1">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1">Code <span class="text-red-500">*</span></label>
          <input id="ag-code" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500"
            maxlength="20" placeholder="Short code e.g. L1" value="${edit?.code ?? ''}" autocomplete="off"/>
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1">Description <span class="text-red-500">*</span></label>
          <input id="ag-desc" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500"
            maxlength="150" placeholder="Full level name" value="${edit?.description ?? ''}" autocomplete="off"/>
        </div>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1">Parent Level (optional)</label>
          <div id="ag-parent-select"></div>
        </div>
      </div>`;

    const { value: confirmed } = await Swal.fire({
      title: edit ? "Edit Agent Level" : "Add Agent Level",
      html: container,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: edit ? "Update" : "Add",
      confirmButtonColor: "#4f46e5",
      didOpen: () => {
        const parentDiv = document.getElementById("ag-parent-select");
        if (!parentDiv) return;
        const opts = levelOpts.filter(o => o.id !== edit?.id);
        const sel = document.createElement("select");
        sel.id = "ag-parent-native";
        sel.className = "w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500 cursor-pointer";
        sel.innerHTML =
          `<option value="">— None —</option>` +
          opts.map(o => `<option value="${o.id}" ${edit?.parentLevelId === o.id ? "selected" : ""}>${o.code} — ${o.description}</option>`).join("");
        parentDiv.appendChild(sel);
      },
      preConfirm: () => {
        const code = (document.getElementById("ag-code") as HTMLInputElement).value.trim();
        const desc = (document.getElementById("ag-desc") as HTMLInputElement).value.trim();
        const parentSel = document.getElementById("ag-parent-native") as HTMLSelectElement;
        const parentId = parentSel?.value ? parseInt(parentSel.value) : null;
        if (!code || !desc) { Swal.showValidationMessage("Code and Description are required."); return false; }
        return { code, description: desc, parentLevelId: parentId };
      },
    });

    if (!confirmed) return;

    try {
      const dto = { ...confirmed, id: edit?.id ?? 0, branchId };
      if (edit) {
        await agentApi.updateAgentLevel(dto);
        Swal.fire({ icon: "success", title: "Updated", timer: 1200, showConfirmButton: false });
      } else {
        await agentApi.createAgentLevel(dto);
        Swal.fire({ icon: "success", title: "Added", timer: 1200, showConfirmButton: false });
      }
      loadDropdown();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to save.", "error");
    }
  }, [branchId, levelOpts, loadDropdown]);

  const handleDelete = useCallback(async (item: AgentLevel) => {
    const result = await Swal.fire({
      title: "Delete Agent Level?",
      text: `Delete "${item.description}" (${item.code})? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
    });
    if (!result.isConfirmed) return;
    try {
      await agentApi.deleteAgentLevel(item.id, branchId);
      await Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire("Cannot Delete", err.message || "Failed to delete.", "error");
    }
  }, [branchId]);

  return (
    <CRUDMaster<AgentLevel>
      fetchData={fetchData}
      addEntry={async () => openForm()}
      modifyEntry={async (item) => openForm(item)}
      deleteEntry={handleDelete}
      pageTitle="Agent Level Master"
      addLabel="Add Level"
      onClose={() => navigate("/agent-level")}
      searchPlaceholder="Search code or name..."
      renderTable={(items, onModify, onDelete) => (
        <AgentLevelTable items={items} onEdit={onModify} onDelete={onDelete} />
      )}
      getKey={(item) => item.id}
    />
  );
}
