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
    try {
        await client.bind(provider.bindDN, provider.bindPassword || "");
        await client.unbind();
        return { success: true, message: "Connection test successful" };
    } catch (error) {
        logger.error("LDAP connection test failed", { providerId: id, error: error.message });
        return { code: 400, message: `Connection failed: ${error.message}` };
    }
};

module.exports.authenticateUser = async (username, password, userInfo) => {
    const provider = await LDAPProvider.findOne({ where: { enabled: true } });
    if (!provider) return null;

    const client = createLdapClient(provider);
    try {
        await client.bind(provider.bindDN, provider.bindPassword || "");

        const attributes = [
            provider.usernameAttribute,
            provider.emailAttribute,
            provider.firstNameAttribute,
            provider.lastNameAttribute,
            "memberOf",
        ].filter(Boolean);

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
            await userClient.unbind();
        } catch { await client.unbind(); return null; }

        await client.unbind();

        const ldapUsername = userEntry[provider.usernameAttribute] || username;
        const memberOfSet = new Set(normalizeArray(userEntry.memberOf).map(normalizeDn).filter(Boolean));
        const isAdminByGroup = normalizeArray(provider.adminGroupDNs)
            .map(normalizeDn)
            .filter(Boolean)
            .some((adminDn) => memberOfSet.has(adminDn));
        let account = await Account.findOne({ where: { username: String(ldapUsername) } });

        const userData = {
            firstName: String(userEntry[provider.firstNameAttribute] || ""),
            lastName: String(userEntry[provider.lastNameAttribute] || ""),
        };

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
            await Account.update(
                {
                    ...userData,
                    role: isAdminByGroup ? "admin" : account.role,
                    authProviderType: "ldap",
                    authProviderName: provider.name,
                },
                { where: { id: account.id } }
            );
        }

        await syncOrganizationMemberships(account.id, provider.organizationIds || []);

        const session = await Session.create({ accountId: account.id, ip: userInfo.ip || "LDAP", userAgent: userInfo.userAgent || "LDAP" });
        logger.system(`User ${account.username} logged in via LDAP`, { accountId: account.id, ip: userInfo.ip });

        return {
            token: session.token,
            user: {
                id: account.id,
                username: account.username,
                ...userData,
                role: isAdminByGroup ? "admin" : account.role,
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
