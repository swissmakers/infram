import { DialogProvider } from "@/common/components/Dialog";
import "./styles.sass";
import { useContext, useEffect, useState, useRef } from "react";
import { ServerContext } from "@/common/contexts/ServerContext.jsx";
import IconInput from "@/common/components/IconInput";
import { mdiAccountCircleOutline, mdiChartLine, mdiFormTextbox, mdiIp, mdiLockOutline, mdiLinkVariant, mdiShieldCheckOutline, mdiTimerOutline } from "@mdi/js";
import Button from "@/common/components/Button";
import Input from "@/common/components/IconInput";
import { getRequest, patchRequest, postRequest, putRequest } from "@/common/utils/RequestUtil.js";
import { useTranslation } from "react-i18next";
import { useToast } from "@/common/contexts/ToastContext.jsx";
import ToggleSwitch from "@/common/components/ToggleSwitch";
import Icon from "@mdi/react";

const DEFAULT_PROTOCOL_PORTS = {
    ssh: 22,
    rdp: 3389,
    vnc: 5900,
};

const getDefaultPortForProtocol = (protocol) => DEFAULT_PROTOCOL_PORTS[protocol] || 22;

const createDefaultRule = (index) => ({
    id: `rule-${Date.now()}-${index}`,
    enabled: true,
    targetType: "any",
    matchType: "label",
    matchValue: "",
    tagsAny: "",
    deviceRolesAny: "",
    vmRolesAny: "",
    platformsAny: "",
    nameIncludes: "",
    customFieldKey: "",
    customFieldValue: "",
    action: { protocol: "ssh", port: String(getDefaultPortForProtocol("ssh")), renderer: "terminal" },
});

const csvToArray = (value) => String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const arrayToCsv = (items) => (Array.isArray(items) ? items.join(", ") : "");

const getRuleConditionFromServerRule = (rule = {}) => {
    if (rule.customFieldKey || rule.customFieldValue) {
        return {
            matchType: "customField",
            matchValue: "",
            customFieldKey: rule.customFieldKey || "",
            customFieldValue: rule.customFieldValue || "",
        };
    }
    if ((rule.tagsAny || []).length) return { matchType: "label", matchValue: arrayToCsv(rule.tagsAny) };
    if ((rule.deviceRolesAny || []).length) return { matchType: "deviceRole", matchValue: arrayToCsv(rule.deviceRolesAny) };
    if ((rule.vmRolesAny || []).length) return { matchType: "vmRole", matchValue: arrayToCsv(rule.vmRolesAny) };
    if ((rule.platformsAny || []).length) return { matchType: "platform", matchValue: arrayToCsv(rule.platformsAny) };
    if (rule.nameIncludes) return { matchType: "nameIncludes", matchValue: rule.nameIncludes };
    return { matchType: "label", matchValue: "" };
};

const mapRuleConditionToPayload = (rule = {}) => {
    const condition = {
        tagsAny: [],
        deviceRolesAny: [],
        vmRolesAny: [],
        platformsAny: [],
        nameIncludes: "",
        customFieldKey: "",
        customFieldValue: "",
    };

    switch (rule.matchType) {
        case "deviceRole":
            condition.deviceRolesAny = csvToArray(rule.matchValue);
            break;
        case "vmRole":
            condition.vmRolesAny = csvToArray(rule.matchValue);
            break;
        case "platform":
            condition.platformsAny = csvToArray(rule.matchValue);
            break;
        case "nameIncludes":
            condition.nameIncludes = String(rule.matchValue || "").trim();
            break;
        case "customField":
            condition.customFieldKey = String(rule.customFieldKey || "").trim();
            condition.customFieldValue = String(rule.customFieldValue || "").trim();
            break;
        case "label":
        default:
            condition.tagsAny = csvToArray(rule.matchValue);
            break;
    }

    return condition;
};

const hasRuleCondition = (rule = {}) => {
    const matchType = rule.matchType || "label";
    if (matchType === "customField") {
        return Boolean(String(rule.customFieldKey || "").trim() && String(rule.customFieldValue || "").trim());
    }
    if (matchType === "nameIncludes") {
        return Boolean(String(rule.matchValue || "").trim());
    }
    return csvToArray(rule.matchValue).length > 0;
};

