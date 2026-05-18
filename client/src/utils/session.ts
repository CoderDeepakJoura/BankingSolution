interface OpeningBalanceSessionState {
  isFirstSession?: string | boolean;
  firstSessionFromDate?: string;
  sessionInfo?: string;
}


export const toInputDate = (value?: string | null): string => {
  if (!value) return "";
  return value.split("T")[0];
};

export const getFirstSessionFromDate = (
  user: OpeningBalanceSessionState,
): string => {
  const firstSessionFromDate = toInputDate(user.firstSessionFromDate);
  if (firstSessionFromDate) return firstSessionFromDate;

  const sessionParts = user.sessionInfo ? user.sessionInfo.split("-") : [];
  return sessionParts.length === 2 ? `${sessionParts[0]}-04-01` : "";
};

export const canEnterOpeningBalance = (
  user: OpeningBalanceSessionState,
  accountOpeningDate?: string,
): boolean => {
  const isFirstSession =
    user.isFirstSession === true || user.isFirstSession === "True";
  const firstSessionFromDate = getFirstSessionFromDate(user);

  return Boolean(
    isFirstSession &&
      accountOpeningDate &&
      firstSessionFromDate &&
      accountOpeningDate < firstSessionFromDate,
  );
};
