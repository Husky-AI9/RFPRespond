# RFPRespond — Portal Deployment Guide

Deploy everything through browser-based Azure interfaces. No CLI tools required on your local machine.

**Estimated time:** 45–60 minutes  
**What you need locally:** A browser, and the project files on your computer.

---

## What's already done for you

- All source code is written and TypeScript-compiles clean
- Azure infrastructure templates (`infra/main.bicep`) are ready
- Sample knowledge corpus (`sample-corpus/`) is ready to upload
- `agent/appPackage/` manifests are ready for Teams publishing

---

## Values to collect as you go

Keep a notepad open and fill these in as you complete each step:

| Variable | Value |
|---|---|
| `TENANT_ID` | <TENANT_ID> |
| `MCP_APP_ID` | <MCP_APP_ID>|
| `MCP_CLIENT_SECRET` |<MCP_CLIENT_SECRET> |  Note Secret ID: <MCP_SECRET_ID>
| `DA_APP_ID` | <DA_APP_ID> |
| `DA_CLIENT_SECRET` | <DA_CLIENT_SECRET> | Secret ID : <DA_SECRET_ID>
| `SEARCH_KEY` | <SEARCH_KEY>|
| `ACR_LOGIN_SERVER` | rfprespondacr.azurecr.io|
| `MCP_SERVER_URL` | |
| `KV_NAME` | kv-rfprespond |
| `TEAMS_APP_ID` | |
OAuth client registration ID:
Created on 6/13/26 2:19 PM
<OAUTH_REGISTRATION_ID>


---

## Step 1 — Sign In and Note Your Tenant ID

1. Go to **portal.azure.com** in your browser and sign in with the Microsoft account that has your Azure subscription. MFA will be prompted automatically — no extra commands needed.
2. Click your **account avatar** (top-right corner) → **Switch directory**.
3. On the "Directories + subscriptions" page, find your directory and copy the **Directory ID** (a UUID like `72f988bf-...`).
4. Save it as `TENANT_ID`.

---

## Step 2 — Create App Registrations

Go to **portal.azure.com** → search `Microsoft Entra ID` in the top search bar → open it → left sidebar → **App registrations**.

### App A: RFPRespond-MCP (the backend server)

1. Click **+ New registration**
   - Name: `RFPRespond-MCP`
   - Supported account types: **Accounts in this organizational directory only**
   - Click **Register**
2. On the Overview page, copy **Application (client) ID** → save as `MCP_APP_ID`
3. Left sidebar → **Expose an API**
   - Click **Add** next to "Application ID URI" → accept the default `api://<MCP_APP_ID>` → **Save**
   - Click **+ Add a scope**
     - Scope name: `RFPRespond.Access`
     - Who can consent: **Admins and users**
     - Admin consent display name: `Access RFPRespond MCP tools`
     - Admin consent description: `Allows the app to access RFPRespond MCP tools`
     - User consent display name: `Access RFPRespond MCP tools`
     - User consent description: `Allows you to access RFPRespond MCP tools`
     - State: **Enabled**
     - Click **Add scope**
4. Left sidebar → **Certificates & secrets** → **+ New client secret**
   - Description: `hackathon-secret`
   - Expires: **24 months**
   - Click **Add**
   - **Copy the Value immediately** (the column on the left, not the Secret ID). Save as `MCP_CLIENT_SECRET`. It disappears when you navigate away.

---

### App B: RFPRespond-DA (the Copilot agent client)

1. Go back to **App registrations** → **+ New registration**
   - Name: `RFPRespond-DA`
   - Supported account types: **Accounts in this organizational directory only**
   - Click **Register**
2. Copy **Application (client) ID** → save as `DA_APP_ID`
3. Left sidebar → **API permissions** → **+ Add a permission** → **Microsoft Graph** → **Delegated permissions**
   - Search for and add each of these four permissions:
     - `Files.ReadWrite.All`
     - `Sites.ReadWrite.All`
     - `Tasks.ReadWrite`
     - `People.Read`
   - Click **Add permissions**
4. Click **Grant admin consent for [your tenant]** → **Yes** to confirm
   - If this button is greyed out, you don't have Global Admin rights — ask your tenant admin to grant consent, or use a personal tenant where you are admin.
