import React, { useCallback, useState } from "react";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import UserTable from "./user-table";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import { userApi, UserListDTO, UserFilterDTO } from "../../../services/user/userapi";
import { useNavigate } from "react-router-dom";

const inputClass =
  "w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all text-slate-700 bg-white text-sm";

const rules = [
  { id: "len", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "digit", label: "One digit (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "One special character (!@#$%^&*)", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

function validatePassword(password: string): string | null {
  for (const rule of rules) {
    if (!rule.test(password)) return rule.label + " is required.";
  }
  return null;
}

function buildRulesHtml(password = "") {
  return rules.map(r => {
    const ok = r.test(password);
    return `<li id="rule-${r.id}" class="flex items-center gap-1.5 text-xs transition-colors ${ok ? "text-green-600" : "text-slate-400"}">
      <span class="font-bold">${ok ? "✓" : "○"}</span>${r.label}
    </li>`;
  }).join("");
}

function buildFormHtml(opts: {
  usernameVal?: string;
  passwordRequired: boolean;
  passwordLabel: string;
}) {
  const { usernameVal = "", passwordRequired, passwordLabel } = opts;
  return `
    <div class="space-y-3 p-1 text-left">
      <div>
        <label class="block text-xs font-semibold text-slate-600 mb-1">
          Username <span class="text-red-500">*</span>
        </label>
        <input id="sw-username" class="${inputClass}" value="${usernameVal}"
          placeholder="Enter username" autocomplete="off" />
        <p id="sw-username-err" class="text-red-500 text-xs mt-1 hidden"></p>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-600 mb-1">
          ${passwordLabel}${passwordRequired ? ' <span class="text-red-500">*</span>' : ' <span class="text-slate-400 text-xs">(leave blank to keep)</span>'}
        </label>
        <input id="sw-password" type="password" class="${inputClass}"
          placeholder="${passwordRequired ? "Enter password" : "Enter new password"}" autocomplete="new-password" />
        <ul id="sw-rules" class="mt-2 space-y-1 pl-1">${buildRulesHtml()}</ul>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-600 mb-1">
          Confirm Password${passwordRequired ? ' <span class="text-red-500">*</span>' : ' <span class="text-slate-400 text-xs">(required if changing)</span>'}
        </label>
        <input id="sw-confirm" type="password" class="${inputClass}"
          placeholder="Re-enter password" autocomplete="new-password" />
        <p id="sw-confirm-err" class="text-red-500 text-xs mt-1 hidden"></p>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-600 mb-1">
          User Type <span class="text-red-500">*</span>
        </label>
        <select id="sw-usertype" class="${inputClass}">
          <option value="1">Admin</option>
          <option value="2">Operator</option>
          <option value="3">Viewer</option>
        </select>
      </div>

      <div class="flex gap-6 pt-1">
        <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input id="sw-isbranchsu" type="checkbox" class="w-4 h-4 accent-blue-600" />
          Branch Super User
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input id="sw-isauthorized" type="checkbox" class="w-4 h-4 accent-green-600" checked />
          Authorized
        </label>
      </div>
    </div>
    <style>
      .swal2-popup { max-width: 460px !important; }
      .swal2-html-container { margin: 0 !important; padding: 0.5rem 1rem !important; }
    </style>
  `;
}

function attachPasswordListeners() {
  const pwInput = document.getElementById("sw-password") as HTMLInputElement | null;
  const confirmInput = document.getElementById("sw-confirm") as HTMLInputElement | null;
  const confirmErr = document.getElementById("sw-confirm-err");

  if (!pwInput) return;

  pwInput.addEventListener("input", () => {
    const val = pwInput.value;
    const rulesEl = document.getElementById("sw-rules");
    if (rulesEl) rulesEl.innerHTML = buildRulesHtml(val);

    if (confirmInput && confirmErr && confirmInput.value) {
      const match = confirmInput.value === val;
      confirmErr.textContent = match ? "" : "Passwords do not match.";
      confirmErr.classList.toggle("hidden", match);
    }
  });

  if (confirmInput && confirmErr) {
    confirmInput.addEventListener("input", () => {
      const match = confirmInput.value === pwInput.value;
      confirmErr.textContent = match ? "" : "Passwords do not match.";
      confirmErr.classList.toggle("hidden", match);
    });
  }
}

const UserMasterData: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const forceReload = useCallback(() => setRefreshKey((k) => k + 1), []);

  const fetchUsers = useCallback(
    async (filter: { searchTerm: string; pageNumber: number; pageSize: number }) => {
      const f: UserFilterDTO = {
        branchId: user.branchid,
        searchTerm: filter.searchTerm,
        pageNumber: filter.pageNumber,
        pageSize: filter.pageSize,
      };
      return userApi.getAllUsers(f);
    },
    [user.branchid, refreshKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const addUser = useCallback(async () => {
    const { value: formValues } = await Swal.fire({
      title: "Add New User",
      html: buildFormHtml({ passwordRequired: true, passwordLabel: "Password" }),
      showCancelButton: true,
      confirmButtonText: "Create User",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      didOpen: attachPasswordListeners,
      preConfirm: async () => {
        const username = (document.getElementById("sw-username") as HTMLInputElement).value.trim();
        const password = (document.getElementById("sw-password") as HTMLInputElement).value;
        const confirm = (document.getElementById("sw-confirm") as HTMLInputElement).value;
        const userType = parseInt((document.getElementById("sw-usertype") as HTMLSelectElement).value);
        const isBranchSu = (document.getElementById("sw-isbranchsu") as HTMLInputElement).checked ? 1 : 0;
        const isAuthorized = (document.getElementById("sw-isauthorized") as HTMLInputElement).checked ? 1 : 0;
        const usernameErr = document.getElementById("sw-username-err");

        if (!username) {
          Swal.showValidationMessage("Username is required.");
          return null;
        }

        // Check username uniqueness
        try {
          const res = await userApi.getAllUsers({ branchId: user.branchid, searchTerm: username, pageNumber: 1, pageSize: 5 });
          const duplicate = res.data.some(u => u.username.toLowerCase() === username.toLowerCase());
          if (duplicate) {
            if (usernameErr) { usernameErr.textContent = "Username already exists."; usernameErr.classList.remove("hidden"); }
            Swal.showValidationMessage("Username already exists in this branch.");
            return null;
          }
          if (usernameErr) usernameErr.classList.add("hidden");
        } catch {
          // server will catch duplicates too
        }

        const pwErr = validatePassword(password);
        if (pwErr) { Swal.showValidationMessage(pwErr); return null; }
        if (password !== confirm) { Swal.showValidationMessage("Passwords do not match."); return null; }

        return { username, password, userType, isBranchSu, isAuthorized };
      },
    });

    if (formValues) {
      try {
        await userApi.createUser({
          branchId: user.branchid,
          username: formValues.username,
          password: formValues.password,
          isAuthorized: formValues.isAuthorized,
          isSu: 0,
          isBranchSu: formValues.isBranchSu,
          userType: formValues.userType,
        });
        Swal.fire({ title: "Success!", text: "User created successfully.", icon: "success", timer: 1500, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire("Error!", err.message || "Failed to create user.", "error");
      }
    }
  }, [user.branchid]);

  const modifyUser = useCallback(async (u: UserListDTO) => {
    const { value: formValues } = await Swal.fire({
      title: "Modify User",
      html: buildFormHtml({ usernameVal: u.username, passwordRequired: false, passwordLabel: "New Password" }),
      showCancelButton: true,
      confirmButtonText: "Update User",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      didOpen: () => {
        attachPasswordListeners();
        // Pre-select user type
        const sel = document.getElementById("sw-usertype") as HTMLSelectElement;
        if (sel) sel.value = String(u.userType);
        const branchSu = document.getElementById("sw-isbranchsu") as HTMLInputElement;
        if (branchSu) branchSu.checked = !!u.isBranchSu;
        const auth = document.getElementById("sw-isauthorized") as HTMLInputElement;
        if (auth) auth.checked = !!u.isAuthorized;
      },
      preConfirm: async () => {
        const username = (document.getElementById("sw-username") as HTMLInputElement).value.trim();
        const password = (document.getElementById("sw-password") as HTMLInputElement).value;
        const confirm = (document.getElementById("sw-confirm") as HTMLInputElement).value;
        const userType = parseInt((document.getElementById("sw-usertype") as HTMLSelectElement).value);
        const isBranchSu = (document.getElementById("sw-isbranchsu") as HTMLInputElement).checked ? 1 : 0;
        const isAuthorized = (document.getElementById("sw-isauthorized") as HTMLInputElement).checked ? 1 : 0;
        const usernameErr = document.getElementById("sw-username-err");

        if (!username) { Swal.showValidationMessage("Username is required."); return null; }

        // Check uniqueness only if username changed
        if (username.toLowerCase() !== u.username.toLowerCase()) {
          try {
            const res = await userApi.getAllUsers({ branchId: u.branchId, searchTerm: username, pageNumber: 1, pageSize: 5 });
            const duplicate = res.data.some(x => x.id !== u.id && x.username.toLowerCase() === username.toLowerCase());
            if (duplicate) {
              if (usernameErr) { usernameErr.textContent = "Username already exists."; usernameErr.classList.remove("hidden"); }
              Swal.showValidationMessage("Username already exists in this branch.");
              return null;
            }
          } catch { /* server will catch */ }
        }
        if (usernameErr) usernameErr.classList.add("hidden");

        if (password) {
          const pwErr = validatePassword(password);
          if (pwErr) { Swal.showValidationMessage(pwErr); return null; }
          if (password !== confirm) { Swal.showValidationMessage("Passwords do not match."); return null; }
        } else if (confirm) {
          Swal.showValidationMessage("Please enter a password or clear the confirm field.");
          return null;
        }

        return { username, password: password || undefined, userType, isBranchSu, isAuthorized };
      },
    });

    if (formValues) {
      try {
        await userApi.modifyUser({
          id: u.id,
          branchId: u.branchId,
          username: formValues.username,
          password: formValues.password,
          isAuthorized: formValues.isAuthorized,
          isSu: u.isSu,
          isBranchSu: formValues.isBranchSu,
          userType: formValues.userType,
        });
        Swal.fire({ title: "Success!", text: "User updated successfully.", icon: "success", timer: 1500, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire("Error!", err.message || "Failed to update user.", "error");
      }
    }
  }, []);

  const deleteUser = useCallback(async (u: UserListDTO) => {
    const result = await Swal.fire({
      title: "Delete User",
      text: `Are you sure you want to delete "${u.username}"? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await userApi.deleteUser(u.id, u.branchId);
        Swal.fire({ title: "Deleted!", text: `User "${u.username}" has been deleted.`, icon: "success", timer: 1500, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire("Error!", err.message || "Failed to delete user.", "error");
      }
    }
  }, []);

  const unauthorizeUser = useCallback(async (u: UserListDTO) => {
    const result = await Swal.fire({
      title: "Unauthorize User",
      text: `"${u.username}" will not be able to log in. Continue?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, unauthorize!",
    });

    if (result.isConfirmed) {
      try {
        await userApi.unauthorizeUser(u.id, u.branchId);
        Swal.fire({ title: "Done!", text: `"${u.username}" has been unauthorised.`, icon: "success", timer: 1500, showConfirmButton: false });
        forceReload();
      } catch (err: any) {
        Swal.fire("Error!", err.message || "Failed to unauthorize user.", "error");
      }
    }
  }, [forceReload]);

  const authorizeUser = useCallback(async (u: UserListDTO) => {
    const result = await Swal.fire({
      title: "Authorize User",
      text: `Allow "${u.username}" to log in?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#22c55e",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, authorize!",
    });

    if (result.isConfirmed) {
      try {
        await userApi.authorizeUser(u.id, u.branchId);
        Swal.fire({ title: "Done!", text: `"${u.username}" has been authorised.`, icon: "success", timer: 1500, showConfirmButton: false });
        forceReload();
      } catch (err: any) {
        Swal.fire("Error!", err.message || "Failed to authorize user.", "error");
      }
    }
  }, [forceReload]);

  return (
    <CRUDMaster<UserListDTO>
      fetchData={fetchUsers}
      addEntry={addUser}
      modifyEntry={modifyUser}
      deleteEntry={deleteUser}
      pageTitle="User Master"
      addLabel="Add User"
      onClose={() => navigate("/dashboard")}
      searchPlaceholder="Search by username..."
      renderTable={(users, handleModify, handleDelete) => (
        <UserTable
          users={users}
          handleModify={handleModify}
          handleDelete={handleDelete}
          handleUnauthorize={unauthorizeUser}
          handleAuthorize={authorizeUser}
        />
      )}
      getKey={(u) => u.id}
    />
  );
};

export default UserMasterData;
