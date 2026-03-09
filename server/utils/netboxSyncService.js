const https = require("https");
const { Op } = require("sequelize");
const Entry = require("../models/Entry");
const Integration = require("../models/Integration");
const logger = require("./logger");
const { fetchInventory } = require("./netboxClient");
const stateBroadcaster = require("../lib/StateBroadcaster");

const normalize = (value) => String(value || "").trim().toLowerCase();

const normalizeList = (values) => (Array.isArray(values) ? values.map(normalize).filter(Boolean) : []);

const containsAny = (haystack, needles) => {
    if (!needles.length) return true;
    const set = new Set(normalizeList(haystack));
    return needles.some((needle) => set.has(needle));
};

const getHttpsAgent = (verifyTls) => new https.Agent({
    rejectUnauthorized: verifyTls !== false,
});

const matchesFilters = (item, config = {}) => {
    const itemTags = normalizeList(item.tags);
    const role = normalize(item.role);

    const includeDeviceRoles = normalizeList(config.includeDeviceRoles);
    const excludeDeviceRoles = normalizeList(config.excludeDeviceRoles);
    const includeVmRoles = normalizeList(config.includeVmRoles);
    const excludeVmRoles = normalizeList(config.excludeVmRoles);
    const includeTags = normalizeList(config.includeTags);
    const excludeTags = normalizeList(config.excludeTags);

    if (item.kind === "device") {
        if (includeDeviceRoles.length > 0 && !includeDeviceRoles.includes(role)) return false;
        if (excludeDeviceRoles.length > 0 && excludeDeviceRoles.includes(role)) return false;
    }

    if (item.kind === "vm") {
        if (includeVmRoles.length > 0 && !includeVmRoles.includes(role)) return false;
        if (excludeVmRoles.length > 0 && excludeVmRoles.includes(role)) return false;
    }

    if (includeTags.length > 0 && !containsAny(itemTags, includeTags)) return false;
    if (excludeTags.length > 0 && containsAny(itemTags, excludeTags)) return false;

    return true;
};

const isRuleMatch = (rule = {}, item) => {
    if (rule.enabled === false) return false;
    if ((rule.targetType || "any") !== "any" && rule.targetType !== item.kind) return false;

    if (!containsAny(item.tags, normalizeList(rule.tagsAny))) return false;

    if (item.kind === "device" && !containsAny([item.role], normalizeList(rule.deviceRolesAny))) return false;
    if (item.kind === "vm" && !containsAny([item.role], normalizeList(rule.vmRolesAny))) return false;

    if (!containsAny([item.platform], normalizeList(rule.platformsAny))) return false;

    if (rule.nameIncludes && !normalize(item.name).includes(normalize(rule.nameIncludes))) return false;

    if (rule.customFieldKey && rule.customFieldValue) {
        const current = normalize(item.customFields?.[rule.customFieldKey]);
        if (current !== normalize(rule.customFieldValue)) return false;
    }

    return true;
};

const getActionDefaults = () => ({
    protocol: "ssh",
    port: 22,
    renderer: "terminal",
});

const resolveProtocolAction = (item, config = {}) => {
    const defaults = {
        ...getActionDefaults(),
        ...(config.defaultAction || {}),
    };
    const rules = Array.isArray(config.protocolRules) ? config.protocolRules : [];

    const matchedRule = rules.find((rule) => isRuleMatch(rule, item));
    const action = matchedRule?.action ? { ...defaults, ...matchedRule.action } : defaults;
    const renderer = action.renderer || (action.protocol === "rdp" || action.protocol === "vnc" ? "guac" : "terminal");
    const fallbackPort = action.protocol === "rdp" ? 3389 : action.protocol === "vnc" ? 5900 : 22;

    return {
        protocol: action.protocol || "ssh",
        port: Number(action.port || fallbackPort),
        renderer,
        matchedRuleId: matchedRule?.id || null,
    };
};

const getIcon = (item, protocol) => {
    if (protocol === "rdp") return "windows";
    if (item.kind === "vm") return "server";
    return "linux";
};

const buildEntryConfig = (item, action, integrationId) => ({
    ip: item.primaryAddress || "",
    port: action.port,
    protocol: action.protocol,
    netbox: {
        managedBy: "netbox",
        integrationId,
        objectType: item.kind,
        objectId: item.netboxId,
        role: item.role || "",
        platform: item.platform || "",
        tags: item.tags || [],
        externalId: item.externalId,
        matchedRuleId: action.matchedRuleId,
        lastSeenAt: new Date().toISOString(),
        syncDisabled: false,
        disabledReason: null,
    },
});

const markIntegrationStatus = async (integrationId, status, message) => {
    await Integration.update({
        status: status === "ok" ? "online" : "offline",
        lastSyncAt: new Date(),
        lastSyncStatus: status,
        lastSyncMessage: message,
    }, { where: { id: integrationId } });
};

const syncNetboxIntegration = async (integration, accountId) => {
    const config = integration.config || {};
    const httpsAgent = getHttpsAgent(config.verifyTls);

    const inventory = await fetchInventory({
        apiUrl: config.apiUrl,
        apiToken: config.apiToken,
        httpsAgent,
    });

    const allItems = [...inventory.devices, ...inventory.vms];
    const items = allItems.filter((item) => matchesFilters(item, config));

    const existing = await Entry.findAll({
        where: {
            integrationId: integration.id,
            managedBy: "netbox",
            externalId: { [Op.ne]: null },
        },
    });

    const existingByExternalId = new Map(existing.map((entry) => [entry.externalId, entry]));
    const seenExternalIds = new Set();

    let created = 0;
    let updated = 0;
    let deleted = 0;

    for (const item of items) {
        const action = resolveProtocolAction(item, config);
        const existingEntry = existingByExternalId.get(item.externalId);
        const entryConfig = buildEntryConfig(item, action, integration.id);
        const payload = {
            name: item.name,
            type: "server",
            renderer: action.renderer,
            icon: getIcon(item, action.protocol),
            status: "online",
            accountId: integration.organizationId ? null : accountId,
            organizationId: integration.organizationId || null,
            folderId: config.folderId || null,
            integrationId: integration.id,
            managedBy: "netbox",
            externalId: item.externalId,
            isManagedDisabled: false,
            config: entryConfig,
        };

        if (existingEntry) {
            await Entry.update(payload, { where: { id: existingEntry.id } });
            updated++;
        } else {
            await Entry.create(payload);
            created++;
        }

        seenExternalIds.add(item.externalId);
    }

    const toDelete = existing.filter((entry) => !seenExternalIds.has(entry.externalId));
    for (const entry of toDelete) {
        await Entry.destroy({ where: { id: entry.id } });
        deleted++;
    }

    const summary = `NetBox sync complete: created ${created}, updated ${updated}, deleted ${deleted}.`;
    await markIntegrationStatus(integration.id, "ok", summary);
    logger.info(summary, { integrationId: integration.id, total: items.length });

    // Push background update so connected clients refresh server lists without reload.
    stateBroadcaster.broadcast("ENTRIES", {
        accountId: integration.organizationId ? undefined : accountId,
        organizationId: integration.organizationId || undefined,
    });

    return {
        success: true,
        created,
        updated,
        deleted,
        totalMatched: items.length,
        totalFetched: allItems.length,
        message: summary,
    };
};

module.exports = {
    syncNetboxIntegration,
};