5. Left sidebar → **Certificates & secrets** → **+ New client secret**
   - Description: `hackathon-secret` | Expires: **24 months** → **Add**
   - **Copy the Value immediately**. Save as `DA_CLIENT_SECRET`.

---

## Step 3 — Create Azure AI Search

### Create the resource group and search service

1. Portal → **+ Create a resource** → search `Azure AI Search` → click **Create**
   - **Subscription:** your subscription
   - **Resource group:** click **Create new** → name it `rg-rfp-respond-prod` → **OK**
   - **Service name:** `rfp-respond-search`
   - **Location:** `East US`
   - **Pricing tier:** click **Change Pricing Tier** → select **Free** → **Select**
     > Free tier costs $0. It uses keyword search instead of semantic ranking, which is fine for the demo corpus. If you want semantic ranking, select **Basic** ($75/month prorated — you can delete after the hackathon).
   - Click **Review + create** → **Create**
   - Wait ~2 minutes for deployment to complete.

2. Open `rfp-respond-search` → left sidebar → **Keys** → copy **Primary admin key** → save as `SEARCH_KEY`

### Create the search index (Azure Cloud Shell)

The portal doesn't have a visual index editor for Azure AI Search. Use **Azure Cloud Shell** — a full Linux terminal that runs in your browser, built into the portal. No installation required.

1. Click the **Cloud Shell icon** (`>_`) in the portal top toolbar
2. If prompted, select **Bash** and create a storage account (one-time setup, ~30 seconds)
3. Paste this command (replace `YOUR_SEARCH_KEY` with the key you just copied):

```bash
SEARCH_KEY="<SEARCH_KEY>"
SEARCH_ENDPOINT="https://rfp-respond-search.search.windows.net"

curl -s -X PUT "$SEARCH_ENDPOINT/indexes/rfp-corpus?api-version=2023-11-01" \
  -H "api-key: $SEARCH_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rfp-corpus",
    "fields": [
      {"name":"id","type":"Edm.String","key":true,"filterable":true},
      {"name":"title","type":"Edm.String","searchable":true,"retrievable":true},
      {"name":"section","type":"Edm.String","searchable":true,"retrievable":true,"filterable":true},
      {"name":"content","type":"Edm.String","searchable":true,"retrievable":true},
      {"name":"url","type":"Edm.String","retrievable":true}
    ]
  }' | python3 -m json.tool
```

> **Note:** The semantic configuration block is omitted because it requires the Basic tier or higher. Keyword search works well for the demo corpus.

You should see a JSON response with `"name": "rfp-corpus"`. If you see an error, check the key.

### Upload the sample corpus

4. In the same Cloud Shell session, upload the 3 corpus files:
   - Click the **Upload/Download** button in the Cloud Shell toolbar (looks like a file with an arrow)
   - Upload these three files from your local `sample-corpus/` folder:
     - `soc2-qa.md`
     - `data-handling-qa.md`
     - `access-control-qa.md`

5. Paste this script to index all three documents:

```bash
upload_doc() {
  local id="$1" title="$2" section="$3" file="$4"
  local content
  content=$(python3 -c "import sys, json; print(json.dumps(open('$file').read()))")
  curl -s -X POST "$SEARCH_ENDPOINT/indexes/rfp-corpus/docs/index?api-version=2023-11-01" \
    -H "api-key: $SEARCH_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"value\":[{\"@search.action\":\"upload\",\"id\":\"$id\",\"title\":\"$title\",\"section\":\"$section\",\"content\":$content,\"url\":\"\"}]}" \
    | python3 -m json.tool
}

upload_doc "soc2-001"         "SOC 2 Type II Q&A"                      "SOC 2"          "soc2-qa.md"
upload_doc "data-handling-001" "Data Handling, Retention and Disposal"  "Data Handling"  "data-handling-qa.md"
upload_doc "access-001"       "Access Control, MFA and Privileged Access" "Access Control" "access-control-qa.md"

echo "All documents uploaded."
```

Each response should show `"status": true` for the uploaded document.

---

## Step 4 — Upload Corpus to SharePoint (Optional)

> Skip this step if you don't have SharePoint Admin rights. The agent works fully via Azure AI Search alone.

1. Go to **admin.microsoft.com** → left sidebar → **SharePoint** → **Active sites**
2. Click your root site (usually `<tenantname>.sharepoint.com`)
3. Open the site → **Documents** → **+ New** → **Folder** → name it `RFPCorpus`
4. Open the `RFPCorpus` folder → **Upload** → upload the three `.md` files from `sample-corpus/`
5. Note your tenant name (the part before `.onmicrosoft.com`) — save it as `SHAREPOINT_TENANT`

