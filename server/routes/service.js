const express = require("express");
const { getFTSStatus } = require("../controllers/account");
const packageJson = require("../../package.json");
const { isVersionCheckEnabled } = require("../utils/security");

const app = express.Router();

/**
 * GET /service/is-fts
 * @summary Check Status
 * @description Determines if the Infram server requires initial setup. This endpoint is used during the first-time setup process to check if the server has been configured with initial user accounts and settings.
 * @tags Service
 * @produces application/json
 * @return {boolean} 200 - First Time Setup status information
 */
app.get("/is-fts", (req, res) => {
    getFTSStatus()
        .then(status => res.json(status))
        .catch(err => res.status(500).json({ error: err.message }));
});

/**
 * GET /service/version
 * @summary Get Version
 * @description Returns the current Infram server version.
 * @tags Service
 * @produces application/json
 * @return {object} 200 - Version information
 */
app.get("/version", (req, res) => {
    res.json({ version: packageJson.version });
});

const compareVersions = (a, b) => {
    const aParts = String(a).replace(/^v/, "").split(".").map((p) => parseInt(p, 10) || 0);
    const bParts = String(b).replace(/^v/, "").split(".").map((p) => parseInt(p, 10) || 0);
    const maxLength = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < maxLength; i++) {
        const left = aParts[i] || 0;
        const right = bParts[i] || 0;
        if (left > right) return 1;
        if (left < right) return -1;
    }

    return 0;
};

/**
 * GET /service/version/check
 * @summary Check Latest Version
 * @description Checks the latest published release tag from GitHub. Can be disabled with ENABLE_VERSION_CHECK=false.
 * @tags Service
 * @produces application/json
 * @return {object} 200 - Version check result
 */
app.get("/version/check", async (req, res) => {
    const currentVersion = packageJson.version;

    if (!isVersionCheckEnabled()) {
        return res.json({
            enabled: false,
            currentVersion,
            latestVersion: currentVersion,
            updateAvailable: false,
        });
    }

    try {
        const response = await fetch("https://api.github.com/repos/swissmakers/infra-manager/releases/latest", {
            method: "GET",
            headers: {
                "User-Agent": "Infram-Version-Checker/1.0",
                Accept: "application/vnd.github+json",
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            return res.status(502).json({
                enabled: true,
                currentVersion,
                code: 502,
                message: `Failed to fetch latest release (HTTP ${response.status})`,
            });
        }

        const payload = await response.json();
        const latestVersion = String(payload?.tag_name || "").replace(/^v/, "") || currentVersion;
        const updateAvailable = compareVersions(currentVersion, latestVersion) < 0;

        return res.json({
            enabled: true,
            currentVersion,
            latestVersion,
            updateAvailable,
            releaseUrl: payload?.html_url || null,
        });
    } catch (error) {
        return res.status(502).json({
            enabled: true,
            currentVersion,
            code: 502,
            message: error.message,
        });
    }
});

module.exports = app;