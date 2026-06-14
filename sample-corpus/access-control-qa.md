# Access Control, MFA & Privileged Access — Sample Q&A

Source: Derived from publicly available SIG Lite 2024 questionnaire framework.
This document is for demonstration purposes only.

---

## Access Management

**Q: How is user access to systems provisioned and deprovisioned?**
A: Access provisioning follows a formal request-and-approval workflow. Managers submit access requests specifying the system and required role. Access is granted only after approval from the system owner. Upon employee termination, access is revoked within 4 hours via automated HR system integration. Quarterly access reviews ensure continued appropriateness.

**Q: Do you enforce the principle of least privilege?**
A: Yes. All users are granted the minimum level of access required to perform their job function. Role-Based Access Control (RBAC) is implemented across all production systems. Privileged roles are time-limited and require additional justification.

**Q: How are shared accounts and service accounts managed?**
A: Shared accounts are prohibited for human users. Service accounts are provisioned with non-expiring credentials managed in a secrets vault, with access scoped to the specific APIs or resources required. Service account credentials are rotated at least annually and upon personnel changes.

---

## Multi-Factor Authentication (MFA)

**Q: Is multi-factor authentication (MFA) required?**
A: Yes. MFA is mandatory for all user accounts, including employees, contractors, and administrators. We enforce phishing-resistant MFA (FIDO2/WebAuthn or hardware tokens) for privileged and remote access. SMS-based MFA is not used for privileged accounts.

**Q: Is MFA enforced for remote access?**
A: Yes. All remote access (VPN, remote desktop, cloud console) requires MFA in addition to username/password authentication. Session tokens expire after 8 hours of inactivity.

---

## Privileged Access Management (PAM)

**Q: How is privileged access managed and monitored?**
A: We operate a Privileged Access Management (PAM) solution that enforces just-in-time (JIT) access for administrative actions. All privileged sessions are recorded and subject to real-time monitoring. Privileged account credentials are checked out from the PAM vault and automatically rotated after each session.

**Q: Are privileged accounts used for day-to-day activities?**
A: No. Administrators maintain separate standard user accounts for everyday work and use privileged accounts only when elevated access is required for specific tasks. This separation reduces the risk of credential compromise affecting privileged access.

**Q: How often are privileged access rights reviewed?**
A: Privileged access is reviewed monthly by security operations and quarterly by system owners. Any unnecessary or excessive privileges are removed within 48 hours of identification.

---

## Third-Party Access

**Q: How is third-party vendor access controlled?**
A: Third-party vendors are granted time-limited, scoped access only for the duration and scope of their engagement. Vendor access requires MFA, is provisioned through our PAM system, and is fully logged. Vendors sign our Third-Party Security Addendum before access is granted. Access is revoked immediately upon engagement completion.
