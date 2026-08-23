function cleanUndefined(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => (item && typeof item === 'object' && !(item instanceof Date) ? cleanUndefined(item) : item));
  }
  const cleaned = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
        cleaned[key] = cleanUndefined(val);
      } else {
        cleaned[key] = val;
      }
    }
  }
  return cleaned;
}

const payload = {
  name: "Limon",
  zones: ["A", "B"],
  undef: undefined,
  obj: { a: 1, b: undefined }
};

console.log(JSON.stringify(cleanUndefined(payload)));
