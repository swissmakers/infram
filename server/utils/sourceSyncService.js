const { syncAllSources, ensureDefaultSource } = require("../controllers/source");
const logger = require("./logger");
const { isSourceSyncEnabled } = require("./security");

let syncInterval = null;
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const startSourceSyncService = async () => {
    if (!isSourceSyncEnabled()) {
        logger.system("Source sync service is disabled (ENABLE_SOURCE_SYNC=false)");
        return;
    }

    logger.system("Starting source sync service (hourly interval)");

    try {
        await ensureDefaultSource();
    } catch (error) {
        logger.error("Failed to ensure default source", { error: error.message });
    }

    setTimeout(async () => {
        try {
            await syncAllSources();
        } catch (error) {
            logger.error("Initial source sync failed", { error: error.message });
        }
    }, 10000);

    syncInterval = setInterval(async () => {
        try {
            logger.info("Running scheduled source sync");
            await syncAllSources();
        } catch (error) {
            logger.error("Scheduled source sync failed", { error: error.message });
        }
    }, SYNC_INTERVAL_MS);
};

const stopSourceSyncService = () => {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        logger.system("Source sync service stopped");
    }
};

module.exports = { startSourceSyncService, stopSourceSyncService };
