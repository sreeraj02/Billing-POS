
   export const asList = (data) => (Array.isArray(data) ? data : data?.results ?? []);