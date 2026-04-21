const y = "2026";
const m = "04";
const d = "03";
const start = new Date(y, m - 1, d, 0, 0, 0, 0);
const end = new Date(y, m - 1, d, 23, 59, 59, 999);
console.log("START", start.toISOString());
console.log("END", end.toISOString());
