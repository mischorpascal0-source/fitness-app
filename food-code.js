const foodCode = (() => {
  function normalize(value) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    let code = text;
    if (/^https?:\/\//i.test(text)) {
      try {
        const url = new URL(text);
        code = url.pathname.match(/\/01\/(\d{14})(?:\/|$)/)?.[1] ??
          (/(^|\.)openfoodfacts\.org$/i.test(url.hostname) ? url.pathname.match(/\/product\/(\d+)(?:\/|$)/)?.[1] : null);
      } catch {
        return null;
      }
    } else if (text.startsWith("(01)")) {
      code = text.match(/^\(01\)(\d{14})(?:\(|$)/)?.[1];
    }
    if (!code || !/^(?:\d{8}|\d{12,14})$/.test(code)) return null;
    if (code.length === 12) return "0" + code;
    return code.length === 14 && code.startsWith("0") ? code.slice(1) : code;
  }

  return { normalize };
})();

if (typeof module !== "undefined") module.exports = foodCode;
