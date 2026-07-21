// store/userSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  name: string;
  branchid: number;
  branchCode?: string;
  branch_name?: string;
  email?: string;
  address?: string;
  contact?: string;
  workingdate?: string;
  sessionInfo: string;
  sessionId: number;
  isFirstSession: string;
  firstSessionFromDate: string;
  firstSessionToDate: string;
  sessionFromDate: string;
  sessionToDate: string;
  isSu: boolean;
  isMainBranch: boolean;
  branchGstNo: string;
  branchStateId: number;
  lastSeenVersion: string;
}

const initialState: UserState = {
  name: "User",
  branchid: 0,
  isFirstSession: "False",
  firstSessionFromDate: "",
  firstSessionToDate: "",
  sessionFromDate: "",
  sessionToDate: "",
  sessionInfo: "",
  sessionId: 0,
  isSu: false,
  isMainBranch: false,
  branchGstNo: "",
  branchStateId: 0,
  lastSeenVersion: "0.0.0",
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (
      state,
      action: PayloadAction<Partial<UserState>>
    ) => {
      return { ...state, ...action.payload };
    },
    clearUser: (state) => {
      state.name = "User";
      state.email = "";
      state.branch_name = "";
      state.address = "";
      state.contact = "";
      state.workingdate = "";
      state.branchid = 0;
      state.sessionInfo = "";
      state.sessionId = 0;
      state.isFirstSession = "False";
      state.firstSessionFromDate = "";
      state.firstSessionToDate = "";
      state.sessionFromDate = "";
      state.sessionToDate = "";
      state.isSu = false;
      state.isMainBranch = false;
      state.branchGstNo = "";
      state.branchStateId = 0;
      state.lastSeenVersion = "0.0.0";
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
