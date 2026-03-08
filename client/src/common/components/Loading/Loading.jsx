import { memo } from "react";
import InframLogo from "@/common/components/InframLogo";
import "./styles.sass";

export const Loading = memo(() => {
    return (
        <div className="loading-container">
            <div className="loading-content">
                <div className="loading-logo-wrapper">
                    <InframLogo size={64} className="loading-logo" />
                    <div className="loading-ring"></div>
                    <div className="loading-ring loading-ring-2"></div>
                    <div className="loading-ring loading-ring-3"></div>
                </div>
            </div>
        </div>
    );
});