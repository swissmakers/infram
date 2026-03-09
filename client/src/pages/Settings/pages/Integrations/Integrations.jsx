import "./styles.sass";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { deleteRequest, getRequest, postRequest } from "@/common/utils/RequestUtil.js";
import { useToast } from "@/common/contexts/ToastContext.jsx";
import Button from "@/common/components/Button";
import ActionConfirmDialog from "@/common/components/ActionConfirmDialog";
import IntegrationDialog from "@/pages/Servers/components/IntegrationDialog";
import Icon from "@mdi/react";
import { mdiCloudSyncOutline, mdiDeleteOutline, mdiLanConnect, mdiPencilOutline, mdiPlus, mdiSync, mdiTestTube } from "@mdi/js";

const getTypeIcon = (type) => (type === "netbox" ? mdiLanConnect : mdiCloudSyncOutline);
const isErrorResponse = (response) => Boolean(
    response?.success === false || (typeof response?.code === "number" && response.code >= 400)
);

export const Integrations = () => {
    const { t } = useTranslation();
    const { sendToast } = useToast();
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionState, setActionState] = useState({});
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editIntegrationId, setEditIntegrationId] = useState(null);
    const [dialogType, setDialogType] = useState("proxmox");
    const [deleteState, setDeleteState] = useState({ open: false, integration: null });

    const loadIntegrations = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getRequest("integrations/list");
            if (isErrorResponse(data)) {
                sendToast("Error", data.message || t("settings.integrations.errors.loadFailed"));
                return;
            }
            setIntegrations(Array.isArray(data) ? data : []);
        } catch (error) {
            sendToast("Error", error.message || t("settings.integrations.errors.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [sendToast, t]);

    useEffect(() => {
        loadIntegrations();
    }, [loadIntegrations]);

    const closeDialog = () => {
        setDialogOpen(false);
        setEditIntegrationId(null);
        setDialogType("proxmox");
        loadIntegrations();
    };

    const openCreateDialog = (type = "proxmox") => {
        setEditIntegrationId(null);
        setDialogType(type);
        setDialogOpen(true);
    };

    const openEditDialog = (integration) => {
        setEditIntegrationId(integration.id);
        setDialogType(integration.type || "proxmox");
        setDialogOpen(true);
    };

    const withAction = async (id, key, fn) => {
        setActionState((prev) => ({ ...prev, [`${key}-${id}`]: true }));
        try {
            await fn();
        } finally {
            setActionState((prev) => ({ ...prev, [`${key}-${id}`]: false }));
        }
    };

    const runAction = async (integration, action) => {
        await withAction(integration.id, action, async () => {
            try {
                const endpoint = action === "test"
                    ? `integrations/${integration.id}/test`
                    : `integrations/${integration.id}/sync`;
                const response = await postRequest(endpoint, {});
                if (isErrorResponse(response)) {
                    sendToast("Error", response.message || t("settings.integrations.errors.actionFailed"));
                    return;
                }
                sendToast("Success", response?.message || t("settings.integrations.messages.actionSuccess"));
                loadIntegrations();
            } catch (error) {
                sendToast("Error", error.message || t("settings.integrations.errors.actionFailed"));
            }
        });
    };

    const handleDelete = async () => {
        const integration = deleteState.integration;
        if (!integration) return;

        await withAction(integration.id, "delete", async () => {
            try {
                const response = await deleteRequest(`integrations/${integration.id}`);
                if (isErrorResponse(response)) {
                    sendToast("Error", response.message || t("settings.integrations.errors.deleteFailed"));
                    return;
                }
                sendToast("Success", t("settings.integrations.messages.deleted"));
                setDeleteState({ open: false, integration: null });
                loadIntegrations();
            } catch (error) {
                sendToast("Error", error.message || t("settings.integrations.errors.deleteFailed"));
            }
        });
    };

    const cards = useMemo(() => integrations.map((integration) => {
        const testBusy = !!actionState[`test-${integration.id}`];
        const syncBusy = !!actionState[`sync-${integration.id}`];
        const deleteBusy = !!actionState[`delete-${integration.id}`];
        return (
            <div className="integration-card" key={integration.id}>
                <div className="integration-card__head">
                    <div className="integration-title">
                        <Icon path={getTypeIcon(integration.type)} />
                        <div>
                            <h3>{integration.name}</h3>
                            <p>{integration.type === "netbox" ? "NetBox" : "Proxmox"}</p>
                        </div>
                    </div>
                    <div className={`integration-status ${integration.status || "unknown"}`}>
                        {integration.status || "unknown"}
                    </div>
                </div>
                <div className="integration-meta">
                    <p>{t("settings.integrations.lastSync")}: {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : "-"}</p>
                    <p>{t("settings.integrations.lastMessage")}: {integration.lastSyncMessage || "-"}</p>
                </div>
                <div className="integration-actions">
                    <Button text={t("settings.integrations.actions.edit")} icon={mdiPencilOutline} onClick={() => openEditDialog(integration)} />
                    <Button text={t("settings.integrations.actions.test")} icon={mdiTestTube} onClick={() => runAction(integration, "test")} disabled={testBusy || syncBusy || deleteBusy} />
                    <Button text={t("settings.integrations.actions.sync")} icon={mdiSync} onClick={() => runAction(integration, "sync")} disabled={syncBusy || testBusy || deleteBusy} />
                    <Button text={t("settings.integrations.actions.delete")} icon={mdiDeleteOutline} onClick={() => setDeleteState({ open: true, integration })} type="secondary" disabled={deleteBusy || syncBusy || testBusy} />
                </div>
            </div>
        );
    }), [actionState, integrations, t]);

    return (
        <div className="integrations-page">
            <div className="integrations-header">
                <div>
                    <h2>{t("settings.integrations.title")}</h2>
                    <p>{t("settings.integrations.description")}</p>
                </div>
                <div className="integrations-header__actions">
                    <Button text={t("settings.integrations.actions.addProxmox")} icon={mdiPlus} onClick={() => openCreateDialog("proxmox")} />
                    <Button text={t("settings.integrations.actions.addNetbox")} icon={mdiPlus} onClick={() => openCreateDialog("netbox")} />
                </div>
            </div>

            {loading ? (
                <div className="integrations-empty">{t("common.loading")}</div>
            ) : integrations.length === 0 ? (
                <div className="integrations-empty">{t("settings.integrations.empty")}</div>
            ) : (
                <div className="integrations-grid">{cards}</div>
            )}

            <IntegrationDialog
                open={dialogOpen}
                onClose={closeDialog}
                currentFolderId={null}
                currentOrganizationId={null}
                editServerId={editIntegrationId}
                initialType={dialogType}
            />

            <ActionConfirmDialog
                open={deleteState.open}
                setOpen={(open) => setDeleteState((prev) => ({ ...prev, open }))}
                onConfirm={handleDelete}
                text={t("settings.integrations.confirmDelete", { name: deleteState.integration?.name || "" })}
            />
        </div>
    );
};
