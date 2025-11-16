// store/userSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  name: string;
  branchid: number;
  branch_name?: string;
  email?: string;
  address?: string;
  contact?: string;
  workingdate?: string;
  sessionInfo: string;
  sessionId: number;
  
}

const initialState: UserState = {
  name: "User",
  branchid : 0
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
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
