import { DialogProvider } from "@/common/components/Dialog";
import "./styles.sass";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Input from "@/common/components/IconInput";
import SelectBox from "@/common/components/SelectBox";
import { mdiAccountMultiple, mdiCog, mdiFormTextbox, mdiKey, mdiServer, mdiNumeric, mdiFilter, mdiTestTube } from "@mdi/js";
import Button from "@/common/components/Button";
import ToggleSwitch from "@/common/components/ToggleSwitch";
import { getRequest, patchRequest, postRequest, putRequest } from "@/common/utils/RequestUtil.js";
import { useToast } from "@/common/contexts/ToastContext.jsx";

const defaults = {
    name: "", host: "", port: "389", bindDN: "", bindPassword: "", baseDN: "",
    userSearchFilter: "(uid={{username}})", useTLS: false, usernameAttr: "uid",
    emailAttr: "mail", firstNameAttr: "givenName", lastNameAttr: "sn",
    organizationIds: [], adminGroupDNsText: "", groupSearchBaseDN: "", groupSearchFilter: "(member={{dn}})",
    groupNameAttribute: "cn", groupMemberAttribute: "member", connectionTimeoutMs: "10000", searchTimeoutMs: "10000",
};

export const LDAPProviderDialog = ({ open, onClose, provider, onSave }) => {
    const { t } = useTranslation();
    const { sendToast } = useToast();
    const [form, setForm] = useState(defaults);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testingUsers, setTestingUsers] = useState(false);
    const [organizations, setOrganizations] = useState([]);
    const [connectionTestResult, setConnectionTestResult] = useState(null);
    const [usersTestResult, setUsersTestResult] = useState(null);
    const dialogRef = useRef(null);

    const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));
    const T = (key) => t(`settings.authentication.ldapDialog.${key}`);

    useEffect(() => {
        const loadOrganizations = async () => {
            try {
                const orgs = await getRequest("organizations");
                setOrganizations(Array.isArray(orgs) ? orgs : []);
            } catch (error) {
                console.error("Failed to load organizations", error);
            }
        };
        if (open) loadOrganizations();
    }, [open]);

    useEffect(() => {
        if (provider) {
            setForm({
                name: provider.name, host: provider.host, port: String(provider.port), bindDN: provider.bindDN,
                bindPassword: "********", baseDN: provider.baseDN, userSearchFilter: provider.userSearchFilter,
                useTLS: Boolean(provider.useTLS), usernameAttr: provider.usernameAttribute,
                emailAttr: provider.emailAttribute || "mail",
                firstNameAttr: provider.firstNameAttribute, lastNameAttr: provider.lastNameAttribute,
                organizationIds: provider.organizationIds || [],
                adminGroupDNsText: Array.isArray(provider.adminGroupDNs) ? provider.adminGroupDNs.join("\n") : "",
                groupSearchBaseDN: provider.groupSearchBaseDN || "",
                groupSearchFilter: provider.groupSearchFilter || "(member={{dn}})",
                groupNameAttribute: provider.groupNameAttribute || "cn",
                groupMemberAttribute: provider.groupMemberAttribute || "member",
                connectionTimeoutMs: String(provider.connectionTimeoutMs || 10000),
                searchTimeoutMs: String(provider.searchTimeoutMs || 10000),
            });
        } else setForm(defaults);
        setShowAdvanced(false);
        setConnectionTestResult(null);
        setUsersTestResult(null);
    }, [provider, open]);

    const handleSubmit = async () => {
        try {
            const data = {
                name: form.name, host: form.host, port: parseInt(form.port), bindDN: form.bindDN, baseDN: form.baseDN,
                userSearchFilter: form.userSearchFilter, useTLS: Boolean(form.useTLS), usernameAttribute: form.usernameAttr,
                emailAttribute: form.emailAttr, firstNameAttribute: form.firstNameAttr, lastNameAttribute: form.lastNameAttr,
                organizationIds: form.organizationIds.map((id) => Number(id)).filter((id) => Number.isInteger(id)),
                adminGroupDNs: String(form.adminGroupDNsText || "").split("\n").map((line) => line.trim()).filter(Boolean),
                groupSearchBaseDN: form.groupSearchBaseDN || null,
                groupSearchFilter: form.groupSearchFilter,
                groupNameAttribute: form.groupNameAttribute,
                groupMemberAttribute: form.groupMemberAttribute,
                connectionTimeoutMs: parseInt(form.connectionTimeoutMs || "10000"),
                searchTimeoutMs: parseInt(form.searchTimeoutMs || "10000"),
                ...(form.bindPassword !== "********" && { bindPassword: form.bindPassword }),
            };
            await (provider ? patchRequest(`auth/providers/admin/ldap/${provider.id}`, data) : putRequest("auth/providers/admin/ldap", { ...data, enabled: true }));
            onSave(); onClose();
        } catch (e) { sendToast("Error", e.message || T("messages.saveFailed")); }
    };

    const handleTest = async () => {
        if (!provider) return sendToast("Error", T("messages.saveFirst"));
        setTesting(true);
        try {
            const r = await postRequest(`auth/providers/admin/ldap/${provider.id}/test`);
            if (r.success) {
                setConnectionTestResult(r);
                sendToast(t("common.success"), T("messages.testSuccess"));
                setTimeout(() => {
                    dialogRef.current?.scrollTo({ top: dialogRef.current.scrollHeight, behavior: "smooth" });
                }, 50);
            }
        } catch (e) { sendToast("Error", e.message || T("messages.testFailed")); }
        finally { setTesting(false); }
    };

    const handleTestUsers = async () => {
        if (!provider) return sendToast("Error", T("messages.saveFirst"));
        setTestingUsers(true);
        try {
            const r = await postRequest(`auth/providers/admin/ldap/${provider.id}/test-users`, { limit: 100 });
            if (r.success) {
                setUsersTestResult(r);
                sendToast(t("common.success"), T("messages.testUsersSuccess"));
                setTimeout(() => {
                    dialogRef.current?.scrollTo({ top: dialogRef.current.scrollHeight, behavior: "smooth" });
                }, 50);
            }
        } catch (e) { sendToast("Error", e.message || T("messages.testUsersFailed")); }
        finally { setTestingUsers(false); }
    };

    return (
        <DialogProvider open={open} onClose={onClose}>
            <div className="ldap-provider-dialog" ref={dialogRef}>
                <h2>{provider ? T("editTitle") : T("createTitle")}</h2>

                <div className="form-group">
                    <label>{T("fields.displayName")}</label>
                    <Input icon={mdiFormTextbox} placeholder={T("fields.displayNamePlaceholder")} value={form.name} setValue={set("name")} />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>{T("fields.host")}</label>
                        <Input icon={mdiServer} placeholder={T("fields.hostPlaceholder")} value={form.host} setValue={set("host")} />
                    </div>
                    <div className="form-group port-field">
                        <label>{T("fields.port")}</label>
                        <Input icon={mdiNumeric} type="number" placeholder="389" value={form.port} setValue={set("port")} />
                    </div>
                </div>

                <div className="form-group">
                    <label>{T("fields.bindDN")}</label>
                    <Input icon={mdiAccountMultiple} placeholder={T("fields.bindDNPlaceholder")} value={form.bindDN} setValue={set("bindDN")} />
                </div>

                <div className="form-group">
                    <label>{T("fields.bindPassword")}</label>
                    <Input icon={mdiKey} type="password" placeholder={provider ? T("fields.bindPasswordPlaceholderEdit") : T("fields.bindPasswordPlaceholder")} value={form.bindPassword} setValue={set("bindPassword")} />
                </div>

                <div className="form-group">
                    <label>{T("fields.baseDN")}</label>
                    <Input icon={mdiFormTextbox} placeholder={T("fields.baseDNPlaceholder")} value={form.baseDN} setValue={set("baseDN")} />
                </div>

                <div className="form-group">
                    <label>{T("fields.userSearchFilter")}</label>
                    <Input icon={mdiFilter} placeholder={T("fields.userSearchFilterPlaceholder")} value={form.userSearchFilter} setValue={set("userSearchFilter")} />
                </div>

                <div className="form-group toggle-group">
                    <label>{T("fields.useTLS")}</label>
                    <ToggleSwitch checked={form.useTLS} onChange={set("useTLS")} id="useTLS" />
                </div>

                <div className="form-group">
                    <label>{T("fields.organizations")}</label>
                    <SelectBox
                        multiple
                        searchable
                        options={organizations.map((org) => ({ value: org.id, label: org.name }))}
                        selected={form.organizationIds}
                        setSelected={set("organizationIds")}
                        placeholder={T("fields.organizationsPlaceholder")}
                    />
                </div>

                <div className="form-group">
                    <label>{T("fields.adminGroupDNs")}</label>
                    <textarea
                        className="ldap-textarea"
                        value={form.adminGroupDNsText}
                        onChange={(event) => set("adminGroupDNsText")(event.target.value)}
                        placeholder={T("fields.adminGroupDNsPlaceholder")}
                    />
                </div>

                <div className="advanced-settings">
                    <Button type="secondary" icon={mdiCog} onClick={() => setShowAdvanced(!showAdvanced)} text={showAdvanced ? T("advanced.hide") : T("advanced.show")} />
                    {showAdvanced && (
                        <div className="advanced-form">
                            {[["usernameAttr", "usernameAttribute", mdiAccountMultiple], ["emailAttr", "emailAttribute", mdiFormTextbox], ["firstNameAttr", "firstNameAttribute", mdiFormTextbox], ["lastNameAttr", "lastNameAttribute", mdiFormTextbox]].map(([key, field, icon]) => (
                                <div className="form-group" key={key}>
                                    <label>{T(`fields.${field}`)}</label>
                                    <Input icon={icon} placeholder={T(`fields.${field}Placeholder`)} value={form[key]} setValue={set(key)} />
                                </div>
                            ))}
                            <div className="form-group">
                                <label>{T("fields.groupSearchBaseDN")}</label>
                                <Input icon={mdiFormTextbox} placeholder={T("fields.groupSearchBaseDNPlaceholder")} value={form.groupSearchBaseDN} setValue={set("groupSearchBaseDN")} />
                            </div>
                            <div className="form-group">
                                <label>{T("fields.groupSearchFilter")}</label>
                                <Input icon={mdiFilter} placeholder={T("fields.groupSearchFilterPlaceholder")} value={form.groupSearchFilter} setValue={set("groupSearchFilter")} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{T("fields.groupNameAttribute")}</label>
                                    <Input icon={mdiFormTextbox} placeholder={T("fields.groupNameAttributePlaceholder")} value={form.groupNameAttribute} setValue={set("groupNameAttribute")} />
                                </div>
                                <div className="form-group">
                                    <label>{T("fields.groupMemberAttribute")}</label>
                                    <Input icon={mdiFormTextbox} placeholder={T("fields.groupMemberAttributePlaceholder")} value={form.groupMemberAttribute} setValue={set("groupMemberAttribute")} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{T("fields.connectionTimeoutMs")}</label>
                                    <Input icon={mdiNumeric} type="number" placeholder="10000" value={form.connectionTimeoutMs} setValue={set("connectionTimeoutMs")} />
                                </div>
                                <div className="form-group">
                                    <label>{T("fields.searchTimeoutMs")}</label>
                                    <Input icon={mdiNumeric} type="number" placeholder="10000" value={form.searchTimeoutMs} setValue={set("searchTimeoutMs")} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="button-row">
                    {provider && <Button type="secondary" icon={mdiTestTube} onClick={handleTest} text={testing ? T("actions.testing") : T("actions.testConnection")} disabled={testing} />}
                    {provider && <Button type="secondary" icon={mdiAccountMultiple} onClick={handleTestUsers} text={testingUsers ? T("actions.testingUsers") : T("actions.testUsers")} disabled={testingUsers || testing} />}
                    <Button text={provider ? T("actions.saveChanges") : T("actions.addProvider")} onClick={handleSubmit} />
                </div>

                {provider && connectionTestResult?.diagnostics && (
                    <div className="ldap-test-results">
                        <h3>{T("diagnostics.connectionTitle")}</h3>
                        <div className="diagnostic-grid">
                            <div><span>{T("diagnostics.host")}:</span> {connectionTestResult.diagnostics.host}</div>
                            <div><span>{T("diagnostics.port")}:</span> {connectionTestResult.diagnostics.port}</div>
                            <div><span>{T("diagnostics.tls")}:</span> {connectionTestResult.diagnostics.useTLS ? T("diagnostics.enabled") : T("diagnostics.disabled")}</div>
                            <div><span>{T("diagnostics.baseDN")}:</span> {connectionTestResult.diagnostics.baseDN}</div>
                            <div><span>{T("diagnostics.bindDN")}:</span> {connectionTestResult.diagnostics.bindDN}</div>
                            <div><span>{T("diagnostics.durationMs")}:</span> {connectionTestResult.diagnostics.durationMs}</div>
                            <div><span>{T("diagnostics.searchProbe")}:</span> {connectionTestResult.diagnostics.searchProbe?.attempted ? (connectionTestResult.diagnostics.searchProbe?.success ? T("diagnostics.success") : T("diagnostics.failed")) : T("diagnostics.notRun")}</div>
                            <div><span>{T("diagnostics.searchSampleCount")}:</span> {connectionTestResult.diagnostics.searchProbe?.sampleCount ?? 0}</div>
                        </div>
                        {connectionTestResult.diagnostics.searchProbe?.error && (
                            <p className="diagnostic-error">{connectionTestResult.diagnostics.searchProbe.error}</p>
                        )}
                    </div>
                )}

                {provider && usersTestResult?.success && (
                    <div className="ldap-test-results">
                        <h3>{T("diagnostics.usersTitle")}</h3>
                        <div className="diagnostic-grid">
                            <div><span>{T("diagnostics.rawEntries")}:</span> {usersTestResult.summary?.rawEntries ?? 0}</div>
                            <div><span>{T("diagnostics.usersFound")}:</span> {usersTestResult.summary?.searchedUsers ?? 0}</div>
                            <div><span>{T("diagnostics.adminCandidates")}:</span> {usersTestResult.summary?.adminCandidates ?? 0}</div>
                            <div><span>{T("diagnostics.limit")}:</span> {usersTestResult.summary?.limit ?? 100}</div>
                        </div>

                        <div className="diagnostic-list">
                            <h4>{T("diagnostics.matchedUsers")}</h4>
                            {(usersTestResult.users || []).length === 0 ? (
                                <p>{T("diagnostics.noUsers")}</p>
                            ) : (
                                <ul>
                                    {usersTestResult.users.map((user) => (
                                        <li key={`${user.dn}-${user.username}`}>
                                            <strong>{user.username || "-"}</strong> ({user.firstName || "-"} {user.lastName || "-"}) - {user.dn}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="diagnostic-list">
                            <h4>{T("diagnostics.adminUsers")}</h4>
                            {(usersTestResult.adminCandidates || []).length === 0 ? (
                                <p>{T("diagnostics.noAdminUsers")}</p>
                            ) : (
                                <ul>
                                    {usersTestResult.adminCandidates.map((user) => (
                                        <li key={`admin-${user.dn}-${user.username}`}>
                                            <strong>{user.username || "-"}</strong> - {user.adminMatchMethod} ({user.matchedAdminTarget || "-"})
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DialogProvider>
    );
};