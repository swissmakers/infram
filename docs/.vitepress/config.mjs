import { defineConfig } from "vitepress";

import { useSidebar } from "vitepress-openapi";
import { exec } from "child_process";
import { promisify } from "util";
import spec from "../public/openapi.json";

const execAsync = promisify(exec);

const sidebar = useSidebar({ spec, linkPrefix: "/operations/" });

export default defineConfig({
    title: "Infram",
    description: "Open-source platform for secure remote infrastructure operations",
    lastUpdated: true,
    cleanUrls: true,
    metaChunk: true,

    buildEnd: async () => {
        try {
            console.log("Regenerating OpenAPI specification...");
            await execAsync("node scripts/generate-openapi.js", { cwd: "./" });
            console.log("OpenAPI specification updated successfully!");
        } catch (error) {
            console.warn("Warning: Could not regenerate OpenAPI spec:", error.message);
        }
    },

    head: [
        ["link", { rel: "icon", type: "image/png", href: "/logo.png" }],
        ["meta", { name: "theme-color", content: "#1C2232" }],
        ["meta", { property: "og:type", content: "website" }],
        ["meta", { property: "og:locale", content: "en" }],
        ["meta", {
            property: "og:title",
            content: "Infram | The open source server management software for SSH, VNC & RDP",
        }],
        ["meta", { property: "og:site_name", content: "Infram" }],
        ["meta", { property: "og:image", content: "/thumbnail.png" }],
        ["meta", { property: "og:image:type", content: "image/png" }],
        ["meta", { property: "twitter:card", content: "summary_large_image" }],
        ["meta", { property: "twitter:image:src", content: "/thumbnail.png" }],
        ["meta", { property: "og:url", content: "https://github.com/swissmakers/infra-manager" }],
    ],
    themeConfig: {

        logo: "/logo.png",

        nav: [
            { text: "Home", link: "/" },
            { text: "Install", link: "/installation" },
        ],

        footer: {
            message: "Distributed under the GNU GPL v3 License",
            copyright: "© Swissmakers GmbH and contributors",
        },
        search: {
            provider: "local",
        },

        sidebar: [
            {
                text: "Getting Started",
                items: [
                    { text: "Home", link: "/" },
                    { text: "Install", link: "/installation" },
                ],
            },
            {
                text: "Operations",
                items: [
                    { text: "SSL/HTTPS", link: "/ssl" },
                    { text: "Reverse Proxy", link: "/reverse-proxy" },
                    { text: "Screenshots", link: "/screenshots" },
                ],
            },
            {
                text: "Authentication",
                items: [
                    { text: "LDAP", link: "/ldap" },
                    { text: "OIDC / SSO", link: "/oidc" },
                ],
            },
            {
                text: "Integrations & Automation",
                items: [
                    { text: "Custom Sources", link: "/customsource" },
                    { text: "Scripts & Snippets", link: "/scripts&snippets" },
                    { text: "Scripting Variables & Directives", link: "/ScriptingVariables" },
                ],
            },
            {
                text: "API",
                items: [
                    { text: "API Reference", link: "/api-reference" },
                    ...sidebar.generateSidebarGroups(),
                ],
            },
            {
                text: "Project",
                items: [
                    { text: "Contributing", link: "/contributing" },
                    { text: "Licensing", link: "/licensing" },
                ],
            },
        ],

        socialLinks: [
            { icon: "github", link: "https://github.com/swissmakers/infra-manager" },
            { icon: "website", link: "https://swissmakers.ch" },
        ],
    },
});
