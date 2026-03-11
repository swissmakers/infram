import { useTranslation } from "react-i18next";
import Icon from "@mdi/react";
import { mdiClose } from "@mdi/js";
import { DialogProvider } from "@/common/components/Dialog/Dialog.jsx";
import FileRenderer from "@/pages/Servers/components/ViewContainer/renderer/FileRenderer";
import "./styles.sass";

export const FileManagerModal = ({ open, session, onClose, setOpenFileEditors, openTerminalFromFileManager }) => {
    const { t } = useTranslation();
    if (!session) return null;

    return (
        <DialogProvider disableClosing open={open} onClose={onClose} zIndex={9000}>
            <div className="file-manager-modal">
                <button className="file-manager-modal__close" onClick={onClose} aria-label={t("common.close")}>
                    <Icon path={mdiClose} size={0.9} />
                </button>
                <h2>{t("servers.tabs.contextMenu.openFileManager")}</h2>
                <div className="file-manager-modal__body">
                    <FileRenderer
                        session={session}
                        disconnectFromServer={onClose}
                        setOpenFileEditors={setOpenFileEditors}
                        isActive={open}
                        onOpenTerminal={(path) => openTerminalFromFileManager?.(session.id, path)}
                    />
                </div>
            </div>
        </DialogProvider>
    );
};

export default FileManagerModal;