---

## Step 5 — Deploy Azure Infrastructure

Create resources in this exact order inside the `rg-rfp-respond-prod` resource group.

### 5a — Log Analytics Workspace

Portal → **+ Create a resource** → search `Log Analytics workspace` → **Create**
- **Resource group:** `rg-rfp-respond-prod`
- **Name:** `log-rfp-respond-prod`
- **Region:** East US
- Click **Review + create** → **Create**

### 5b — Container Registry

Portal → **+ Create a resource** → search `Container Registry` → **Create**
- **Resource group:** `rg-rfp-respond-prod`
- **Registry name:** `rfprespondacr` (must be globally unique — if taken, add 4 random digits, e.g. `rfprespondacr4821`)
- **Location:** East US
- **SKU:** Basic
- Click **Review + create** → **Create**

After deployment, open the registry → **Overview** → copy **Login server** (e.g. `rfprespondacr.azurecr.io`). Save as `ACR_LOGIN_SERVER`.

### 5c — Build and Push the Docker Image

Use Cloud Shell to build the image in Azure (no local Docker required):

1. Open **Cloud Shell** (`>_`) — make sure it's set to **Bash**
2. Upload the source code. Easiest option: zip the `server/` folder on your PC first, then upload it:
   - On your PC: right-click the `server` folder → **Send to** → **Compressed (zipped) folder** → produces `server.zip`
   - In Cloud Shell toolbar → **Upload** → select `server.zip`
   - In Cloud Shell: `unzip server.zip -d server_src`

3. Build and push using ACR Tasks (runs the Docker build entirely in Azure):

```bash
 
```

This takes 3–5 minutes. When it finishes you'll see `Run ID: ... was successful`.

### 5d — Key Vault

Portal → **+ Create a resource** → search `Key Vault` → **Create**
- **Resource group:** `rg-rfp-respond-prod`
- **Key vault name:** `kv-rfprespond` (must be globally unique — add digits if needed)
- **Region:** East US
- **Permission model:** Azure role-based access control
- Click **Review + create** → **Create**

Save the vault name as `KV_NAME`.

After deployment, open the Key Vault → left sidebar → **Secrets** → **+ Generate/Import** → add these two secrets:

| Name | Value |
|---|---|
| `foundry-iq-key` | `<SEARCH_KEY from Step 3>` |
| `entra-client-secret` | `<MCP_CLIENT_SECRET from Step 2>` |

### 5e — Container Apps Environment

Portal → **+ Create a resource** → search `Container Apps Environment` → **Create**
- **Resource group:** `rg-rfp-respond-prod`
- **Environment name:** `aca-env-rfp-respond-prod`
- **Region:** East US
- Click **Monitoring** tab → set **Log Analytics workspace** to `log-rfp-respond-prod`
- Click **Review + create** → **Create**

### 5f — Container App

Portal → **+ Create a resource** → search `Container App` → **Create**

**Basics tab:**
- **Resource group:** `rg-rfp-respond-prod`
- **Container app name:** `rfp-respond-mcp`
- **Region:** East US
- **Container Apps Environment:** `aca-env-rfp-respond-prod`

**Container tab:**
- Uncheck **Use quickstart image**
- **Image source:** Azure Container Registry
- **Registry:** `rfprespondacr` (your registry)
- **Image:** `rfp-respond-mcp`
- **Image tag:** `latest`
- **CPU and Memory:** 0.25 CPU cores, 0.5 Gi memory

**Environment variables** — click **+ Add** for each:

| Name | Value |
|---|---|
| `PORT` | `3978` |
| `NODE_ENV` | `production` |
| `FOUNDRY_IQ_ENDPOINT` | `https://rfp-respond-search.search.windows.net/indexes/rfp-corpus` |
| `ENTRA_CLIENT_ID` | `<MCP_APP_ID>` |
| `ENTRA_TENANT_ID` | `<TENANT_ID>` |
| `PLANNER_PLAN_ID` | *(leave blank)* |

**Ingress tab:**
- **Ingress:** Enabled
- **Ingress traffic:** Accepting traffic from anywhere
- **Target port:** `3978`

