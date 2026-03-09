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

const createDefaultRule = (index) => ({
    id: `rule-${Date.now()}-${index}`,
    enabled: true,
    targetType: "any",
    tagsAny: "",
    deviceRolesAny: "",
    vmRolesAny: "",
    platformsAny: "",
    nameIncludes: "",
    customFieldKey: "",
    customFieldValue: "",
    action: { protocol: "ssh", port: 22, renderer: "terminal" },
});

const csvToArray = (value) => String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const arrayToCsv = (items) => (Array.isArray(items) ? items.join(", ") : "");
const isErrorResponse = (response) => Boolean(
    response?.success === false || (typeof response?.code === "number" && response.code >= 400)
);

export const ProxmoxDialog = ({ open, onClose, currentFolderId, currentOrganizationId, editServerId, initialType = "proxmox" }) => {
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
                    port: Number(defaultPort || (defaultProtocol === "rdp" ? 3389 : 22)),
                    renderer: defaultProtocol === "rdp" || defaultProtocol === "vnc" ? "guac" : "terminal",
                },
                protocolRules: protocolRules.map((rule) => ({
                    ...rule,
                    tagsAny: csvToArray(rule.tagsAny),
                    deviceRolesAny: csvToArray(rule.deviceRolesAny),
                    vmRolesAny: csvToArray(rule.vmRolesAny),
                    platformsAny: csvToArray(rule.platformsAny),
                    action: {
                        protocol: rule.action.protocol,
                        port: Number(rule.action.port || 22),
                        renderer: rule.action.protocol === "rdp" || rule.action.protocol === "vnc" ? "guac" : "terminal",
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
                    setDefaultPort(String(server.defaultAction?.port || 22));
                    setProtocolRules((server.protocolRules || []).map((rule, index) => ({
                        ...createDefaultRule(index),
                        ...rule,
                        tagsAny: arrayToCsv(rule.tagsAny),
                        deviceRolesAny: arrayToCsv(rule.deviceRolesAny),
                        vmRolesAny: arrayToCsv(rule.vmRolesAny),
                        platformsAny: arrayToCsv(rule.platformsAny),
                        action: {
                            protocol: rule?.action?.protocol || "ssh",
                            port: String(rule?.action?.port || 22),
                        },
                    })));
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

    return (
        <DialogProvider open={open} onClose={onClose} isDirty={isDirty}>
            <div className="proxmox-dialog">
                <h2>{editServerId ? t("servers.proxmoxDialog.title.edit") : t("servers.proxmoxDialog.title.import")}</h2>
                {!editServerId && (
                    <div className="form-group">
                        <label htmlFor="type">{t("servers.contextMenu.import")}</label>
                        <select className="small-input select-input" value={type} onChange={(e) => setType(e.target.value)}>
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
                        <div className="ip-row">
                            <div className="form-group">
                                <label htmlFor="syncIntervalMinutes">{t("servers.netboxDialog.fields.syncIntervalMinutes")}</label>
                                <div className="icon-input">
                                    <Icon path={mdiTimerOutline} size={0.85} />
                                    <input className="small-input" id="syncIntervalMinutes" value={syncIntervalMinutes} onChange={(e) => setSyncIntervalMinutes(e.target.value)} />
                                </div>
                            </div>
                            <div className="settings-toggle">
                                <div className="settings-toggle-info">
                                    <span className="settings-toggle-label">
                                        <Icon path={mdiShieldCheckOutline} size={0.8} style={{ marginRight: "8px", verticalAlign: "middle" }} />
                                        {t("servers.netboxDialog.fields.verifyTls")}
                                    </span>
                                </div>
                                <ToggleSwitch checked={verifyTls} onChange={setVerifyTls} id="netbox-tls-toggle" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>{t("servers.netboxDialog.fields.includeDeviceRoles")}</label>
                            <input className="small-input wide-input" value={includeDeviceRoles} onChange={(e) => setIncludeDeviceRoles(e.target.value)} placeholder={t("servers.netboxDialog.placeholders.csv")} />
                        </div>
                        <div className="form-group">
                            <label>{t("servers.netboxDialog.fields.excludeDeviceRoles")}</label>
                            <input className="small-input wide-input" value={excludeDeviceRoles} onChange={(e) => setExcludeDeviceRoles(e.target.value)} placeholder={t("servers.netboxDialog.placeholders.csv")} />
                        </div>
                        <div className="form-group">
                            <label>{t("servers.netboxDialog.fields.includeVmRoles")}</label>
                            <input className="small-input wide-input" value={includeVmRoles} onChange={(e) => setIncludeVmRoles(e.target.value)} placeholder={t("servers.netboxDialog.placeholders.csv")} />
                        </div>
                        <div className="form-group">
                            <label>{t("servers.netboxDialog.fields.excludeVmRoles")}</label>
                            <input className="small-input wide-input" value={excludeVmRoles} onChange={(e) => setExcludeVmRoles(e.target.value)} placeholder={t("servers.netboxDialog.placeholders.csv")} />
                        </div>
                        <div className="form-group">
                            <label>{t("servers.netboxDialog.fields.includeTags")}</label>
                            <input className="small-input wide-input" value={includeTags} onChange={(e) => setIncludeTags(e.target.value)} placeholder={t("servers.netboxDialog.placeholders.csv")} />
                        </div>
                        <div className="form-group">
                            <label>{t("servers.netboxDialog.fields.excludeTags")}</label>
                            <input className="small-input wide-input" value={excludeTags} onChange={(e) => setExcludeTags(e.target.value)} placeholder={t("servers.netboxDialog.placeholders.csv")} />
                        </div>
                        <div className="ip-row">
                            <div className="form-group">
                                <label>{t("servers.netboxDialog.fields.defaultProtocol")}</label>
                                <select className="small-input select-input" value={defaultProtocol} onChange={(e) => setDefaultProtocol(e.target.value)}>
                                    <option value="ssh">SSH</option>
                                    <option value="rdp">RDP</option>
                                    <option value="vnc">VNC</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t("servers.netboxDialog.fields.defaultPort")}</label>
                                <input className="small-input" value={defaultPort} onChange={(e) => setDefaultPort(e.target.value)} />
                            </div>
                        </div>
                        <div className="rules-header">
                            <p>{t("servers.netboxDialog.fields.protocolRules")}</p>
                            <Button text={t("servers.netboxDialog.actions.addRule")} onClick={() => setProtocolRules((prev) => [...prev, createDefaultRule(prev.length)])} />
                        </div>
                        <div className="rules-list">
                            {protocolRules.map((rule, index) => (
                                <div className="rule-card" key={rule.id || index}>
                                    <div className="ip-row">
                                        <div className="form-group">
                                            <label>{t("servers.netboxDialog.fields.targetType")}</label>
                                            <select className="small-input select-input" value={rule.targetType} onChange={(e) => updateRule(index, { targetType: e.target.value })}>
                                                <option value="any">Any</option>
                                                <option value="device">Device</option>
                                                <option value="vm">VM</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>{t("servers.netboxDialog.fields.protocol")}</label>
                                            <select className="small-input select-input" value={rule.action.protocol} onChange={(e) => updateRule(index, { action: { ...rule.action, protocol: e.target.value } })}>
                                                <option value="ssh">SSH</option>
                                                <option value="rdp">RDP</option>
                                                <option value="vnc">VNC</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>{t("servers.netboxDialog.fields.port")}</label>
                                            <input className="small-input" value={rule.action.port} onChange={(e) => updateRule(index, { action: { ...rule.action, port: e.target.value } })} />
                                        </div>
                                    </div>
                                    <input className="small-input wide-input" value={rule.tagsAny} onChange={(e) => updateRule(index, { tagsAny: e.target.value })} placeholder={t("servers.netboxDialog.placeholders.tagsAny")} />
                                    <input className="small-input wide-input" value={rule.deviceRolesAny} onChange={(e) => updateRule(index, { deviceRolesAny: e.target.value })} placeholder={t("servers.netboxDialog.placeholders.deviceRolesAny")} />
                                    <input className="small-input wide-input" value={rule.vmRolesAny} onChange={(e) => updateRule(index, { vmRolesAny: e.target.value })} placeholder={t("servers.netboxDialog.placeholders.vmRolesAny")} />
                                    <input className="small-input wide-input" value={rule.platformsAny} onChange={(e) => updateRule(index, { platformsAny: e.target.value })} placeholder={t("servers.netboxDialog.placeholders.platformsAny")} />
                                    <input className="small-input wide-input" value={rule.nameIncludes} onChange={(e) => updateRule(index, { nameIncludes: e.target.value })} placeholder={t("servers.netboxDialog.placeholders.nameIncludes")} />
                                    <div className="ip-row">
                                        <input className="small-input wide-input" value={rule.customFieldKey || ""} onChange={(e) => updateRule(index, { customFieldKey: e.target.value })} placeholder={t("servers.netboxDialog.placeholders.customFieldKey")} />
                                        <input className="small-input wide-input" value={rule.customFieldValue || ""} onChange={(e) => updateRule(index, { customFieldValue: e.target.value })} placeholder={t("servers.netboxDialog.placeholders.customFieldValue")} />
                                    </div>
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