# SOC 2 Type II — Sample Q&A

Source: Derived from publicly available SOC 2 control frameworks (AICPA Trust Services Criteria).
This document is for demonstration purposes only.

---

## Security (CC6)

**Q: Does your organization have a SOC 2 Type II report?**
A: Yes. We maintain an annual SOC 2 Type II audit covering all five Trust Services Criteria (Security, Availability, Confidentiality, Processing Integrity, and Privacy). The most recent report covers the 12-month period ending [DATE]. Reports are available under NDA upon request.

**Q: What auditing firm conducts your SOC 2 audit?**
A: Our SOC 2 Type II audits are conducted by an independent, AICPA-licensed CPA firm. The auditor identity is disclosed within the report itself.

**Q: How often is the SOC 2 audit performed?**
A: Annually. We conduct continuous control monitoring throughout the year and commission the external audit once per year, targeting completion within Q1 of the following calendar year.

**Q: Do you have penetration testing performed?**
A: Yes. We engage a third-party penetration testing firm to conduct application and infrastructure penetration tests at least annually, and after major architectural changes. Findings are remediated according to severity-based SLAs: Critical (24h), High (7d), Medium (30d).

**Q: How are security incidents detected and responded to?**
A: We operate a 24/7 Security Operations Center (SOC) with SIEM tooling. Our Incident Response Plan (IRP) defines severity levels, escalation paths, and notification timelines. Major security incidents are communicated to affected customers within 72 hours per applicable regulatory requirements.

---

## Availability (A1)

**Q: What is your uptime SLA?**
A: We commit to 99.9% monthly uptime for production services, as defined in our standard Service Level Agreement. Scheduled maintenance windows are excluded from SLA calculations and communicated at least 48 hours in advance.

**Q: Do you have a Business Continuity Plan (BCP) and Disaster Recovery Plan (DRP)?**
A: Yes. Both plans are reviewed and tested annually. Our Recovery Time Objective (RTO) is 4 hours and Recovery Point Objective (RPO) is 1 hour for Tier 1 services. DR failover tests are conducted bi-annually.

---

## Confidentiality (C1)

**Q: How is data encrypted at rest and in transit?**
A: All data at rest is encrypted using AES-256. All data in transit is encrypted using TLS 1.2 or higher. Encryption keys are managed via a dedicated Key Management Service (KMS) with annual key rotation.

**Q: Who has access to customer data?**
A: Access to customer data is restricted on a need-to-know basis, enforced through Role-Based Access Control (RBAC). Privileged access requires multi-factor authentication and is logged and reviewed monthly. Third-party access is prohibited without explicit customer consent.