Click **Review + create** → **Create**.

After deployment, open the Container App → **Overview** → copy **Application URL** (e.g. `https://rfp-respond-mcp.<hash>.eastus.azurecontainerapps.io`). Save as `MCP_SERVER_URL`.

### 5g — Enable Managed Identity and Link Key Vault Secrets

**Enable the identity:**
1. Open the `rfp-respond-mcp` Container App → left sidebar → **Identity**
2. **System assigned** tab → toggle Status to **On** → **Save** → **Yes**
3. Copy the **Object (principal) ID** that appears
<MANAGED_IDENTITY_OBJECT_ID>

**Grant Key Vault access:**
1. Open your Key Vault (`kv-rfprespond`) → left sidebar → **Access control (IAM)**
2. **+ Add role assignment**
   - Role: **Key Vault Secrets User** → **Next**
   - Assign access to: **Managed identity**
   - Click **+ Select members** → select subscription → Managed identity: **Container App** → select `rfp-respond-mcp` → **Select**
   - Click **Review + assign** → **Review + assign**

**Link secrets as environment variables:**
1. Open the Container App → left sidebar → **Secrets** → **+ Add**
   - Add `foundry-iq-key-ref` → type **Key Vault reference** → paste the Key Vault secret URI for `foundry-iq-key` (find it in Key Vault → Secrets → `foundry-iq-key` → current version → **Secret Identifier** URI)
   - Add `entra-client-secret-ref` the same way for `entra-client-secret`
2. Left sidebar → **Containers** → **Edit and deploy**
   - Click the container name → **Environment variables** → **+ Add**
     - `FOUNDRY_IQ_KEY` → Source: **Reference a secret** → select `foundry-iq-key-ref`
     - `ENTRA_CLIENT_SECRET` → Source: **Reference a secret** → select `entra-client-secret-ref`
   - Click **Save** → **Create** (creates a new revision)

### 5h — Verify the server is running

In your browser, open: `https://<MCP_SERVER_URL>/health`
Expected response:
```json
{"status":"ok","version":"1.0.0"}
```

If you get an error, open the Container App → left sidebar → **Log stream** to see startup logs.

---

## Step 6 — Populate agent/env/.env.local

