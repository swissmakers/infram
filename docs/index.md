---
layout: home

hero:
  name: Infram
  text: Secure Infrastructure Access and Operations
  tagline: Open-source operations platform for SSH, RDP, VNC, identity-aware access, and auditable remote administration.
  actions:
    - theme: brand
      text: Install Infram
      link: /installation
    - theme: alt
      text: Reverse Proxy Guide
      link: /reverse-proxy
    - theme: alt
      text: GitHub
      link: https://github.com/swissmakers/infra-manager
  image:
    src: /logo.png
    alt: Infram logo

features:
  - icon: 🔐
    title: Secure Access
    details: Access infrastructure over SSH, RDP, VNC, and Telnet with centralized identity controls.
  - icon: 🧩
    title: Identity Integration
    details: Integrate LDAP and OIDC/SSO with support for passkeys and two-factor authentication.
  - icon: 📂
    title: File and Session Operations
    details: Manage terminal and file workflows in one interface with reduced context switching.
  - icon: ⚙️
    title: Automation
    details: Execute scripts and snippets with metadata, guided prompts, and operator-friendly directives.
  - icon: 📝
    title: Auditability
    details: Capture action and session lifecycle events for compliance and troubleshooting.
  - icon: ✅
    title: Operational Visibility
    details: Track host/service availability with built-in status checking and centralized views.

---

<style>
:root {
  --vp-home-hero-name-color: #314bd3;
  --vp-home-hero-image-background-image: linear-gradient(rgba(49, 75, 211, 0.25), rgba(49, 75, 211, 0.25));
  --vp-home-hero-image-filter: blur(100px);
}
</style>
