const { Op } = require("sequelize");
const Integration = require("../models/Integration");
const logger = require("./logger");
const { syncNetboxIntegration } = require("./netboxSyncService");

let intervalHandle = null;
let running = false;

const POLL_INTERVAL_MS = 60 * 1000;

const isSyncDue = (integration) => {
    const syncIntervalMinutes = Number(integration.config?.syncIntervalMinutes || 15);
    const dueMs = Math.max(1, syncIntervalMinutes) * 60 * 1000;
    const lastSyncAt = integration.lastSyncAt ? new Date(integration.lastSyncAt).getTime() : 0;
    return Date.now() - lastSyncAt >= dueMs;
};

const syncDueIntegrations = async () => {
    if (running) return;
    running = true;

    try {
        const integrations = await Integration.findAll({
            where: {
                type: "netbox",
                status: { [Op.ne]: "disabled" },
            },
        });

        for (const integration of integrations) {
            if (!isSyncDue(integration)) continue;

            try {
                const ownerAccountId = integration.config?.ownerAccountId;
                if (!integration.organizationId && !ownerAccountId) {
                    logger.warn("Skipping personal NetBox integration without ownerAccountId", { integrationId: integration.id });
                    continue;
                }
                await syncNetboxIntegration(integration, integration.organizationId ? null : ownerAccountId);
            } catch (error) {
                logger.error("Failed NetBox scheduled sync", {
                    integrationId: integration.id,
                    error: error.message,
                });
            }
        }
    } finally {
        running = false;
    }
};

const startNetboxIntegrationService = () => {
    if (intervalHandle) return;
    intervalHandle = setInterval(syncDueIntegrations, POLL_INTERVAL_MS);
    syncDueIntegrations().catch((error) => {
        logger.error("Initial NetBox sync cycle failed", { error: error.message });
    });
    logger.system("NetBox integration service started");
};

const stopNetboxIntegrationService = () => {
    if (!intervalHandle) return;
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.system("NetBox integration service stopped");
};

module.exports = {
    startNetboxIntegrationService,
    stopNetboxIntegrationService,
    syncDueIntegrations,
};
