# Data Handling, Retention & Disposal — Sample Q&A

Source: Derived from publicly available CAIQ v4 (Cloud Security Alliance) frameworks.
This document is for demonstration purposes only.

---

## Data Classification

**Q: Do you have a data classification policy?**
A: Yes. Our Data Classification Policy defines four tiers: Public, Internal, Confidential, and Restricted. All data assets are classified at creation and tagged accordingly. Classification determines handling, storage, and disposal requirements.

**Q: How is customer data classified?**
A: Customer-provided data is classified as Confidential by default. Data containing personal information (PII/PHI) or financial records is elevated to Restricted classification, which enforces stricter access controls, encryption requirements, and audit logging.

---

## Data Retention

**Q: What is your data retention policy?**
A: Retention periods are defined per data category in our Data Retention Schedule:
- Customer transaction records: 7 years (regulatory requirement)
- Support tickets and communications: 3 years
- System and security logs: 12 months (90 days in hot storage, remainder in cold/archive)
- Employee records: Duration of employment + 7 years

**Q: Can customers request deletion of their data?**
A: Yes. Customers may submit a data deletion request at any time. Upon receipt of a verified request, we delete all customer data from production systems within 30 days and from backup systems within 90 days, except where retention is required by law.

---

## Data Disposal

**Q: How is data securely disposed of when no longer needed?**
A: Digital data is deleted using NIST 800-88 compliant methods (cryptographic erasure for encrypted media, secure overwrite for unencrypted media). Physical media (hard drives, tapes) is destroyed by a certified third-party media destruction vendor. Certificates of destruction are retained for 3 years.

**Q: Does data disposal apply to cloud environments?**
A: Yes. For cloud-hosted data, we use the cloud provider's cryptographic key deletion feature to render data irrecoverable. All cloud storage volumes are encrypted, so key deletion constitutes effective data erasure.

---

## Data Localization

**Q: Where is customer data stored geographically?**
A: By default, customer data is stored in US data centers. EU customers can opt into EU-only data residency at no additional cost. Data residency selection is configured at tenant creation and honored throughout the contract term.

**Q: Is customer data transferred cross-border?**
A: Cross-border data transfers occur only as required by the selected data residency configuration and are governed by Standard Contractual Clauses (SCCs) for EU data. We do not sell or transfer customer data to third parties for marketing purposes.
