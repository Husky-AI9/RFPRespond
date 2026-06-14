# Security Policy

## Authentication

The MCP server requires a valid Microsoft Entra ID Bearer token on every request.
Tokens are validated against the tenant's JWKS endpoint using `jwks-rsa` and `jsonwebtoken`.
No unauthenticated endpoints are exposed.

## Secret Management

- All secrets (Foundry IQ key, Entra client secret, Graph credentials) are stored in **Azure Key Vault**.
- The Azure Container Apps environment reads secrets via Key Vault references — no plaintext secrets in environment variables or code.
- `.env.local` is listed in `.gitignore` and must never be committed.
- No secrets, credentials, or tokens appear in source code, logs, or demo materials.

## Data Protection

- The sample corpus uses **publicly available** security questionnaire templates (SIG Lite, CAIQ).
- No confidential or proprietary company data is committed to this repository.
- RFP documents processed by the agent are read from and written to the user's own SharePoint tenant — they never leave the Microsoft 365 trust boundary.

## Secure Development Practices

- Dependencies are pinned to exact versions in `package-lock.json`.
- The Docker image is built from `node:20-alpine` (minimal attack surface).
- The MCP server validates and sanitizes all inputs before passing them to Graph or Foundry IQ APIs.
- OAuth scopes are minimal: only the Graph permissions needed for each tool are requested.

## Required Graph API Permissions (Delegated)

| Permission | Used by |
|---|---|
| `Files.ReadWrite.All` | parseRfp, compileResponse |
| `Tasks.ReadWrite` | assignToSme |
| `People.Read` | findSme |
| `Sites.ReadWrite.All` | compileResponse (SharePoint upload) |

## Reporting a Vulnerability

Please report security issues by opening a GitHub Issue marked **[SECURITY]**.
Do not include sensitive reproduction details in public issues.

## Disclaimer

This project was created for the Agents League hackathon (June 2026).
It does not contain confidential or proprietary information.
All sample data used is derived from publicly available security questionnaire frameworks.
