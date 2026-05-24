const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};
