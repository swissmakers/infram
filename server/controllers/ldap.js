const { Client } = require("ldapts");
const LDAPProvider = require("../models/LDAPProvider");
const OIDCProvider = require("../models/OIDCProvider");
const Account = require("../models/Account");
const Session = require("../models/Session");
const Organization = require("../models/Organization");
const OrganizationMember = require("../models/OrganizationMember");
const { genSalt, hash } = require("bcrypt");
const crypto = require("crypto");
const logger = require("../utils/logger");
const { getLdapTlsOptions } = require("../utils/security");
const MAX_LDAP_TEST_USERS = 100;

const createLdapClient = (provider) => {
    const url = `${provider.useTLS ? "ldaps" : "ldap"}://${provider.host}:${provider.port}`;
    const timeoutMs = Number(provider.connectionTimeoutMs || 10000);
    const options = { url, timeout: timeoutMs, connectTimeout: timeoutMs };
    if (provider.useTLS) options.tlsOptions = getLdapTlsOptions();
    return new Client(options);
};

const normalizeArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
};

const normalizeDn = (value) => String(value || "").trim().toLowerCase();

const getAttributeValue = (entry, attributeName, fallback = "") => {
    if (!entry || !attributeName) return fallback;
    const raw = entry[attributeName];
    const first = Array.isArray(raw) ? raw[0] : raw;
    if (first === undefined || first === null) return fallback;
    const value = String(first).trim();
    return value || fallback;
};

const getAdminTargets = (provider) => normalizeArray(provider?.adminGroupDNs).map(normalizeDn).filter(Boolean);

const buildSearchFilter = (template, replacements = {}) => {
    let filter = String(template || "");
    Object.entries(replacements).forEach(([key, value]) => {
        filter = filter.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value || ""));
    });
    return filter;
};

const buildUserSearchAttributes = (provider) => {
    const attrs = [
        provider.usernameAttribute,
        provider.emailAttribute,
        provider.firstNameAttribute,
        provider.lastNameAttribute,
        "memberOf",
    ].filter(Boolean);
    return [...new Set(attrs)];
};

const getGroupName = (entry, groupNameAttribute) => getAttributeValue(entry, groupNameAttribute || "cn", "");

const scoreUserItem = (item) => {
    let score = 0;
    if (item.firstName) score += 2;
    if (item.lastName) score += 2;
    if (item.email) score += 1;
    if (item.dn && !/cn=compat/i.test(item.dn)) score += 1;
    return score;
};

const searchUserGroups = async (client, provider, userEntry, username) => {
    if (!provider.groupSearchBaseDN) return [];
    const memberAttr = provider.groupMemberAttribute || "member";
    const filterTemplate = provider.groupSearchFilter || `(${memberAttr}={{dn}})`;
    const filter = buildSearchFilter(filterTemplate, {
        dn: userEntry?.dn,
        username,
        groupMemberAttribute: memberAttr,
    });
    const attributes = [provider.groupNameAttribute || "cn", memberAttr].filter(Boolean);
    const { searchEntries } = await client.search(provider.groupSearchBaseDN, {
        scope: "sub",
        filter,
        attributes,
        timeLimit: Math.max(1, Math.ceil(Number(provider.searchTimeoutMs || 10000) / 1000)),
    });
    return searchEntries || [];
};

const resolveAdminStatus = async (client, provider, userEntry, username) => {
    const adminTargets = getAdminTargets(provider);
    if (!adminTargets.length) {
        return { isAdmin: false, method: "none", matchedTarget: null };
    }

    const memberOfSet = new Set(normalizeArray(userEntry?.memberOf).map(normalizeDn).filter(Boolean));
    const memberOfMatch = adminTargets.find((adminDn) => memberOfSet.has(adminDn));
    if (memberOfMatch) {
        return { isAdmin: true, method: "memberOf", matchedTarget: memberOfMatch };
    }

    // Only fall back to group search when memberOf is not available.
    if (memberOfSet.size > 0) {
        return { isAdmin: false, method: "memberOf", matchedTarget: null };
    }

    if (!provider.groupSearchBaseDN) {
        return { isAdmin: false, method: "groupSearch", matchedTarget: null };
    }

    const groups = await searchUserGroups(client, provider, userEntry, username);
    for (const group of groups) {
        const groupDn = normalizeDn(group?.dn);
        const groupName = normalizeDn(getGroupName(group, provider.groupNameAttribute));
        if (groupDn && adminTargets.includes(groupDn)) {
            return { isAdmin: true, method: "groupSearch", matchedTarget: groupDn };
        }
        if (groupName && adminTargets.includes(groupName)) {
            return { isAdmin: true, method: "groupSearch", matchedTarget: groupName };
        }
    }

    return { isAdmin: false, method: "groupSearch", matchedTarget: null };
};