const mapServerRuleToUiRule = (rule, index) => ({
    ...createDefaultRule(index),
    ...rule,
    ...getRuleConditionFromServerRule(rule),
    action: {
        protocol: rule?.action?.protocol || "ssh",
        port: String(rule?.action?.port || getDefaultPortForProtocol(rule?.action?.protocol || "ssh")),
    },
});
const isErrorResponse = (response) => Boolean(
    response?.success === false || (typeof response?.code === "number" && response.code >= 400)
);

export const IntegrationDialog = ({ open, onClose, currentFolderId, currentOrganizationId, editServerId, initialType = "proxmox" }) => {
    const { t } = useTranslation();
    const { sendToast } = useToast();
    const { loadServers } = useContext(ServerContext);

    const [type, setType] = useState(initialType);

    const [name, setName] = useState("");
    const [ip, setIp] = useState("");
    const [port, setPort] = useState("8006");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [monitoringEnabled, setMonitoringEnabled] = useState(false);
    const [apiUrl, setApiUrl] = useState("");
    const [apiToken, setApiToken] = useState("");
    const [verifyTls, setVerifyTls] = useState(true);
    const [syncIntervalMinutes, setSyncIntervalMinutes] = useState("15");
    const [includeDeviceRoles, setIncludeDeviceRoles] = useState("");
    const [excludeDeviceRoles, setExcludeDeviceRoles] = useState("");
    const [includeVmRoles, setIncludeVmRoles] = useState("");
    const [excludeVmRoles, setExcludeVmRoles] = useState("");
    const [includeTags, setIncludeTags] = useState("");
    const [excludeTags, setExcludeTags] = useState("");
    const [defaultProtocol, setDefaultProtocol] = useState("ssh");
    const [defaultPort, setDefaultPort] = useState("22");
    const [protocolRules, setProtocolRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const initialValues = useRef({});
    const rulesListRef = useRef(null);

    const buildPayload = () => {
        if (type === "netbox") {
            return {
                type,
                name,
                folderId: currentFolderId,
                organizationId: currentOrganizationId,
                apiUrl,
                apiToken,
                verifyTls,
                syncIntervalMinutes: Number(syncIntervalMinutes || 15),
                includeDeviceRoles: csvToArray(includeDeviceRoles),
                excludeDeviceRoles: csvToArray(excludeDeviceRoles),
                includeVmRoles: csvToArray(includeVmRoles),
                excludeVmRoles: csvToArray(excludeVmRoles),
                includeTags: csvToArray(includeTags),
                excludeTags: csvToArray(excludeTags),
                defaultAction: {
                    protocol: defaultProtocol,
                    port: Number(defaultPort || getDefaultPortForProtocol(defaultProtocol)),
                    renderer: defaultProtocol === "rdp" || defaultProtocol === "vnc" ? "guac" : "terminal",
                },
                protocolRules: protocolRules
                    .filter((rule) => hasRuleCondition(rule))
                    .map((rule) => ({
                    id: rule.id,
                    enabled: rule.enabled !== false,
                    targetType: rule.targetType || "any",
                    ...mapRuleConditionToPayload(rule),
                    action: {
                        protocol: rule.action?.protocol || "ssh",
                        port: Number(rule.action?.port || getDefaultPortForProtocol(rule.action?.protocol || "ssh")),
                        renderer: (rule.action?.protocol === "rdp" || rule.action?.protocol === "vnc") ? "guac" : "terminal",
                    },
                })),
            };
        }

        return {
            type,
            name,
            folderId: currentFolderId,
            organizationId: currentOrganizationId,
            ip,
            port,
            username,
            password,
            monitoringEnabled,
        };
    };

    const create = () => {
        setLoading(true);
        putRequest("integrations", buildPayload()).then(async (response) => {
            if (isErrorResponse(response)) {
                sendToast("Error", response.message);
                setLoading(false);
                return;
            }
            if (isErrorResponse(response.sync)) {
                sendToast("Error", response.sync?.message || t("servers.integrationMessages.syncFailed"));
            }
            sendToast("Success", t("servers.proxmoxDialog.messages.created"));
            onClose();
            loadServers();
            setLoading(false);
        }).catch(err => {
            sendToast("Error", err.message || t("servers.proxmoxDialog.messages.createFailed"));
            console.error(err);
            setLoading(false);
        });
    };

    const saveEdit = async ({ closeAfterSave = false, showSuccessToast = true } = {}) => {
        setLoading(true);
        const payload = buildPayload();
        if (type === "proxmox" && password === "********") delete payload.password;
        if (type === "netbox" && apiToken === "********") delete payload.apiToken;

        try {
            const response = await patchRequest(`integrations/${editServerId}`, payload);
            if (isErrorResponse(response)) {
                sendToast("Error", response.message);
                setLoading(false);
                return false;
            }
            if (isErrorResponse(response.sync)) {
                sendToast("Error", response.sync?.message || t("servers.integrationMessages.syncFailed"));
            }
            if (showSuccessToast) {
                sendToast("Success", t("servers.proxmoxDialog.messages.updated"));
            }
            if (closeAfterSave) onClose();
            await loadServers();
            setLoading(false);
            return true;
        } catch (err) {
            sendToast("Error", err.message || t("servers.proxmoxDialog.messages.updateFailed"));
            console.error(err);
            setLoading(false);
            return false;
        }
    };

    const edit = () => saveEdit({ closeAfterSave: true, showSuccessToast: true });

    const resetForm = () => {
        setType(initialType || "proxmox");
        setName("");
        setIp("");
        setPort("8006");
        setUsername("");
        setPassword("");
        setMonitoringEnabled(false);
        setApiUrl("");
        setApiToken("");
        setVerifyTls(true);
        setSyncIntervalMinutes("15");
        setIncludeDeviceRoles("");
        setExcludeDeviceRoles("");
        setIncludeVmRoles("");
        setExcludeVmRoles("");
        setIncludeTags("");
        setExcludeTags("");
        setDefaultProtocol("ssh");
        setDefaultPort("22");
        setProtocolRules([]);
        initialValues.current = {};
    };

    useEffect(() => {
        if (editServerId && open) {
            getRequest(`integrations/${editServerId}`).then(server => {
                setType(server.type || "proxmox");
                setName(server.name);
                if ((server.type || "proxmox") === "netbox") {
                    setApiUrl(server.apiUrl || "");
                    setApiToken("********");
                    setVerifyTls(server.verifyTls !== false);
                    setSyncIntervalMinutes(String(server.syncIntervalMinutes || 15));
                    setIncludeDeviceRoles(arrayToCsv(server.includeDeviceRoles));
                    setExcludeDeviceRoles(arrayToCsv(server.excludeDeviceRoles));
                    setIncludeVmRoles(arrayToCsv(server.includeVmRoles));
                    setExcludeVmRoles(arrayToCsv(server.excludeVmRoles));
                    setIncludeTags(arrayToCsv(server.includeTags));
                    setExcludeTags(arrayToCsv(server.excludeTags));
                    setDefaultProtocol(server.defaultAction?.protocol || "ssh");
                    setDefaultPort(String(server.defaultAction?.port || getDefaultPortForProtocol(server.defaultAction?.protocol || "ssh")));
                    const sanitizedRules = (server.protocolRules || [])
                        .map((rule, index) => mapServerRuleToUiRule(rule, index))
                        .filter((rule) => hasRuleCondition(rule));
                    setProtocolRules(sanitizedRules);
                } else {
                    setIp(server.ip || "");
                    setPort(String(server.port || "8006"));
                    setUsername(server.username || "");
                    setPassword("********");
                    setMonitoringEnabled(server.monitoringEnabled || false);
                }
                initialValues.current = {
                    ...server,
                    apiToken: "********",
                    password: "********",
                };
            }).catch(err => {
                sendToast("Error", err.message || t("servers.integrationMessages.loadFailed"));
                console.error(err);
            });
        } else {
            resetForm();
        }
        setLoading(false);
    }, [editServerId, open, initialType]);

    const isDirty = JSON.stringify(buildPayload()) !== JSON.stringify({
        ...(initialValues.current || {}),
        folderId: currentFolderId,
        organizationId: currentOrganizationId,
    });

    const updateRule = (index, updates) => {
        setProtocolRules((prev) => prev.map((rule, idx) => idx === index ? { ...rule, ...updates } : rule));
    };

    const addProtocolRule = () => {
        setProtocolRules((prev) => [...prev, createDefaultRule(prev.length)]);
        // New rules are appended; scroll so the user sees it immediately.
        setTimeout(() => {
            if (!rulesListRef.current) return;
            rulesListRef.current.scrollTop = rulesListRef.current.scrollHeight;
        }, 0);
    };

    const runIntegrationAction = async (action) => {
        if (!editServerId) {
            sendToast("Error", t("servers.integrationMessages.saveFirst"));
            return;
        }

        setActionLoading(true);
        try {
            if (isDirty) {
                const saved = await saveEdit({ closeAfterSave: false, showSuccessToast: false });
                if (!saved) return;
            }
            const endpoint = action === "test"
                ? `integrations/${editServerId}/test`
                : `integrations/${editServerId}/sync`;
            const response = await postRequest(endpoint, {});
            if (isErrorResponse(response)) {
                sendToast("Error", response.message || t("servers.integrationMessages.operationFailed"));
                return;
            }
            sendToast("Success", response?.message || t("servers.integrationMessages.operationSucceeded"));
            if (action === "sync") {
                loadServers();
            }
        } catch (error) {
            sendToast("Error", error.message || t("servers.integrationMessages.operationFailed"));
        } finally {
            setActionLoading(false);
        }
    };

    const titleScope = type === "netbox" ? "servers.netboxDialog.title" : "servers.proxmoxDialog.title";
    const titleKey = editServerId ? `${titleScope}.edit` : `${titleScope}.import`;

    return (
        <DialogProvider open={open} onClose={onClose} isDirty={isDirty}>
            <div className="integration-dialog">
                <h2>{t(titleKey)}</h2>
                {!editServerId && (
                    <div className="form-group">
                        <label htmlFor="type">{t("servers.contextMenu.import")}</label>
                        <select id="type" className="small-input select-input" value={type} onChange={(e) => setType(e.target.value)}>
                            <option value="proxmox">Proxmox</option>
                            <option value="netbox">NetBox</option>
                        </select>
                    </div>
                )}
                <div className="form-group">
                    <label htmlFor="name">{t("servers.proxmoxDialog.fields.name")}</label>
                    <IconInput icon={mdiFormTextbox} value={name} setValue={setName} placeholder={t("servers.proxmoxDialog.placeholders.name")} id="name" />
                </div>

                {type === "proxmox" && (
                    <>
                        <div className="ip-row">
                            <div className="form-group">
                                <label htmlFor="ip">{t("servers.proxmoxDialog.fields.serverIp")}</label>
                                <Input icon={mdiIp} type="text" placeholder={t("servers.proxmoxDialog.placeholders.serverIp")} id="ip"
                                    autoComplete="off" value={ip} setValue={setIp} />
                            </div>

                            <div className="form-group">
                                <label htmlFor="port">{t("servers.proxmoxDialog.fields.port")}</label>
                                <input type="text" placeholder={t("servers.proxmoxDialog.placeholders.port")} value={port}
                                    onChange={(event) => setPort(event.target.value)}
                                    className="small-input" id="port" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="username">{t("servers.proxmoxDialog.fields.username")}</label>
                            <IconInput icon={mdiAccountCircleOutline} value={username} setValue={setUsername}
                                placeholder={t("servers.proxmoxDialog.placeholders.username")} id="username" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">{t("servers.proxmoxDialog.fields.password")}</label>
                            <IconInput icon={mdiLockOutline} value={password} setValue={setPassword} placeholder={t("servers.proxmoxDialog.placeholders.password")}
                                type="password" id="password" />
                        </div>

                        <div className="settings-toggle">
                            <div className="settings-toggle-info">
                                <span className="settings-toggle-label">
                                    <Icon path={mdiChartLine} size={0.8} style={{ marginRight: "8px", verticalAlign: "middle" }} />
                                    {t("servers.proxmoxDialog.fields.monitoring")}
                                </span>
                                <span className="settings-toggle-description">
                                    {t("servers.proxmoxDialog.monitoringDescription")}
                                </span>
                            </div>
                            <ToggleSwitch checked={monitoringEnabled} onChange={setMonitoringEnabled} id="pve-monitoring-toggle" />
                        </div>
                    </>
                )}

                {type === "netbox" && (
                    <>
                        <div className="form-group">
                            <label htmlFor="apiUrl">{t("servers.netboxDialog.fields.apiUrl")}</label>
                            <IconInput icon={mdiLinkVariant} value={apiUrl} setValue={setApiUrl} placeholder={t("servers.netboxDialog.placeholders.apiUrl")} id="apiUrl" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="apiToken">{t("servers.netboxDialog.fields.apiToken")}</label>
                            <IconInput icon={mdiLockOutline} value={apiToken} setValue={setApiToken} placeholder={t("servers.netboxDialog.placeholders.apiToken")}
                                type="password" id="apiToken" />
                        </div>
                        <div className="ip-row netbox-sync-row">
                            <div className="form-group">
                                <label htmlFor="syncIntervalMinutes">{t("servers.netboxDialog.fields.syncIntervalMinutes")}</label>
                                <div className="icon-input">
                                    <Icon path={mdiTimerOutline} size={0.85} />
                                    <input className="small-input" id="syncIntervalMinutes" value={syncIntervalMinutes} onChange={(e) => setSyncIntervalMinutes(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group netbox-toggle-group">
                                <label htmlFor="netbox-tls-toggle">{t("servers.netboxDialog.fields.verifyTls")}</label>
                                <div className="inline-toggle-input">
                                    <span className="inline-toggle-label">
                                        <Icon path={mdiShieldCheckOutline} size={0.8} />
                                        {verifyTls ? t("servers.netboxDialog.tlsEnabled") : t("servers.netboxDialog.tlsDisabled")}
                                    </span>
                                    <ToggleSwitch checked={verifyTls} onChange={setVerifyTls} id="netbox-tls-toggle" />
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="includeDeviceRoles">{t("servers.netboxDialog.fields.includeDeviceRoles")}</label>
                            <input id="includeDeviceRoles" className="small-input wide-input" value={includeDeviceRoles} onChange={(e) => setIncludeDeviceRoles(e.target.value)} placeholder={t("servers.netboxDialog.placeholders.csv")} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="excludeDeviceRoles">{t("servers.netboxDialog.fields.excludeDeviceRoles")}</label>
                            <input id="excludeDeviceRoles" className="small-input wide-input" value={excludeDeviceRoles} onChange={(e) => setExcludeDeviceRoles(e.target.value)} placeholder={t("servers.netboxDialog.placeholders.csv")} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="includeVmRoles">{t("servers.netboxDialog.fields.includeVmRoles")}</label>
                            <input id="includeVmRoles" className="small-input wide-input" value={includeVmRoles} onChange={(e) => setIncludeVmRoles(e.target.value)} placeholder={t("servers.netboxDialog.placeholders.csv")} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="excludeVmRoles">{t("servers.netboxDialog.fields.excludeVmRoles")}</label>
                            <input id="excludeVmRoles" className="small-input wide-input" value={excludeVmRoles} onChange={(e) => setExcludeVmRoles(e.target.value)} placeholder={t("servers.netboxDialog.placeholders.csv")} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="includeTags">{t("servers.netboxDialog.fields.includeTags")}</label>
                            <input id="includeTags" className="small-input wide-input" value={includeTags} onChange={(e) => setIncludeTags(e.target.value)} placeholder={t("servers.netboxDialog.placeholders.csv")} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="excludeTags">{t("servers.netboxDialog.fields.excludeTags")}</label>
                            <input id="excludeTags" className="small-input wide-input" value={excludeTags} onChange={(e) => setExcludeTags(e.target.value)} placeholder={t("servers.netboxDialog.placeholders.csv")} />
                        </div>
                        <div className="ip-row">
                            <div className="form-group">
                                <label htmlFor="defaultProtocol">{t("servers.netboxDialog.fields.defaultProtocol")}</label>
                                <select id="defaultProtocol" className="small-input select-input" value={defaultProtocol} onChange={(e) => {
                                    const protocol = e.target.value;
                                    setDefaultProtocol(protocol);
                                    setDefaultPort(String(getDefaultPortForProtocol(protocol)));
                                }}>
                                    <option value="ssh">SSH</option>
                                    <option value="rdp">RDP</option>
                                    <option value="vnc">VNC</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="defaultPort">{t("servers.netboxDialog.fields.defaultPort")}</label>
                                <input id="defaultPort" className="small-input" value={defaultPort} onChange={(e) => setDefaultPort(e.target.value)} />
                            </div>
                        </div>
                        <div className="rules-header">
                            <p>{t("servers.netboxDialog.fields.protocolRules")}</p>
                            <Button text={t("servers.netboxDialog.actions.addRule")} onClick={addProtocolRule} />
                        </div>
                        <p className="rules-helper">{t("servers.netboxDialog.rulesHelper")}</p>
                        <div className="rules-list" ref={rulesListRef}>
                            {protocolRules.length === 0 && (
                                <div className="rules-empty">
                                    {t("servers.netboxDialog.actions.addRule")}
                                </div>
                            )}
                            {protocolRules.map((rule, index) => (
                                <div className="rule-card" key={rule.id || index}>
                                    <div className="ip-row rule-grid">
                                        <div className="form-group">
                                            <label htmlFor={`rule-${index}-targetType`}>{t("servers.netboxDialog.fields.targetType")}</label>
                                            <select id={`rule-${index}-targetType`} className="small-input select-input" value={rule.targetType} onChange={(e) => updateRule(index, { targetType: e.target.value })}>
                                                <option value="any">Any</option>
                                                <option value="device">Device</option>
                                                <option value="vm">VM</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor={`rule-${index}-matchType`}>{t("servers.netboxDialog.fields.conditionType")}</label>
                                            <select id={`rule-${index}-matchType`} className="small-input select-input" value={rule.matchType || "label"} onChange={(e) => updateRule(index, { matchType: e.target.value })}>
                                                <option value="label">{t("servers.netboxDialog.matchTypes.label")}</option>
                                                <option value="deviceRole">{t("servers.netboxDialog.matchTypes.deviceRole")}</option>
                                                <option value="vmRole">{t("servers.netboxDialog.matchTypes.vmRole")}</option>
                                                <option value="platform">{t("servers.netboxDialog.matchTypes.platform")}</option>
                                                <option value="nameIncludes">{t("servers.netboxDialog.matchTypes.nameIncludes")}</option>
                                                <option value="customField">{t("servers.netboxDialog.matchTypes.customField")}</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor={`rule-${index}-protocol`}>{t("servers.netboxDialog.fields.protocol")}</label>
                                            <select id={`rule-${index}-protocol`} className="small-input select-input" value={rule.action.protocol} onChange={(e) => {
                                                const protocol = e.target.value;
                                                updateRule(index, { action: { ...rule.action, protocol, port: String(getDefaultPortForProtocol(protocol)) } });
                                            }}>
                                                <option value="ssh">SSH</option>
                                                <option value="rdp">RDP</option>
                                                <option value="vnc">VNC</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor={`rule-${index}-port`}>{t("servers.netboxDialog.fields.port")}</label>
                                            <input id={`rule-${index}-port`} className="small-input" value={rule.action.port} onChange={(e) => updateRule(index, { action: { ...rule.action, port: e.target.value } })} />
                                        </div>
                                    </div>
                                    {rule.matchType !== "customField" && (
                                        <div className="form-group">
                                            <label htmlFor={`rule-${index}-matchValue`}>{t("servers.netboxDialog.fields.conditionValue")}</label>
                                            <input
                                                id={`rule-${index}-matchValue`}
                                                className="small-input wide-input"
                                                value={rule.matchValue || ""}
                                                onChange={(e) => updateRule(index, { matchValue: e.target.value })}
                                                placeholder={t("servers.netboxDialog.placeholders.matchValue")}
                                            />
                                        </div>
                                    )}
                                    {rule.matchType === "customField" && (
                                        <div className="ip-row rule-custom-field-row">
                                            <div className="form-group">
                                                <label htmlFor={`rule-${index}-customFieldKey`}>{t("servers.netboxDialog.fields.customFieldKey")}</label>
                                                <input id={`rule-${index}-customFieldKey`} className="small-input wide-input" value={rule.customFieldKey || ""} onChange={(e) => updateRule(index, { customFieldKey: e.target.value })} placeholder={t("servers.netboxDialog.placeholders.customFieldKey")} />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor={`rule-${index}-customFieldValue`}>{t("servers.netboxDialog.fields.customFieldValue")}</label>
                                                <input id={`rule-${index}-customFieldValue`} className="small-input wide-input" value={rule.customFieldValue || ""} onChange={(e) => updateRule(index, { customFieldValue: e.target.value })} placeholder={t("servers.netboxDialog.placeholders.customFieldValue")} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="rule-actions">
                                        <Button text={t("servers.netboxDialog.actions.removeRule")} onClick={() => setProtocolRules((prev) => prev.filter((_, idx) => idx !== index))} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {editServerId && (
                    <div className="integration-actions">
                        <Button
                            onClick={() => runIntegrationAction("test")}
                            text={t("servers.integrationMessages.testConnection")}
                            disabled={actionLoading || loading}
                        />
                        <Button
                            onClick={() => runIntegrationAction("sync")}
                            text={t("servers.integrationMessages.syncNow")}
                            disabled={actionLoading || loading}
                        />
                    </div>
                )}

                <Button onClick={editServerId ? edit : create} text={editServerId ? t("servers.proxmoxDialog.actions.edit") : t("servers.proxmoxDialog.actions.import")} disabled={loading || actionLoading} />

            </div>
        </DialogProvider>
    );
};

export default IntegrationDialog;