On your local machine, open `agent/env/.env.local` in a text editor (create the file if it doesn't exist) and fill in all values:

```env
TEAMS_APP_ID=                                              # ← filled after Step 7
TEAMSFX_ENV=dev

AAD_APP_CLIENT_ID=<DA_APP_ID>
AAD_APP_TENANT_ID=<TENANT_ID>
AAD_APP_OAUTH_AUTHORITY=https://login.microsoftonline.com/<TENANT_ID>
AAD_APP_OAUTH_AUTHORITY_HOST=https://login.microsoftonline.com/

MCP_SERVER_URL=https://<your-aca-fqdn>.azurecontainerapps.io
OAUTH_REGISTRATION_ID=                                     # ← filled after Step 7

SHAREPOINT_TENANT=<your-tenant-name>
SHAREPOINT_SITE=RFPCorpus
```

Also open `agent/appPackage/ai-plugin.json` and replace any `${{MCP_SERVER_URL}}` placeholder with your actual `MCP_SERVER_URL` value.

---

## Step 7 — Publish the Declarative Agent

### Create the app zip

On your local machine, open PowerShell and run:

```powershell
cd "c:\Users\UserName\Downloads\Research\Microsoft"
$pkg = "agent\appPackage"
Compress-Archive -Path "$pkg\manifest.json","$pkg\declarativeAgent.json","$pkg\ai-plugin.json","$pkg\color.png","$pkg\outline.png" -DestinationPath agent\rfp-respond-app.zip -Force
```

> **Important:** Zip only those five files. Do **not** use `agent\appPackage\*` — that pulls in `aad.manifest.json` (an Entra provisioning artifact, not part of the app package), which causes the portal to reject the upload with *"Provided add-in package was not understood."*

### Upload to Teams Developer Portal

**First, register the OAuth client** (the MCP server requires an Entra Bearer token, so the plugin needs an OAuth registration ID):

1. Go to **dev.teams.microsoft.com** and sign in with your M365 account
   > **Prerequisite — on the `RFPRespond-DA` app registration (Entra):** (a) add a **Web** redirect URI `https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect`; (b) under **API permissions** add **My APIs → RFPRespond-MCP → `RFPRespond.Access`** (delegated) and **Grant admin consent**. Without (b), Entra won't issue a token for the MCP scope below.

2. Left sidebar → **Tools** → **OAuth client registration** → **+ New OAuth client registration**
   - Registration name: `RFPRespond MCP`
   - Base URL: `MCP_APP_URL`
   - **Client ID:** `DA_APP_ID` — the `RFPRespond-DA` app (Copilot is the OAuth *client*)
   - **Client secret:** `DA_CLIENT_SECRET`
   - **Authorization endpoint:** `https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/authorize`
   - **Token endpoint:** `https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token`
   - **Scope:** `api://<MCP_APP_ID>/RFPRespond.Access` (the scope exposed on the `RFPRespond-MCP` resource app — **not** the DA app)
   - Enable PKCE if offered → **Save**
3. Copy the generated **Registration ID** → save it as `OAUTH_REGISTRATION_ID`
4. Open `agent/appPackage/ai-plugin.json` and replace `REPLACE_WITH_TDP_OAUTH_REGISTRATION_ID` with that Registration ID, then **re-run the zip command above**.

**Then import the app:**

1. Left sidebar → **Apps** → **Import app**
2. Select the **`agent/rfp-respond-app.zip`** file you created (you upload the zip, not the folder)
3. Review the app details — fix any validation errors the portal highlights
4. Click **Publish** → **Publish to your org**
5. After publishing, click on the app to view its details — copy the **App ID** → save as `TEAMS_APP_ID`
6. Go back to `agent/env/.env.local` and fill in `TEAMS_APP_ID`

### Install in Copilot Chat

1. Go to **teams.microsoft.com** or **office.com/copilot**
2. In Copilot Chat, click the **Agents** button (four-square icon in the message bar or sidebar)
3. Find **RFPRespond** under "Built for your org"
4. Click **Add**
5. The first time you use it, you'll be prompted to grant OAuth consent for the Graph permissions — click **Accept**

> **Note:** It can take 5–10 minutes after publishing for the agent to appear in the Agents list.

---

## Step 8 — Create a Planner Plan (Optional)

This enables the `assignToSme` tool to create real tasks for expert review.

1. Go to **tasks.office.com**
2. Click **+ New plan** → name it `RFP Review` → **Create plan**
3. Copy the plan ID from the URL bar: `https://tasks.office.com/YOUR_TENANT/Home/PlanViews/**THIS_PART_IS_THE_ID**`

Update the Container App with this ID:
1. Open `rfp-respond-mcp` Container App → left sidebar → **Containers** → **Edit and deploy**
2. Click the container name → **Environment variables** → find `PLANNER_PLAN_ID` → set its value to your plan ID
3. Click **Save** → **Create** (new revision deploys automatically)

---

## Step 9 — Smoke Test

Open Microsoft 365 Copilot Chat with RFPRespond enabled and try these:

**Test 1 — Knowledge corpus:**
```
What are our SOC 2 Type II audit policies?
```
Expected: A cited answer drawn from the sample corpus, with source document names.

**Test 2 — People graph:**
```
Who is our best expert on data encryption?
```
Expected: A person name from your org's Work IQ, with a rationale.

**Test 3 — RFP drafting:**
```
Here are some RFP security questions:
1. Do you maintain SOC 2 Type II certification?
2. How do you handle data retention and disposal?
3. What MFA methods do you support?
Please draft answers and flag any you're not confident about.
```
Expected: Drafted answers with confidence scores, low-confidence ones flagged for SME review.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| App registration "Grant admin consent" is greyed out | You need Global Admin or Privileged Role Admin — ask your tenant admin |
| Cloud Shell `az acr build` fails | Make sure the Container Registry is fully deployed and your ACR name is correct |
| `/health` returns 502 or connection refused | Wait 2 minutes for the container to start; check Log stream for errors |
| Key Vault secret reference fails | Ensure the managed identity was enabled BEFORE linking secrets, and the role assignment was saved |
| Copilot doesn't show RFPRespond | Wait 5–10 min for tenant app catalog propagation; try refreshing Copilot |
| `retrieveAnswer` returns low confidence | Add more Q&A documents to the Azure AI Search index via the Search Explorer |
| Container App shows old environment variables | Create a new revision: Containers → Edit and deploy → Create |

---
