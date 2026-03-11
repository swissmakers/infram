const { normalizeIp } = require("./ip");

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

const parseTrustProxy = (rawValue) => {
    if (rawValue === undefined || rawValue === null) return false;

    const value = String(rawValue).trim();
    if (!value) return false;

    const lower = value.toLowerCase();
    if (TRUE_VALUES.has(lower)) return true;
    if (FALSE_VALUES.has(lower)) return false;
    if (/^\d+$/.test(value)) return Number.parseInt(value, 10);
    if (value.includes(",")) return value.split(",").map((part) => part.trim()).filter(Boolean);
    return value;
};

const getTrustProxyConfig = () => parseTrustProxy(process.env.TRUST_PROXY);

const getClientIp = (req, fallback = "unknown") => {
    const ip = normalizeIp(req?.ip || req?.socket?.remoteAddress || "");
    return ip || fallback;
};

module.exports = {
    getClientIp,
    parseTrustProxy,
    getTrustProxyConfig,
};
