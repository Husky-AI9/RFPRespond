# Sample Knowledge Corpus

This folder contains sample Q&A documents to populate your SharePoint `RFPCorpus` document library.
All content is derived from **publicly available** security questionnaire frameworks (SIG Lite, CAIQ v4).
No confidential or proprietary data is included.

## How to upload to SharePoint

1. Navigate to your SharePoint site: `https://YOUR_TENANT.sharepoint.com/sites/RFPCorpus`
2. Open the **Documents** library.
3. Create a folder called `RFPCorpus` if it doesn't exist.
4. Upload all `.md` files from this folder into `RFPCorpus/`.
5. In the Foundry IQ portal, trigger a re-index of the SharePoint knowledge source.

## Files included

| File | Content |
|---|---|
| `soc2-qa.md` | SOC 2 Type II control questions and answers |
| `data-handling-qa.md` | Data classification, retention, and disposal |
| `access-control-qa.md` | Access management, MFA, and privileged access |

## Adding your own content

Upload any of the following to the `RFPCorpus` library for richer retrieval:
- Past RFP responses (anonymized)
- Security policies and procedures
- Compliance certifications (SOC 2 reports, ISO 27001 certificates)
- Data processing agreements (DPA templates)
- Business continuity / DR plans

Foundry IQ will automatically index and make them available to the agent within minutes of upload.