const syncOrganizationMemberships = async (accountId, organizationIds = []) => {
    if (!organizationIds.length) return;

    const uniqueOrgIds = [...new Set(
        organizationIds
            .map((orgId) => Number(orgId))
            .filter((orgId) => Number.isInteger(orgId) && orgId > 0)
    )];
    if (!uniqueOrgIds.length) return;

    const organizations = await Organization.findAll({ where: { id: uniqueOrgIds } });
    const existingOrganizationIds = new Set(organizations.map((org) => org.id));

    for (const organizationId of uniqueOrgIds) {
        if (!existingOrganizationIds.has(organizationId)) continue;

        const existingMember = await OrganizationMember.findOne({ where: { organizationId, accountId } });
        if (existingMember) {
            await OrganizationMember.update(
                { status: "active", role: existingMember.role || "member", invitedBy: existingMember.invitedBy || accountId },
                { where: { organizationId, accountId } }
            );
            continue;
        }

        await OrganizationMember.create({
            organizationId,
            accountId,
            role: "member",
            status: "active",
            invitedBy: accountId,
        });
    }
};

const hasOtherEnabledProvider = async (excludeLdapId = null) => {
    const [oidc, ldap] = await Promise.all([
        OIDCProvider.findOne({ where: { enabled: true } }),
        LDAPProvider.findOne({ where: excludeLdapId ? { enabled: true, id: { [require("sequelize").Op.ne]: excludeLdapId } } : { enabled: true } }),
    ]);
    return !!(oidc || ldap);
};

const mapProvider = (p) => ({
    id: p.id, name: p.name, host: p.host, port: p.port, bindDN: p.bindDN, baseDN: p.baseDN,
    userSearchFilter: p.userSearchFilter, usernameAttribute: p.usernameAttribute,
    emailAttribute: p.emailAttribute, firstNameAttribute: p.firstNameAttribute, lastNameAttribute: p.lastNameAttribute,
    organizationIds: p.organizationIds || [], adminGroupDNs: p.adminGroupDNs || [],
    groupSearchBaseDN: p.groupSearchBaseDN, groupSearchFilter: p.groupSearchFilter,
    groupNameAttribute: p.groupNameAttribute, groupMemberAttribute: p.groupMemberAttribute,
    connectionTimeoutMs: p.connectionTimeoutMs, searchTimeoutMs: p.searchTimeoutMs,
    enabled: p.enabled, useTLS: p.useTLS,
});

module.exports.listProviders = async (includeSecret = false) => {
    const providers = await LDAPProvider.findAll();
    return includeSecret ? providers : providers.map(mapProvider);
};

module.exports.getProvider = async (id) => LDAPProvider.findByPk(id);

module.exports.createProvider = async (data) => LDAPProvider.create(data);

module.exports.updateProvider = async (id, data) => {
    const provider = await LDAPProvider.findByPk(id);
    if (!provider) return { code: 404, message: "Provider not found" };

    if (data.enabled === false && provider.enabled) {
        if (!await hasOtherEnabledProvider(id)) {
            return { code: 400, message: "At least one authentication provider must remain enabled" };
        }
    }

    if (data.enabled === true) {
        await Promise.all([
            OIDCProvider.update({ enabled: false }, { where: { isInternal: true } }),
            LDAPProvider.update({ enabled: false }, { where: {} }),
        ]);
    }

    await LDAPProvider.update(data, { where: { id } });
    return provider;
};

