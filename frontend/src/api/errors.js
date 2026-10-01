const label = (key) => {
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// DRF errors can be strings, lists or nested objects - flatten them into readable sentences.
const flatten = (value) => {
  if (value == null) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, val]) =>
      flatten(val).map((msg) =>
        key === "detail" || key === "non_field_errors" || /^\d+$/.test(key) ? msg : `${label(key)}: ${msg}`
      )
    );
  }
  return [String(value)];
};

export function errorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (!err?.response) return "Cannot reach the server. Please check that the backend is running.";
  const { status, data } = err.response;
  if (status === 401) return "Your session has expired. Please login again.";
  if (status === 403) return typeof data?.detail === "string" ? data.detail : "You do not have permission to do that.";
  if (status >= 500) return "The server ran into a problem. Please try again.";
  if (typeof data === "string") return data.startsWith("<") ? fallback : data;
  const messages = flatten(data);
  return messages.length ? messages.join(" ") : fallback;
}
