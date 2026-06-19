import { memo } from "react";
import InframLogo from "@/common/components/InframLogo";
import "./styles.sass";

export const Loading = memo(() => {
    return (
        <div className="loading-container">
            <div className="loading-content">
                <div className="loading-logo-wrapper">
                    <InframLogo size={56} className="loading-logo" />
                </div>
                <div className="loading-bar"><div className="loading-bar-indicator" /></div>
            </div>
        </div>
    );
});