module.exports.deleteProvider = async (id) => {
    const provider = await LDAPProvider.findByPk(id);
    if (!provider) return { code: 404, message: "Provider not found" };

    if (provider.enabled && !await hasOtherEnabledProvider(id)) {
        return { code: 400, message: "Cannot delete the only enabled authentication provider" };
    }

    await LDAPProvider.destroy({ where: { id } });
    return { message: "Provider deleted successfully" };
};

module.exports.testConnection = async (id) => {
    const provider = await LDAPProvider.findByPk(id);
    if (!provider) return { code: 404, message: "Provider not found" };

    const client = createLdapClient(provider);
    const startedAt = Date.now();
    try {
        await client.bind(provider.bindDN, provider.bindPassword || "");

        let searchProbe = { attempted: false, success: null, sampleCount: 0, error: null };
        try {
            searchProbe.attempted = true;
            const filter = buildSearchFilter(provider.userSearchFilter, { username: "*" });
            const { searchEntries } = await client.search(provider.baseDN, {
                scope: "sub",
                filter,
                attributes: [provider.usernameAttribute].filter(Boolean),
                sizeLimit: 5,
                timeLimit: Math.max(1, Math.ceil(Number(provider.searchTimeoutMs || 10000) / 1000)),
            });
            searchProbe.success = true;
            searchProbe.sampleCount = Array.isArray(searchEntries) ? searchEntries.length : 0;
        } catch (error) {
            searchProbe.success = false;
            searchProbe.error = error.message;
        }

        return {
            success: true,
            message: "Connection test successful",
            diagnostics: {
                host: provider.host,
                port: provider.port,
                useTLS: provider.useTLS,
                bindDN: provider.bindDN,
                baseDN: provider.baseDN,
                userSearchFilter: provider.userSearchFilter,
                connectionTimeoutMs: Number(provider.connectionTimeoutMs || 10000),
                searchTimeoutMs: Number(provider.searchTimeoutMs || 10000),
                durationMs: Date.now() - startedAt,
                searchProbe,
            },
        };
    } catch (error) {
        logger.error("LDAP connection test failed", { providerId: id, error: error.message });
        return { code: 400, message: `Connection failed: ${error.message}` };
    } finally {
        try { await client.unbind(); } catch {}
    }
};

module.exports.testUsers = async (id, options = {}) => {
    const provider = await LDAPProvider.findByPk(id);
    if (!provider) return { code: 404, message: "Provider not found" };

    const limitRaw = Number.parseInt(options.limit, 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, MAX_LDAP_TEST_USERS)) : MAX_LDAP_TEST_USERS;

    const client = createLdapClient(provider);
    try {
        await client.bind(provider.bindDN, provider.bindPassword || "");

        const attributes = buildUserSearchAttributes(provider);
        const filter = buildSearchFilter(provider.userSearchFilter, { username: "*" });
        const { searchEntries } = await client.search(provider.baseDN, {
            scope: "sub",
            filter,
            attributes,
            sizeLimit: limit,
            timeLimit: Math.max(1, Math.ceil(Number(provider.searchTimeoutMs || 10000) / 1000)),
        });

        const usersByKey = new Map();

        for (const entry of (searchEntries || [])) {
            const username = getAttributeValue(entry, provider.usernameAttribute, "");
            const firstName = getAttributeValue(entry, provider.firstNameAttribute, "");
            const lastName = getAttributeValue(entry, provider.lastNameAttribute, "");
            const email = getAttributeValue(entry, provider.emailAttribute, "");
            const adminResult = await resolveAdminStatus(client, provider, entry, username);

            const userItem = {
                dn: entry.dn || "",
                username,
                firstName,
                lastName,
                email,
                isAdmin: adminResult.isAdmin,
                adminMatchMethod: adminResult.method,
                matchedAdminTarget: adminResult.matchedTarget,
            };
            const dedupeKey = normalizeDn(username || entry.dn || "");
            const existing = usersByKey.get(dedupeKey);
            if (!existing) {
                usersByKey.set(dedupeKey, userItem);
                continue;
            }

            const existingScore = scoreUserItem(existing);
            const nextScore = scoreUserItem(userItem);
            const merged = nextScore > existingScore ? { ...existing, ...userItem } : { ...userItem, ...existing };
            merged.isAdmin = existing.isAdmin || userItem.isAdmin;
            if (!merged.adminMatchMethod) merged.adminMatchMethod = existing.adminMatchMethod || userItem.adminMatchMethod;
            if (!merged.matchedAdminTarget) merged.matchedAdminTarget = existing.matchedAdminTarget || userItem.matchedAdminTarget;
            usersByKey.set(dedupeKey, merged);
        }

        const users = Array.from(usersByKey.values());
        const adminCandidates = users.filter((user) => user.isAdmin);

        return {
            success: true,
            message: "LDAP user test completed",
            users,
            adminCandidates,
            summary: {
                rawEntries: (searchEntries || []).length,
                searchedUsers: users.length,
                adminCandidates: adminCandidates.length,
                limit,
                filter,
            },
        };
    } catch (error) {
        logger.error("LDAP test users failed", { providerId: id, error: error.message });
        return { code: 400, message: `Test users failed: ${error.message}` };
    } finally {
        try { await client.unbind(); } catch {}
    }
};

