// Utils
// =====================
export function daysBetween(from?: string | null) {
  if (!from) return null;
  const d = new Date(from);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
export function daysUntil(to?: string | null) {
  if (!to) return null;
  const d = new Date(to);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatDaysUntil(to?: string | null, withOverdue = false) {
  const d = daysUntil(to);
  if (d == null) return "N/A";
  if (d < 0) {
    return withOverdue ? `หมดประกัน (${Math.abs(d)} วัน)` : "หมดประกัน";
  }
  return String(d);
}


export function ageLabel(days: number | null) {
  if (days === null) return "N/A";
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return y > 0 ? `${y}y ${m}m` : `${m}m`;
}