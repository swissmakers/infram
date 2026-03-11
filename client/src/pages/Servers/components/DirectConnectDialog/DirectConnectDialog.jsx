import { DialogProvider } from "@/common/components/Dialog";
import "./styles.sass";
import { useContext, useEffect, useState, useCallback, useMemo } from "react";
import Button from "@/common/components/Button";
import { useToast } from "@/common/contexts/ToastContext.jsx";
import { useTranslation } from "react-i18next";
import {
    mdiAccountCircleOutline,
    mdiFileUploadOutline,
    mdiLockOutline,
} from "@mdi/js";
import Input from "@/common/components/IconInput";
import SelectBox from "@/common/components/SelectBox";
import { getFieldConfig } from "@/pages/Servers/components/ServerDialog/utils/fieldConfig.js";
import { IdentityContext } from "@/common/contexts/IdentityContext.jsx";
import { UserContext } from "@/common/contexts/UserContext.jsx";

export const DirectConnectDialog = ({ open, onClose, onConnect, server }) => {
    const { t } = useTranslation();
    const { sendToast } = useToast();
    const { personalIdentities, organizationIdentities, getOrganizationIdentities, loadIdentities } = useContext(IdentityContext);
    const { user } = useContext(UserContext);

    const protocol = server?.config?.protocol;
    const fieldConfig = useMemo(() => getFieldConfig("server", protocol), [protocol]);
    const allowedAuthTypes = fieldConfig.allowedAuthTypes || ["password", "ssh"];
    const defaultAuthType = allowedAuthTypes[0] || "password";

    const [username, setUsername] = useState("");
    const [authType, setAuthType] = useState(defaultAuthType);
    const [password, setPassword] = useState("");
    const [sshKey, setSshKey] = useState(null);
    const [passphrase, setPassphrase] = useState("");
    const [mode, setMode] = useState("manual");
    const [selectedIdentityId, setSelectedIdentityId] = useState(null);

    const authOptions = [
        { label: t("servers.dialog.identities.userPassword"), value: "password" },
        { label: t("servers.dialog.identities.sshKey"), value: "ssh" },
    ].filter((option) => allowedAuthTypes.includes(option.value));

    const parseOrganizationId = (value) => {
        if (typeof value === "number" && Number.isInteger(value)) return value;
        if (typeof value !== "string") return null;

        const numeric = Number(value);
        if (Number.isInteger(numeric)) return numeric;

        const match = value.match(/(\d+)$/);
        return match ? Number(match[1]) : null;
    };

    const serverOrganizationId = parseOrganizationId(server?.organizationId);

    const savedIdentities = useMemo(() => {
        // Fallback to all accessible organization identities if the server object
        // does not provide a resolvable organizationId.
        const orgIdentities = serverOrganizationId
            ? getOrganizationIdentities(serverOrganizationId)
            : organizationIdentities;

        return [...personalIdentities, ...orgIdentities]
            .filter((identity) => allowedAuthTypes.includes(identity.type));
    }, [allowedAuthTypes, getOrganizationIdentities, organizationIdentities, personalIdentities, serverOrganizationId]);

    const savedIdentityOptions = useMemo(() => (
        savedIdentities.map((identity) => ({
            label: `${identity.name}${identity.scope === "organization" ? ` (${t("servers.directConnect.organizationIdentity")})` : ` (${t("servers.directConnect.personalIdentity")})`}`,
            value: identity.id,
        }))
    ), [savedIdentities, t]);

    const selectedIdentity = useMemo(() => (
        savedIdentities.find((identity) => identity.id === selectedIdentityId) || null
    ), [savedIdentities, selectedIdentityId]);

    const preferredPersonalIdentity = useMemo(() => {
        const personalAuthIdentities = savedIdentities.filter((identity) => (
            identity.scope === "personal" && (identity.type === "ssh" || identity.type === "password")
        ));
        if (personalAuthIdentities.length === 0) return null;

        const normalizedUsername = (user?.username || "").trim().toLowerCase();
        if (normalizedUsername) {
            const usernameMatches = personalAuthIdentities.filter((identity) => (
                (identity.username || "").trim().toLowerCase() === normalizedUsername
            ));
            if (usernameMatches.length > 0) {
                return usernameMatches.find((identity) => identity.type === "ssh") || usernameMatches[0];
            }
        }

        return personalAuthIdentities.find((identity) => identity.type === "ssh") || personalAuthIdentities[0];
    }, [savedIdentities, user?.username]);

    const readFile = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            setSshKey(e.target.result);
        };
        reader.readAsText(file);
    };

    const validateFields = useCallback(() => {
        if (mode === "saved") {
            if (savedIdentities.length === 0) {
                sendToast("Error", t("servers.directConnect.messages.noIdentitiesAvailable"));
                return false;
            }
            if (!selectedIdentityId) {
                sendToast("Error", t("servers.directConnect.messages.identityRequired"));
                return false;
            }
            return true;
        }

        if (!username) {
            sendToast("Error", t("servers.messages.usernameRequired") || "Username is required");
            return false;
        }

        if (authType === "password" && !password) {
            sendToast("Error", t("servers.messages.passwordRequired") || "Password is required");
            return false;
        }

        if (authType === "ssh" && !sshKey) {
            sendToast("Error", t("servers.messages.sshKeyRequired") || "SSH key is required");
            return false;
        }

        return true;
    }, [mode, savedIdentities.length, selectedIdentityId, authType, username, password, sshKey, sendToast, t]);

    const handleConnect = useCallback(() => {
        if (!validateFields()) return;

        if (mode === "saved") {
            onConnect({ identityId: selectedIdentityId });
            onClose();
            return;
        }

        const directIdentity = {
            username,
            type: authType,
            ...(authType === "password"
                ? { password }
                : { sshKey, passphrase: passphrase || undefined }
            ),
        };

        onConnect({ directIdentity });
        onClose();
    }, [validateFields, mode, selectedIdentityId, username, authType, password, sshKey, passphrase, onConnect, onClose]);

    useEffect(() => {
        if (!open) return;

        loadIdentities();
        setUsername(user?.username || "");
        setAuthType(defaultAuthType);
        setPassword("");
        setSshKey(null);
        setPassphrase("");
        setMode("manual");
        setSelectedIdentityId(null);
    }, [open, defaultAuthType, loadIdentities, user?.username]);

    useEffect(() => {
        if (!open || selectedIdentityId || mode !== "manual" || !preferredPersonalIdentity) return;

        setMode("saved");
        setSelectedIdentityId(preferredPersonalIdentity.id);
    }, [mode, open, preferredPersonalIdentity, selectedIdentityId]);

    useEffect(() => {
        if (!open) return;

        const submitOnEnter = (event) => {
            if (event.key === "Enter") {
                handleConnect();
            }
        };

        document.addEventListener("keydown", submitOnEnter);

        return () => {
            document.removeEventListener("keydown", submitOnEnter);
        };
    }, [open, handleConnect]);

    const showUsername = mode === "manual";

    return (
        <DialogProvider open={open} onClose={onClose}>
            <div className="direct-connect-dialog">
                <div className="direct-connect-header">
                    <h2>{t("servers.contextMenu.quickConnect")}</h2>
                </div>

                <div className="direct-connect-content">
                    <div className="identity-section">
                        <div className="form-group">
                            <label>{t("servers.directConnect.identitySource")}</label>
                            <SelectBox
                                options={[
                                    { label: t("servers.directConnect.manual"), value: "manual" },
                                    { label: t("servers.directConnect.savedIdentity"), value: "saved" },
                                ]}
                                selected={mode}
                                setSelected={setMode}
                            />
                        </div>

                        {mode === "saved" && (
                            <div className="form-group">
                                <label>{t("servers.directConnect.identitySelection")}</label>
                                <SelectBox
                                    options={savedIdentityOptions}
                                    selected={selectedIdentityId}
                                    setSelected={setSelectedIdentityId}
                                    placeholder={t("servers.directConnect.identityPlaceholder")}
                                />
                                {selectedIdentity && (
                                    <span className="identity-hint">
                                        {t("servers.directConnect.usingIdentity", { name: selectedIdentity.name })}
                                    </span>
                                )}
                                {savedIdentities.length === 0 && (
                                    <span className="identity-hint">
                                        {t("servers.directConnect.messages.noIdentitiesAvailable")}
                                    </span>
                                )}
                            </div>
                        )}

                        {mode === "manual" && (
                        <div className={`name-row ${!showUsername ? 'single-column' : ''}`}>
                            {showUsername && (
                                <div className="form-group">
                                    <label htmlFor="username">{t("servers.dialog.fields.username")}</label>
                                    <Input
                                        icon={mdiAccountCircleOutline}
                                        type="text"
                                        placeholder={t("servers.dialog.placeholders.username")}
                                        autoComplete="off"
                                        value={username}
                                        setValue={setUsername}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>{t("servers.dialog.identities.authentication")}</label>
                                <SelectBox
                                    options={authOptions}
                                    selected={authType}
                                    setSelected={setAuthType}
                                />
                            </div>
                        </div>
                        )}

                        {mode === "manual" && authType === "password" && (
                            <div className="form-group">
                                <label htmlFor="password">{t("servers.dialog.fields.password")}</label>
                                <Input
                                    icon={mdiLockOutline}
                                    type="password"
                                    placeholder={t("servers.dialog.placeholders.password")}
                                    autoComplete="off"
                                    value={password}
                                    setValue={setPassword}
                                />
                            </div>
                        )}

                        {mode === "manual" && authType === "ssh" && (
                            <>
                                <div className="form-group">
                                    <label htmlFor="keyfile">{t("servers.dialog.identities.sshPrivateKey")}</label>
                                    <Input
                                        icon={mdiFileUploadOutline}
                                        type="file"
                                        autoComplete="off"
                                        onChange={readFile}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="passphrase">{t("servers.dialog.identities.passphrase")}</label>
                                    <Input
                                        icon={mdiLockOutline}
                                        type="password"
                                        placeholder={t("servers.dialog.identities.passphrase")}
                                        autoComplete="off"
                                        value={passphrase}
                                        setValue={setPassphrase}
                                    />
                                </div>

                                <span className="identity-note">
                                    {t("servers.directConnect.messages.sshIdentityHint")}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <Button
                    className="direct-connect-button"
                    onClick={handleConnect}
                    text={t("servers.contextMenu.connect")}
                />
            </div>
        </DialogProvider>
    );
};