module.exports.authenticateUser = async (username, password, userInfo) => {
    const provider = await LDAPProvider.findOne({ where: { enabled: true } });
    if (!provider) return null;

    const client = createLdapClient(provider);
    try {
        await client.bind(provider.bindDN, provider.bindPassword || "");

        const attributes = buildUserSearchAttributes(provider);

        const { searchEntries } = await client.search(provider.baseDN, {
            scope: "sub",
            filter: provider.userSearchFilter.replace(/\{\{username\}\}/g, username),
            attributes,
            timeLimit: Math.max(1, Math.ceil(Number(provider.searchTimeoutMs || 10000) / 1000)),
        });

        if (!searchEntries.length) { await client.unbind(); return null; }

        const userEntry = searchEntries[0];
        const userClient = createLdapClient(provider);
        try {
            await userClient.bind(userEntry.dn, password);
        } catch {
            try { await userClient.unbind(); } catch {}
            await client.unbind();
            return null;
        }

        const ldapUsername = getAttributeValue(userEntry, provider.usernameAttribute, username);
        const adminResult = await resolveAdminStatus(client, provider, userEntry, ldapUsername);
        const isAdminByGroup = adminResult.isAdmin;
        await client.unbind();
        try { await userClient.unbind(); } catch {}
        let account = await Account.findOne({ where: { username: String(ldapUsername) } });

        const firstName = getAttributeValue(userEntry, provider.firstNameAttribute, "");
        const lastName = getAttributeValue(userEntry, provider.lastNameAttribute, "");
        const userData = { firstName, lastName };

        if (!account) {
            const hashedPassword = await hash(crypto.randomBytes(16).toString("hex"), await genSalt(10));
            account = await Account.create({
                username: String(ldapUsername),
                password: hashedPassword,
                ...userData,
                role: isAdminByGroup ? "admin" : "user",
                authProviderType: "ldap",
                authProviderName: provider.name,
            });
        } else {
            const updateData = {
                role: isAdminByGroup ? "admin" : "user",
                authProviderType: "ldap",
                authProviderName: provider.name,
            };
            if (firstName) updateData.firstName = firstName;
            if (lastName) updateData.lastName = lastName;
            await Account.update(
                updateData,
                { where: { id: account.id } }
            );
            account = await Account.findByPk(account.id);
        }

        await syncOrganizationMemberships(account.id, provider.organizationIds || []);

        const session = await Session.create({ accountId: account.id, ip: userInfo.ip || "LDAP", userAgent: userInfo.userAgent || "LDAP" });
        logger.system(`User ${account.username} logged in via LDAP`, { accountId: account.id, ip: userInfo.ip });

        return {
            token: session.token,
            user: {
                id: account.id,
                username: account.username,
                firstName: account.firstName,
                lastName: account.lastName,
                role: isAdminByGroup ? "admin" : "user",
                authProviderType: "ldap",
                authProviderName: provider.name,
            },
        };
    } catch (error) {
        logger.error("LDAP authentication failed", { error: error.message });
        try { await client.unbind(); } catch {}
        return null;
    }
};

module.exports.getEnabledProvider = async () => LDAPProvider.findOne({ where: { enabled: true } });
