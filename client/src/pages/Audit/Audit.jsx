import { useEffect, useState, useCallback, useMemo } from "react";
import { useContext } from "react";
import { useToast } from "@/common/contexts/ToastContext.jsx";
import { getRequest } from "@/common/utils/RequestUtil.js";
import {
    mdiShieldCheckOutline,
    mdiDomain,
    mdiAccountCircleOutline,
    mdiServerNetworkOutline,
    mdiFileDocumentOutline,
    mdiKeyVariant,
} from "@mdi/js";
import PageHeader from "@/common/components/PageHeader";
import AuditTable from "./components/AuditTable";
import AuditFilters from "./components/AuditFilters";
import { useTranslation } from "react-i18next";
import { UserContext } from "@/common/contexts/UserContext.jsx";
import "./styles.sass";

export const Audit = () => {
    const { t } = useTranslation();
    const { sendToast } = useToast();
    const { user } = useContext(UserContext);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [metadata, setMetadata] = useState(null);
    const [organizations, setOrganizations] = useState([]);
    const [filters, setFilters] = useState({
        organizationId: null,
        action: "",
        resource: "",
        startDate: "",
        endDate: "",
        limit: 50,
        offset: 0,
    });
    const [total, setTotal] = useState(0);
    const [forbidden, setForbidden] = useState(false);

    const pagination = useMemo(() => ({
        total,
        currentPage: Math.floor(filters.offset / filters.limit) + 1,
        itemsPerPage: filters.limit,
    }), [total, filters.offset, filters.limit]);

    const fetchData = useCallback(async () => {
        if (user?.role !== "admin") {
            setForbidden(true);
            return;
        }
        try {
            const [metadataRes, orgsRes] = await Promise.all([
                getRequest("audit/metadata"),
                getRequest("organizations"),
            ]);
            setMetadata(metadataRes);
            setOrganizations(orgsRes);
            setForbidden(false);
        } catch (error) {
            if (error?.code === 403 || error?.message === "Forbidden") {
                setForbidden(true);
                return;
            }
            sendToast("Error", t('audit.errors.failedToLoadData'));
        }
    }, [sendToast, t, user?.role]);

    const fetchAuditLogs = useCallback(async () => {
        if (user?.role !== "admin") {
            setForbidden(true);
            setAuditLogs([]);
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams(
                Object.entries(filters).filter(([_, value]) => value !== "" && value !== null)
                    .map(([key, value]) => [key, String(value)]),
            );

            const response = await getRequest(`audit/logs?${params}`);
            setAuditLogs(response.logs);
            setTotal(response.total);
            setForbidden(false);
        } catch (error) {
            if (error?.code === 403 || error?.message === "Forbidden") {
                setForbidden(true);
                setAuditLogs([]);
                return;
            }
            sendToast("Error", t('audit.errors.failedToLoadLogs'));
            setAuditLogs([]);
        } finally {
            setLoading(false);
        }
    }, [filters, sendToast, t, user?.role]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchAuditLogs();
    }, [fetchAuditLogs]);

    const handleFilterChange = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
    }, []);

    const handlePageChange = useCallback((page) => {
        setFilters(prev => ({ ...prev, offset: (page - 1) * prev.limit }));
    }, []);

    const getIconForAction = useCallback((action) => {
        if (action.startsWith("user.")) return mdiAccountCircleOutline;
        if (action.startsWith("server.")) return mdiServerNetworkOutline;
        if (action.startsWith("file.")) return mdiFileDocumentOutline;
        if (action.startsWith("identity.")) return mdiKeyVariant;
        if (action.startsWith("organization.")) return mdiDomain;
        return mdiShieldCheckOutline;
    }, []);

    if (user?.role !== "admin" || forbidden) {
        return (
            <div className="audit-page">
                <PageHeader icon={mdiShieldCheckOutline} title={t('audit.page.title')}
                            subtitle={t('audit.page.subtitle')} />
                <div className="audit-content">
                    <div>{t('common.errors.generalError')}: Forbidden</div>
                </div>
            </div>
        );
    }

    return (
        <div className="audit-page">
            <PageHeader icon={mdiShieldCheckOutline} title={t('audit.page.title')}
                        subtitle={t('audit.page.subtitle')} />
            <div className="audit-content">
                <AuditFilters filters={filters} metadata={metadata} organizations={organizations}
                              onChange={handleFilterChange} />
                <AuditTable logs={auditLogs} loading={loading} pagination={pagination} onPageChange={handlePageChange}
                            getIconForAction={getIconForAction} />
            </div>
        </div>
    );
};
