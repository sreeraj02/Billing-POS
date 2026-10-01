const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
export const money = (value) => inr.format(Number(value || 0));

export const dateTime = (value) =>
  value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";

export const dateOnly = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "";

export const isoDate = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
