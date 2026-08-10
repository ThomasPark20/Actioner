# Technical Analysis Report: Miasma Worm Supply Chain Attack (2026-06-07)

Prepared by: Actioner
Classification: TLP:WHITE
Date: 2026-06-07
Version: 1.0

## Executive Summary

Miasma is a self-replicating supply chain worm -- a weaponized variant of the "Mini Shai-Hulud" malware released publicly by TeamPCP in May 2026 -- that exploits the trust model of open-source software ecosystems by compromising legitimate developer credentials and CI/CD pipelines. The worm impacted at least 73 Microsoft GitHub repositories (across Azure, Azure-Samples, Microsoft, and MicrosoftDocs organizations), 32 compromised packages within the @redhat-cloud-services npm scope, and 57 additional packages across 286+ malicious versions including high-traffic packages such as `@vapi-ai/server-sdk` (408K+ monthly downloads) and `ai-sdk-ollama` (120K+ monthly downloads). The attack uniquely targets AI coding agents (Claude Code, Gemini CLI, Cursor, VS Code) by poisoning their configuration files to auto-execute a 4.3 MB obfuscated payload (`setup.js`) upon project open. The payload employs a four-stage obfuscation chain (ROT-N Caesar cipher, AES-128-GCM, Bun runtime loader, encrypted string table), harvests cloud credentials from AWS/GCP/Azure/GitHub Actions runner memory, propagates through npm/RubyGems/GitHub via forged SLSA attestations, and exfiltrates data through multiple C2 channels including programmatic GitHub repositories under the `liuende501` account. GitHub disabled access to compromised repositories within 105 seconds of detection.

## Background: Open-Source Software Supply Chain and AI Developer Tools

The open-source software supply chain relies on a chain of trust: developers authenticate to package registries (npm, PyPI, RubyGems) and source repositories (GitHub) using credentials, tokens, and CI/CD-issued OIDC tokens. Packages are installed and built by developer tools that automatically execute lifecycle scripts (install, build, test). The recent proliferation of AI-assisted coding tools -- Claude Code, Gemini CLI, Cursor, VS Code with Copilot -- introduces a new attack surface: these tools read workspace configuration files and can automatically execute commands at session start, making them vectors for code execution without explicit user action. The Miasma worm exploits both the traditional package-registry trust model and this new AI-tool configuration surface simultaneously.

## Attack Timeline (All Times UTC)

| Timestamp | Event |
|-----------|-------|
| 2026-05 (early) | TeamPCP publicly releases Mini Shai-Hulud malware |
| 2026-05 (mid) | Miasma worm variant begins spreading; developer credentials compromised |
| 2026-05 to 2026-06 | 57 packages across 286+ malicious versions published to npm; 73 Microsoft GitHub repos injected with `.github/setup.js` |
| 2026-05 to 2026-06 | 32 packages within @redhat-cloud-services scope trojanized via CI/CD pipeline compromise of RedHatInsights/javascript-clients |
| 2026-06 (detection) | GitHub disables access to 73 compromised Microsoft repositories within 105 seconds |
| 2026-06-07 | Microsoft, StepSecurity, and community publish detailed technical analyses |

## Root Cause: CI/CD Pipeline Compromise and Credential Theft

The attack exploits multiple initial access vectors simultaneously:

1. **Developer credential compromise:** Legitimate developer credentials are harvested from compromised environments, enabling authenticated pushes to trusted repositories and package registries.
2. **GitHub Actions OIDC exploitation:** The worm exploits GitHub Actions OIDC publishing workflows to obtain legitimate npm publish tokens, then publishes trojanized packages with valid Sigstore provenance attestations (forged SLSA).
3. **gyp command substitution ("Phantom Gyp"):** A 157-byte `binding.gyp` file uses gyp's `<!(...)` command substitution syntax to execute arbitrary shell commands during native module builds, bypassing `package.json` script monitoring entirely.
4. **AI tool configuration poisoning:** Workspace configuration files for five developer tools are injected to auto-execute the payload without user interaction.

## Technical Analysis of the Malicious Payload

### 1. Initial Entry -- Phantom Gyp and AI Tool Hooks

**binding.gyp (Phantom Gyp technique):** A minimal 157-byte `binding.gyp` file exploits gyp's command substitution feature `<!(command)` to execute arbitrary shell commands during the native module build phase. This bypasses all `package.json` script-level monitoring since gyp execution occurs at a lower level in the build toolchain.

**AI tool configuration injection:** Five developer tools are targeted via workspace configuration files:

| Tool | Config File | Mechanism |
|------|------------|-----------|
| Claude Code | `.claude/settings.json` | `SessionStart` hook with `"matcher": "*"` pointing to `.github/setup.js` |
| Gemini CLI | `.gemini/settings.json` | `SessionStart` hook with `"matcher": "*"` pointing to `.github/setup.js` |
| Cursor IDE | `.cursor/rules/setup.mdc` | Injected system prompt with `alwaysApply` flag |
| VS Code | `.vscode/tasks.json` | Workspace task with `"runOn": "folderOpen"` |
| npm | `package.json` | `test` script hijacked for CI/CD execution |

**Payload sizing evasion:** The `.github/setup.js` payload is 4.3 MB, intentionally exceeding GitHub's ~384 KB indexing threshold to avoid static security scanners and code search indexing.

### 2. Four-Stage Obfuscation Chain

**Stage 1 -- ROT-N Caesar Cipher:** The outer layer uses a Caesar cipher with embedded `eval()`. Contains approximately 1.3 million character codes with a variable rotation factor (ROT-9 through ROT-20) that differs per compromised package, preventing a single static signature.

**Stage 2 -- AES-128-GCM Self-Decrypting Layer:** Hex-encoded blobs with inline encryption keys and initialization vectors. Uses Node.js `node:crypto` module for decryption.

**Stage 3 -- Bun Runtime Loader:** Downloads and executes the Bun JavaScript runtime as an alternative to Node.js. This moves execution outside Node.js monitoring and security tooling, creating the distinctive `node -> shell -> bun` process chain.

**Stage 4 -- Obfuscated Main Payload:** A 668 KB payload processed by obfuscator.io, containing a 2,306-entry encrypted string table using custom PBKDF2-HMAC-SHA-256 with 200,000 iterations for string decryption.

### 3. C2 Infrastructure

Three distinct C2 channels are employed:

**Channel A -- GitHub Repository Exfiltration:** Credentials are uploaded as encrypted JSON files with RSA-encrypted envelopes to programmatic repositories under `github.com/liuende501`. At the time of analysis, this account hosted 236 programmatic repositories. The beacon keyword `thebeautifulmarchoftime` is used for C2 coordination.

**Channel B -- Victim Repository Injection:** Data is injected directly into victim repositories via the GitHub Git Data API, embedding stolen credentials within the repository's own git objects.

**Channel C -- Dormant HTTPS Channel:** An HTTPS sender targeting `api.anthropic.com:443/v1/api` is present in the code but disabled via `_noop: true` flag, suggesting a future or backup exfiltration channel.

**Campaign markers:**
- Repository descriptions set to "Miasma: The Spreading Blight"
- Randomized repository naming pattern: `adjective-creature-<0-99999>`
- Spoofed commit email: `github-actions@github.com`

### 4. Credential Harvesting and Propagation

**Credential targets (comprehensive):**
- AWS: Access keys, secret keys, session tokens, IMDSv2 metadata (ECS container credentials)
- GCP: Service account credentials, Secret Manager access
- Azure: Managed identity tokens, Key Vault secrets, OAuth2 tokens
- GitHub: Tokens via GraphQL API, Actions runner process memory scraping via `/proc/{pid}/mem`
- HashiCorp Vault tokens
- Kubernetes service account tokens
- npm authentication credentials
- SSH private keys
- Browser data (cookies, saved passwords)
- Cryptocurrency wallet data

**GitHub Actions runner memory scraping:** The worm scans `/proc` for `Runner.Worker` processes and uses grep patterns against unmasked process memory to extract secrets that are masked in logs but present in process memory.

**Propagation engines:**
- **npm:** Exchanges OIDC tokens for npm publish rights; forges SLSA provenance via Sigstore (fraudulent attestations)
- **RubyGems:** Parallel propagation to Ruby ecosystem
- **GitHub:** Enumerates victim repositories via GitHub API, injects `.github/setup.js` into non-protected branches

### 5. Anti-Forensics / Evasion Techniques

- **Payload size evasion:** 4.3 MB file exceeds GitHub's ~384 KB code search indexing threshold
- **Variable obfuscation:** ROT factor varies per package (ROT-9 to ROT-20), preventing universal static signatures
- **Runtime evasion:** Execution shifts from Node.js to Bun runtime, evading Node.js-specific security monitoring
- **Privilege escalation:** Passwordless sudo via `/etc/sudoers.d` bind mount; `/etc/hosts` DNS redirection
- **Provenance forgery:** Sigstore SLSA attestations are forged, making trojanized packages appear legitimately signed
- **Legitimate signatures:** Exploitation of GitHub Actions OIDC workflows produces packages with valid, legitimate npm provenance signatures
- **Dormant C2:** The Anthropic API exfiltration channel is coded but disabled (`_noop: true`), reducing detectable network behavior

## Indicators of Compromise (IOCs)

> **Defanging Convention:** All IOCs in this report use defanged notation to prevent accidental resolution or click-through:
> - URLs: `hxxps://` or `hxxp://` (e.g., `hxxps://evil[.]com/payload`)
> - Domains: `[.]` replacing dots (e.g., `evil[.]com`)
> - IP addresses: `[.]` replacing dots (e.g., `1.2.3[.]4`)
> - Email addresses: `[at]` replacing @ (e.g., `attacker[at]evil[.]com`)

### Package / Software Level

| Package / Component | Malicious Version(s) | Description |
|---------------------|---------------------|-------------|
| `@redhat-cloud-services/frontend-components` | 7.7.2, 7.7.3, 7.7.5 | Trojanized Red Hat npm package |
| `@redhat-cloud-services/rbac-client` | 9.0.3, 9.0.4, 9.0.6 | Trojanized Red Hat npm package |
| `@redhat-cloud-services/compliance-client` | 4.0.3, 4.0.4, 4.0.6 | Trojanized Red Hat npm package |
| `@redhat-cloud-services/notifications-client` | 6.1.4, 6.1.5, 6.1.7 | Trojanized Red Hat npm package |
| `@redhat-cloud-services/insights-client` | 4.0.4, 4.0.5, 4.0.7 | Trojanized Red Hat npm package |
| `@redhat-cloud-services/chrome` | (compromised versions) | Trojanized Red Hat npm package |
| `@redhat-cloud-services/entitlements-client` | (compromised versions) | Trojanized Red Hat npm package |
| `@redhat-cloud-services/sources-client` | (compromised versions) | Trojanized Red Hat npm package |
| `@redhat-cloud-services/integrations-client` | (compromised versions) | Trojanized Red Hat npm package |
| `@redhat-cloud-services/config-manager-client` | (compromised versions) | Trojanized Red Hat npm package |
| `@vapi-ai/server-sdk` | (compromised versions) | 408K+ monthly downloads; malicious payload injected |
| `ai-sdk-ollama` | (compromised versions) | 120K+ monthly downloads; malicious payload injected |
| `durabletask` (PyPI) | (compromised versions) | Python package targeted |

### File System

| Platform | Path | Hash (SHA256) | Description |
|----------|------|---------------|-------------|
| Cross-platform | `.github/setup.js` | -- | 4.3 MB obfuscated payload; primary execution vector |
| Cross-platform | `binding.gyp` | -- | 157-byte Phantom Gyp trigger file |
| Cross-platform | `.claude/settings.json` | -- | Claude Code session hook configuration |
| Cross-platform | `.gemini/settings.json` | -- | Gemini CLI session hook configuration |
| Cross-platform | `.cursor/rules/setup.mdc` | -- | Cursor IDE system prompt injection |
| Cross-platform | `.vscode/tasks.json` | -- | VS Code workspace task auto-run |
| npm | `remediations-client` (compromised) | `396cac9e457ec54ff6d3f6311cb5cc1da8054d019ce3ffa1de5741506c7a4ea4` | Malicious package artifact |
| npm | `advisor-components` (compromised) | `d8d170af3de17bb9b217c52aaaffdf9395f35ef015a57ef676e406c121e5e223` | Malicious package artifact |
| npm | `kessel-mcp` (compromised) | `f0641e053e81f0d01fa46db35a83e0a34494886503086866d956d14e81fd3e1c` | Malicious package artifact |

### Network

| Type | Value | Context |
|------|-------|---------|
| GitHub Account | `github[.]com/liuende501` | Primary C2 exfiltration -- 236 programmatic repos hosting stolen credentials |
| URL Pattern | `hxxps://api[.]anthropic[.]com:443/v1/api` | Dormant C2 channel (disabled: `_noop: true`) |
| Email (spoofed) | `github-actions[at]github[.]com` | Spoofed commit author email in propagation |

### Behavioral

- **Process chain:** `node` spawns shell, which downloads and executes `bun` runtime -- an unusual process tree (`node -> sh/bash -> bun`)
- **Bun download from temp directories:** The Bun JS runtime is downloaded to and executed from temporary directories during build/install
- **GitHub repository creation burst:** Rapid programmatic creation of repositories matching `adjective-creature-<0-99999>` naming pattern
- **Cloud metadata endpoint access from build processes:** Build/CI processes accessing AWS IMDS (`169.254.169.254`), Azure IMDS, or GCP metadata endpoints
- **Repository description marker:** Repos with description "Miasma: The Spreading Blight"
- **Beacon keyword:** String `thebeautifulmarchoftime` in C2 communications
- **`/proc/{pid}/mem` scanning:** Process memory scraping targeting `Runner.Worker` processes in GitHub Actions
- **Large `.github/setup.js`:** JavaScript file in `.github/` exceeding 384 KB (GitHub indexing threshold)
- **Passwordless sudo injection:** Bind mount of `/etc/sudoers.d` for privilege escalation
- **DNS redirection:** `/etc/hosts` modification for DNS hijacking

## MITRE ATT&CK Mapping

| TID | Technique | Observed Behavior |
|-----|-----------|-------------------|
| T1195.002 | Supply Chain Compromise: Compromise Software Supply Chain | Trojanized npm packages with legitimate signatures; compromised GitHub repositories |
| T1195.001 | Supply Chain Compromise: Compromise Software Dependencies and Development Tools | Poisoned AI tool configuration files (Claude Code, Gemini CLI, Cursor, VS Code) |
| T1059.007 | Command and Scripting Interpreter: JavaScript | Multi-stage JavaScript payload (`setup.js`) with eval()-based deobfuscation |
| T1059.004 | Command and Scripting Interpreter: Unix Shell | Shell spawned by node to download and execute Bun runtime |
| T1027.013 | Obfuscated Files or Information: Encrypted/Encoded File | Four-stage obfuscation: ROT-N, AES-128-GCM, Bun loader, PBKDF2 string table |
| T1027.002 | Obfuscated Files or Information: Software Packing | obfuscator.io packing with 2,306-entry encrypted string table |
| T1552.004 | Unsecured Credentials: Private Keys | Harvesting SSH private keys from compromised systems |
| T1552.005 | Unsecured Credentials: Cloud Instance Metadata API | Querying AWS IMDSv2, Azure IMDS, GCP metadata for cloud credentials |
| T1528 | Steal Application Access Token | Stealing GitHub tokens, npm auth tokens, OIDC tokens |
| T1003.007 | OS Credential Dumping: Proc Filesystem | Scraping `/proc/{pid}/mem` of GitHub Actions Runner.Worker for secrets |
| T1048 | Exfiltration Over Alternative Protocol | Exfiltration via GitHub API (creating repos/files with stolen data) |
| T1567.001 | Exfiltration Over Web Service: Exfiltration to Code Repository | Uploading encrypted credential JSON to github.com/liuende501 repos |
| T1071.001 | Application Layer Protocol: Web Protocols | C2 communication over HTTPS to GitHub API and dormant Anthropic API endpoint |
| T1036.005 | Masquerading: Match Legitimate Name or Location | Spoofed `github-actions@github.com` commit email |
| T1546 | Event Triggered Execution | Auto-execution via IDE config files (`folderOpen`, `SessionStart`, `alwaysApply`) |
| T1105 | Ingress Tool Transfer | Downloading Bun runtime during payload execution |
| T1548.003 | Abuse Elevation Control Mechanism: Sudo and Sudo Caching | Passwordless sudo via `/etc/sudoers.d` bind mount |
| T1565.001 | Data Manipulation: Stored Data Manipulation | Injecting malicious code into victim repositories via Git Data API |

## Impact Assessment

**Breadth:** 73 Microsoft GitHub repositories across four organizations disabled; 32 Red Hat npm packages compromised; 57 additional packages across 286+ malicious versions published; high-traffic packages (`@vapi-ai/server-sdk` at 408K+/month, `ai-sdk-ollama` at 120K+/month) affected, implying tens of thousands of downstream installations.

**Depth:** The worm harvests credentials for all major cloud providers (AWS, GCP, Azure), CI/CD systems (GitHub Actions), infrastructure tools (HashiCorp Vault, Kubernetes), and developer assets (SSH keys, browser data, crypto wallets). Compromised credentials enable lateral movement across cloud infrastructure. The forging of SLSA attestations undermines the entire Sigstore provenance verification system.

**Stealth:** The four-stage obfuscation chain, variable ROT factors per package, payload sizing above scanner thresholds, runtime shifting to Bun, and legitimate package signatures all significantly complicate detection. The dormant Anthropic API C2 channel suggests capability held in reserve.

**AI tool surface:** This is the first known supply chain worm to weaponize AI coding agent configuration files as an execution vector, establishing a new threat category for developer tool security.

## Detection & Remediation

### Immediate Detection

**Check for Miasma artifacts in local repositories:**
```bash
# Check for the malicious setup.js payload
find ~/projects -name "setup.js" -path "*/.github/*" -size +300k -ls

# Check for AI tool configuration poisoning
find ~/projects -name "settings.json" -path "*/.claude/*" -exec grep -l "setup.js" {} \;
find ~/projects -name "settings.json" -path "*/.gemini/*" -exec grep -l "setup.js" {} \;
find ~/projects -name "setup.mdc" -path "*/.cursor/rules/*" -exec grep -l "alwaysApply" {} \;
find ~/projects -name "tasks.json" -path "*/.vscode/*" -exec grep -l "folderOpen" {} \;

# Check for Phantom Gyp binding files with command substitution
find ~/projects -name "binding.gyp" -exec grep -l '<!' {} \;

# Check for the C2 beacon keyword
grep -r "thebeautifulmarchoftime" ~/projects/

# Check for campaign marker in git remotes or descriptions
grep -r "Miasma" ~/projects/*/.git/description 2>/dev/null

# Verify installed npm packages against known malicious hashes
echo "396cac9e457ec54ff6d3f6311cb5cc1da8054d019ce3ffa1de5741506c7a4ea4
d8d170af3de17bb9b217c52aaaffdf9395f35ef015a57ef676e406c121e5e223
f0641e053e81f0d01fa46db35a83e0a34494886503086866d956d14e81fd3e1c" > /tmp/miasma-hashes.txt
find ~/projects/node_modules -name "*.tgz" -exec sha256sum {} \; | grep -f /tmp/miasma-hashes.txt
```

**Check for Bun runtime in temp directories:**
```bash
find /tmp -name "bun" -executable -ls 2>/dev/null
find /var/tmp -name "bun" -executable -ls 2>/dev/null
```

**Check for compromised @redhat-cloud-services packages:**
```bash
npm ls @redhat-cloud-services/frontend-components 2>/dev/null | grep -E "7\.7\.[235]"
npm ls @redhat-cloud-services/rbac-client 2>/dev/null | grep -E "9\.0\.[346]"
npm ls @redhat-cloud-services/compliance-client 2>/dev/null | grep -E "4\.0\.[346]"
```

### Remediation

1. **Containment (immediate):**
   - Revoke ALL GitHub tokens, npm tokens, and cloud credentials (AWS access keys, GCP service account keys, Azure managed identity tokens) on any system that may have built or installed affected packages
   - Rotate SSH keys on affected developer machines
   - Audit GitHub Actions OIDC token usage for unauthorized npm publishes

2. **Eradication:**
   - Remove all instances of `.github/setup.js`, poisoned `.claude/settings.json`, `.gemini/settings.json`, `.cursor/rules/setup.mdc`, and `.vscode/tasks.json` from repositories
   - Remove compromised package versions and pin to known-good versions
   - Audit all `binding.gyp` files for `<!()` command substitution
   - Check for unauthorized `/etc/sudoers.d` modifications and `/etc/hosts` changes

3. **Recovery:**
   - Re-publish clean versions of any packages published with stolen credentials
   - Invalidate and re-issue Sigstore attestations for legitimate packages
   - Review GitHub repository access logs for unauthorized pushes from `github-actions@github.com`

4. **Secret rotation (comprehensive):**
   - AWS: Rotate all IAM access keys; review CloudTrail for unauthorized API calls
   - GCP: Rotate service account keys; audit Secret Manager access
   - Azure: Rotate managed identity credentials; audit Key Vault access logs
   - GitHub: Regenerate all PATs and deploy keys; review organization audit logs
   - HashiCorp Vault: Rotate root and application tokens
   - Kubernetes: Rotate service account tokens

### Long-Term Hardening

- **Enable branch protection** on all repository branches to prevent unauthorized pushes
- **Pin GitHub Actions** to specific commit SHAs rather than mutable tags
- **Implement npm package provenance verification** and monitor for unexpected publisher changes
- **Audit AI tool configuration files** (`.claude/`, `.gemini/`, `.cursor/`, `.vscode/`) in version control diffs before accepting
- **Restrict `binding.gyp` usage:** Audit all native modules for command substitution; consider sandboxed build environments
- **Limit IMDS access** from CI/CD runners using IMDSv2 hop limits and network policies
- **Monitor for Bun runtime** downloads and executions in build environments where it is not expected
- **Implement egress filtering** on CI/CD runners to prevent unauthorized GitHub API calls and repository creation

## Detection Rules

<!-- revision: applied critic verdict — dropped 2 rules (VS Code tasks.json, Phantom Gyp node-gyp), fixed 8 rules per critic feedback -->

This section provides 16 detection rules targeting the distinctive artifacts of the Miasma worm supply chain attack at PoC/advisory-specific altitude. They key on concrete indicators: the `.github/setup.js` payload path, AI tool configuration poisoning patterns, the Phantom Gyp technique, C2 markers (`thebeautifulmarchoftime`, `liuende501`), the `node->bun` process chain, known malicious hashes, and campaign markers. All rules are structurally validated; run `/actioner:setup` to install the full compilation toolchain (sigma-cli + Splunk/CrowdStrike backends + yara + snort + suricata).

### Sigma: Miasma Worm -- Bun Runtime Execution from Temp Directory

Detects the Bun JavaScript runtime being executed from temporary directories, a hallmark of the Miasma payload's Stage 3 loader that downloads Bun outside the normal Node.js monitoring path. Scope to build/CI systems to reduce false positives from legitimate Bun development use.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: medium
<!-- audit: no toolchain installed; structural check: valid YAML, correct logsource category/product, detection logic uses endswith+contains correctly, no defanged values, UUIDv4 valid, tags are technique-only. FP risk: medium — any developer running bun from /tmp (CI matrix installs, npx-style temp runners) will trip this. No Miasma-exclusive artifact is checked. Confidence downgraded from high to medium per review. -->
```yaml
title: Miasma Worm - Bun Runtime Execution from Temp Directory
id: 3f8a1c7e-9b2d-4e6f-a5d1-8c3b0f7e2a94
status: experimental
description: >
    Detects execution of the Bun JavaScript runtime from temporary directories,
    consistent with the Miasma worm's Stage 3 payload which downloads Bun to /tmp
    to execute outside Node.js security monitoring.
references:
    - https://www.stepsecurity.io/blog/miasma-worm-phantom-gyp
    - https://www.microsoft.com/en-us/security/blog/2026/06/05/miasma-npm-supply-chain-attack/
author: Actioner
date: 2026/06/07
tags:
    - attack.t1059.007
    - attack.t1105
logsource:
    category: process_creation
    product: linux
detection:
    selection:
        Image|endswith: '/bun'
        Image|contains:
            - '/tmp/'
            - '/var/tmp/'
    condition: selection
falsepositives:
    - Developers intentionally running Bun from temporary directories
    - Automated test frameworks using temporary Bun installations
    - CI matrix installs and npx-style temporary runners using Bun
level: medium
```

### Sigma: Miasma Worm -- Node to Shell to Bun Process Chain

Detects the distinctive `node -> shell -> bun` process execution chain created by the Miasma payload as it transitions from the initial Node.js context through a shell to the downloaded Bun runtime.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: medium
<!-- audit: no toolchain installed; structural check: valid YAML, logsource process_creation/linux, parent-child chain detection via ParentImage+Image, no defanged values. FP risk: medium — `contains: 'node'` on ParentCommandLine is fragile (matches paths containing 'node' unrelated to Node.js, e.g. /usr/share/libreoffice/share/basic/SFDocuments). Renamed filter_grandparent to selection_grandparent (Sigma filter_* semantics denote exclusions). Confidence downgraded from high to medium per review. -->
```yaml
title: Miasma Worm - Node to Shell to Bun Process Chain
id: 7d4e2f9a-1b3c-4a8d-b6e5-9f0c3d7a1e82
status: experimental
description: >
    Detects the unusual process chain of node spawning a shell which then executes
    the Bun runtime, consistent with the Miasma worm's multi-stage payload execution
    where Node.js hands off to Bun to evade Node-specific monitoring.
references:
    - https://www.stepsecurity.io/blog/miasma-worm-phantom-gyp
    - https://www.microsoft.com/en-us/security/blog/2026/06/05/miasma-npm-supply-chain-attack/
author: Actioner
date: 2026/06/07
tags:
    - attack.t1059.007
    - attack.t1059.004
logsource:
    category: process_creation
    product: linux
detection:
    selection:
        ParentImage|endswith:
            - '/sh'
            - '/bash'
            - '/dash'
        Image|endswith: '/bun'
    selection_grandparent:
        ParentCommandLine|contains: 'node'
    condition: selection and selection_grandparent
falsepositives:
    - Custom build scripts that legitimately chain node, shell, and bun
    - Paths containing the substring 'node' in ParentCommandLine (fragile match)
level: high
```

### Sigma: Miasma Worm -- Malicious .github/setup.js File Creation

Detects creation of the `.github/setup.js` file, the primary Miasma worm payload vector injected into compromised repositories. The legitimate `.github/` directory rarely contains JavaScript files, especially ones exceeding 300 KB.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: high
<!-- audit: no toolchain installed; structural check: valid YAML, logsource file_event/linux, TargetFilename field standard for Sysmon-for-Linux, endswith pattern correct. FP risk: extremely low -- .github/setup.js is not a standard GitHub convention. -->
```yaml
title: Miasma Worm - Malicious .github/setup.js File Creation
id: b2c8d4e6-3a1f-4b9e-8d7c-5f0e2a6b1c93
status: experimental
description: >
    Detects creation of a setup.js file in the .github directory, consistent with
    the Miasma worm's primary payload injection vector. Legitimate repositories
    do not use .github/setup.js as a convention.
references:
    - https://thehackernews.com/2026/06/miasma-worm-supply-chain.html
    - https://www.microsoft.com/en-us/security/blog/2026/06/05/miasma-npm-supply-chain-attack/
author: Actioner
date: 2026/06/07
tags:
    - attack.t1195.002
    - attack.t1059.007
logsource:
    category: file_event
    product: linux
detection:
    selection:
        TargetFilename|endswith: '/.github/setup.js'
    condition: selection
falsepositives:
    - Custom GitHub automation scripts (very rare in .github/ as .js)
level: critical
```

### Sigma: Miasma Worm -- AI Tool Configuration Poisoning (Claude Code / Gemini CLI)

Detects creation of Claude Code or Gemini CLI settings files in workspace directories. This is a hunt rule: it fires on ANY creation of these files, which is also legitimate developer activity. The `file_event` logsource cannot inspect file content, so this rule has no content-awareness -- it flags file creation only. Pair with content inspection or YARA scanning for `setup.js` references to confirm malicious intent.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: low
<!-- audit: no toolchain installed; structural check: valid YAML, file_event category, TargetFilename endswith for both claude and gemini config paths. FP risk: high -- fires on ANY creation of .claude/settings.json or .gemini/settings.json, which is legitimate developer activity. This is effectively a behavioral/TTP hunt rule at specific altitude. Confidence downgraded from high to low; level downgraded to low per review. No content awareness via file_event logsource. -->
```yaml
title: Miasma Worm - AI Tool Configuration Poisoning
id: e1f3a5b7-2c4d-4e8f-9a6b-3d0e7c1f5a28
status: experimental
description: >
    Detects creation of Claude Code or Gemini CLI settings files in workspace
    directories, which Miasma uses to inject SessionStart hooks that auto-execute
    the .github/setup.js payload when the AI coding tool opens the project.
    Hunt rule only -- fires on file creation without content awareness.
references:
    - https://cybersecguru.com/2026/06/miasma-ai-coding-agent-targeting
    - https://thehackernews.com/2026/06/miasma-worm-supply-chain.html
author: Actioner
date: 2026/06/07
tags:
    - attack.t1546
    - attack.t1195.001
logsource:
    category: file_event
    product: linux
detection:
    selection:
        TargetFilename|endswith:
            - '/.claude/settings.json'
            - '/.gemini/settings.json'
    condition: selection
falsepositives:
    - Legitimate AI tool configuration by developers (this rule fires on any creation of these files)
level: low
```

<!-- dropped: Sigma "VS Code tasks.json Creation in Repository" — fires on ANY .vscode/tasks.json creation, one of the most common IDE config files. Pure noise at specific altitude; file_event logsource cannot inspect content to distinguish malicious folderOpen directives from legitimate workspace tasks. -->

### Sigma: Miasma Worm -- GitHub Actions Runner Memory Scraping via /proc

Detects processes reading `/proc/*/mem` files while targeting `Runner.Worker` processes, consistent with the Miasma worm's credential scraping technique that extracts unmasked secrets from GitHub Actions runner process memory.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: high
<!-- audit: no toolchain installed; structural check: valid YAML, process_creation category, CommandLine contains patterns for /proc/ mem access and Runner.Worker grep. FP risk: very low -- reading Runner.Worker process memory is highly anomalous. -->
```yaml
title: Miasma Worm - GitHub Actions Runner Memory Scraping
id: c5e7f9a1-3b2d-4c8e-a6d4-7f0b1e3c5a92
status: experimental
description: >
    Detects attempts to read process memory via /proc/pid/mem targeting GitHub
    Actions Runner.Worker processes, a technique used by Miasma to extract
    unmasked secrets from runner process memory.
references:
    - https://www.microsoft.com/en-us/security/blog/2026/06/05/miasma-npm-supply-chain-attack/
    - https://www.stepsecurity.io/blog/miasma-worm-phantom-gyp
author: Actioner
date: 2026/06/07
tags:
    - attack.t1003.007
    - attack.t1528
logsource:
    category: process_creation
    product: linux
detection:
    selection_proc_read:
        CommandLine|contains|all:
            - '/proc/'
            - '/mem'
    selection_runner_target:
        CommandLine|contains: 'Runner.Worker'
    condition: selection_proc_read and selection_runner_target
falsepositives:
    - Legitimate debugging or profiling of GitHub Actions runners (very rare)
level: critical
```

<!-- dropped: Sigma "Phantom Gyp node-gyp Build Execution" — matches ANY `node-gyp build` invocation, which fires on every native Node.js module install. No Miasma-specific narrowing condition; pure noise at specific altitude. The YARA rule Malware_Miasma_Worm_Phantom_Gyp provides content-aware detection of the actual technique. -->

### Sigma: Miasma Worm -- Cloud Metadata Access from Node/Bun Process

Detects Node.js or Bun processes making network connections to cloud instance metadata endpoints (AWS IMDS, Azure IMDS, GCP metadata), consistent with Miasma's credential harvesting of cloud provider credentials from build environments.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: medium
<!-- audit: no toolchain installed; structural check: valid YAML, network_connection category, Image endswith for node/bun, DestinationIp for metadata endpoints. FP risk: medium — this is a behavioral rule; any cloud-native Node.js application legitimately accessing IMDS will trigger it. No Miasma-specific artifact is checked. Confidence and level downgraded from high to medium per review. -->
```yaml
title: Miasma Worm - Cloud Metadata Access from Node or Bun Process
id: f2a4b6c8-1d3e-4f5a-9b7e-0c8d2e6f4a13
status: experimental
description: >
    Detects Node.js or Bun processes connecting to cloud instance metadata
    endpoints (AWS IMDSv2, Azure, GCP), consistent with Miasma's credential
    harvesting from CI/CD and build environments.
references:
    - https://www.microsoft.com/en-us/security/blog/2026/06/05/miasma-npm-supply-chain-attack/
    - https://www.stepsecurity.io/blog/miasma-worm-phantom-gyp
author: Actioner
date: 2026/06/07
tags:
    - attack.t1552.005
logsource:
    category: network_connection
    product: linux
detection:
    selection_process:
        Image|endswith:
            - '/node'
            - '/bun'
    selection_metadata:
        DestinationIp:
            - '169.254.169.254'
            - '169.254.170.2'
    condition: selection_process and selection_metadata
falsepositives:
    - Cloud-native Node.js applications legitimately querying IMDS for credentials
level: medium
```

### Suricata: Miasma Worm -- C2 Beacon Keyword in HTTP Traffic

Detects the Miasma C2 beacon keyword `thebeautifulmarchoftime` in HTTP traffic, used for C2 coordination and data exfiltration.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: high
<!-- audit: no toolchain installed; structural check: dot-notation buffers, proper msg prefix, sid in 2200000+ range, flow established, all semicolons present, content not defanged. FP risk: extremely low -- the keyword is a distinctive, non-dictionary phrase. -->
```suricata
alert http $HOME_NET any -> $EXTERNAL_NET any (
    msg:"Actioner - Miasma Worm C2 Beacon Keyword thebeautifulmarchoftime";
    flow:established,to_server;
    content:"thebeautifulmarchoftime"; fast_pattern;
    classtype:trojan-activity;
    reference:url,www.stepsecurity.io/blog/miasma-worm-phantom-gyp;
    metadata:author Actioner, created_at 2026-06-07;
    sid:2200001;
    rev:1;
)
```

### Suricata: Miasma Worm -- Exfiltration to liuende501 GitHub Repos

Detects HTTPS traffic to GitHub API endpoints referencing the `liuende501` account, the primary C2 exfiltration destination hosting 236 programmatic repositories for stolen credential storage.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: high
<!-- audit: no toolchain installed; structural check: http protocol with dot-notation buffers, http.host for github.com, http.uri for liuende501, flow correct. FP risk: near zero -- liuende501 is attacker-controlled. -->
```suricata
alert http $HOME_NET any -> $EXTERNAL_NET any (
    msg:"Actioner - Miasma Worm Exfiltration to liuende501 GitHub Account";
    flow:established,to_server;
    http.host; content:"github.com";
    http.uri; content:"liuende501"; fast_pattern;
    classtype:trojan-activity;
    reference:url,www.stepsecurity.io/blog/miasma-worm-phantom-gyp;
    reference:url,www.microsoft.com/en-us/security/blog/2026/06/05/miasma-npm-supply-chain-attack/;
    metadata:author Actioner, created_at 2026-06-07;
    sid:2200002;
    rev:1;
)
```

### Suricata: Miasma Worm -- Dormant C2 Channel to Anthropic API

Detects HTTP traffic to the dormant Miasma C2 endpoint at `api.anthropic.com` on the `/v1/api` path. This rule is speculative and forward-looking: the C2 channel is disabled (`_noop: true`) in all observed samples and has near-zero current operational value. It is included as a proactive hunt rule in case future variants activate this channel.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: low
<!-- audit: no toolchain installed; structural check: tls protocol, tls.sni for SNI matching, flow correct. FP risk: medium -- legitimate Anthropic API usage exists but uses /v1/messages not /v1/api; the specific /v1/api path is the differentiator. Using http protocol to inspect URI after TLS termination or in proxy scenarios. Confidence downgraded from medium to low: C2 channel is disabled (_noop: true) in all observed samples, near-zero operational value. This is speculative/forward-looking. -->
```suricata
alert http $HOME_NET any -> $EXTERNAL_NET any (
    msg:"Actioner - Miasma Worm Dormant C2 Channel to Anthropic API";
    flow:established,to_server;
    http.host; content:"api.anthropic.com";
    http.uri; content:"/v1/api"; startswith; fast_pattern;
    classtype:trojan-activity;
    reference:url,www.microsoft.com/en-us/security/blog/2026/06/05/miasma-npm-supply-chain-attack/;
    metadata:author Actioner, created_at 2026-06-07;
    sid:2200003;
    rev:1;
)
```

### Suricata: Miasma Worm -- Campaign Marker in HTTP Response Body

Detects the campaign marker string "Miasma: The Spreading Blight" in HTTP response content, which is set as the description of attacker-created GitHub repositories.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: high
<!-- audit: no toolchain installed; structural check: http protocol, http.response_body for server-to-client content, flow to_client, fast_pattern on distinctive string. FP risk: near zero -- the exact phrase is campaign-specific. -->
```suricata
alert http $EXTERNAL_NET any -> $HOME_NET any (
    msg:"Actioner - Miasma Worm Campaign Marker in GitHub Repo Description";
    flow:established,to_client;
    http.response_body; content:"Miasma: The Spreading Blight"; fast_pattern;
    classtype:trojan-activity;
    reference:url,www.microsoft.com/en-us/security/blog/2026/06/05/miasma-npm-supply-chain-attack/;
    metadata:author Actioner, created_at 2026-06-07;
    sid:2200004;
    rev:1;
)
```

### Snort: Miasma Worm -- C2 Beacon Keyword in HTTP Traffic

Detects the Miasma C2 beacon keyword `thebeautifulmarchoftime` in HTTP traffic.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: high
<!-- audit: no toolchain installed; structural check: http service, underscore-notation sticky buffers for Snort 3, flow correct, sid in 2100000+ range, all semicolons present. FP risk: near zero. -->
```snort
alert http $HOME_NET any -> $EXTERNAL_NET any (
    msg:"Actioner - Miasma Worm C2 Beacon Keyword thebeautifulmarchoftime";
    flow:established,to_server;
    content:"thebeautifulmarchoftime", fast_pattern;
    classtype:trojan-activity;
    reference:url,www.stepsecurity.io/blog/miasma-worm-phantom-gyp;
    metadata:author Actioner, created 2026-06-07;
    sid:2100001;
    rev:1;
)
```

### Snort: Miasma Worm -- Exfiltration to liuende501 GitHub Account

Detects HTTP traffic to GitHub API referencing the attacker-controlled `liuende501` account.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: high
<!-- audit: no toolchain installed; structural check: http service, http_header:field host for Host-header-specific matching of github.com, http_uri for liuende501, Snort 3 underscore buffers, flow spacing fixed. FP risk: near zero. -->
```snort
alert http $HOME_NET any -> $EXTERNAL_NET any (
    msg:"Actioner - Miasma Worm Exfil to liuende501 GitHub Account";
    flow:established,to_server;
    http_header:field host; content:"github.com";
    http_uri; content:"liuende501", fast_pattern;
    classtype:trojan-activity;
    reference:url,www.stepsecurity.io/blog/miasma-worm-phantom-gyp;
    metadata:author Actioner, created 2026-06-07;
    sid:2100002;
    rev:1;
)
```

### YARA: Miasma Worm -- setup.js Payload Indicators

Detects the Miasma worm's `.github/setup.js` payload via distinctive string artifacts from its multi-stage obfuscation chain and C2 markers.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: medium
<!-- audit: no toolchain installed; structural check: valid YARA syntax, meta section complete, strings section uses ascii/nocase/wide modifiers correctly, condition uses filesize constraint + logical combination, no syntax errors. FP risk: low -- the combination of thebeautifulmarchoftime + obfuscation markers + large JS file is highly distinctive, but the third branch was tightened to require 5+ strings or a campaign-specific string to reduce generic matches. Confidence downgraded from high to medium per review. -->
```yara
rule Malware_Miasma_Worm_SetupJS_Payload
{
    meta:
        description = "Detects the Miasma worm .github/setup.js payload via C2 beacon keyword, obfuscation markers, and campaign indicators"
        author = "Actioner"
        date = "2026-06-07"
        reference = "https://www.stepsecurity.io/blog/miasma-worm-phantom-gyp"
        tlp = "WHITE"
        severity = "critical"

    strings:
        $beacon = "thebeautifulmarchoftime" ascii wide
        $campaign = "Miasma: The Spreading Blight" ascii wide
        $c2_account = "liuende501" ascii wide
        $bun_loader = "bun" ascii fullword
        $crypto_import = "node:crypto" ascii
        $eval_chain = "eval(" ascii
        $aes_gcm = "aes-128-gcm" ascii nocase
        $noop_flag = "_noop" ascii
        $anthropic_c2 = "api.anthropic.com" ascii

    condition:
        filesize > 300KB and
        filesize < 10MB and
        (
            ($beacon and 1 of ($c2_account, $campaign, $anthropic_c2)) or
            ($eval_chain and $crypto_import and $aes_gcm and $bun_loader) or
            (5 of them and 1 of ($beacon, $campaign, $c2_account))
        )
}
```

### YARA: Miasma Worm -- Phantom Gyp binding.gyp

Detects the Phantom Gyp technique: a small `binding.gyp` file containing gyp command substitution `<!(...)` used to execute arbitrary shell commands during native module builds.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: medium
<!-- audit: no toolchain installed; structural check: valid YARA syntax, filesize constraint to small files (Miasma uses 157 bytes), regex for gyp command substitution pattern. FP risk: medium -- legitimate binding.gyp files CAN use <!() command substitution for build configuration (e.g., pkg-config queries); the combination of small size + command substitution is distinctive but not Miasma-exclusive. Removed dead string $gyp_marker (never referenced in condition). Confidence downgraded from high to medium per review. -->
```yara
rule Malware_Miasma_Worm_Phantom_Gyp
{
    meta:
        description = "Detects the Phantom Gyp technique - a small binding.gyp file with command substitution used by Miasma worm for initial code execution"
        author = "Actioner"
        date = "2026-06-07"
        reference = "https://www.stepsecurity.io/blog/miasma-worm-phantom-gyp"
        tlp = "WHITE"
        severity = "critical"

    strings:
        $targets = "targets" ascii
        $cmd_sub1 = "<!" ascii
        $cmd_sub2 = "<!(" ascii
        $shell_indicators1 = "/bin/sh" ascii
        $shell_indicators2 = "/bin/bash" ascii
        $shell_indicators3 = "curl " ascii
        $shell_indicators4 = "wget " ascii
        $shell_indicators5 = "node " ascii

    condition:
        filesize < 1KB and
        $targets and
        ($cmd_sub2 or ($cmd_sub1 and 1 of ($shell_indicators*)))
}
```

### YARA: Miasma Worm -- Known Malicious Package Hashes

Detects files matching the known SHA-256 hashes of confirmed Miasma-compromised npm packages.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: high
<!-- audit: no toolchain installed; structural check: valid YARA syntax, hash module import, sha256 hash matching in condition. FP risk: zero -- exact hash matches. Note: requires YARA compiled with hash module support. -->
```yara
import "hash"

rule Malware_Miasma_Worm_Known_Package_Hashes
{
    meta:
        description = "Detects known Miasma-compromised npm packages by SHA-256 hash"
        author = "Actioner"
        date = "2026-06-07"
        reference = "https://www.microsoft.com/en-us/security/blog/2026/06/05/miasma-npm-supply-chain-attack/"
        tlp = "WHITE"
        severity = "critical"

    condition:
        hash.sha256(0, filesize) == "396cac9e457ec54ff6d3f6311cb5cc1da8054d019ce3ffa1de5741506c7a4ea4" or
        hash.sha256(0, filesize) == "d8d170af3de17bb9b217c52aaaffdf9395f35ef015a57ef676e406c121e5e223" or
        hash.sha256(0, filesize) == "f0641e053e81f0d01fa46db35a83e0a34494886503086866d956d14e81fd3e1c"
}
```

### YARA: Miasma Worm -- AI Tool Configuration Poisoning

Detects AI tool configuration files (Claude Code, Gemini CLI, Cursor) that have been poisoned with references to the Miasma `setup.js` payload or suspicious hook configurations.
**Status:** compile ⚠️ uncompiled (structural check only) · confidence: high
<!-- audit: no toolchain installed; structural check: valid YARA syntax, JSON pattern matching for SessionStart hooks and setup.js references. FP risk: very low -- settings.json referencing setup.js with SessionStart is not a legitimate pattern. -->
```yara
rule Malware_Miasma_Worm_AI_Tool_Config_Poisoning
{
    meta:
        description = "Detects AI coding tool configuration files poisoned by Miasma worm with SessionStart hooks or alwaysApply directives referencing setup.js"
        author = "Actioner"
        date = "2026-06-07"
        reference = "https://cybersecguru.com/2026/06/miasma-ai-coding-agent-targeting"
        tlp = "WHITE"
        severity = "critical"

    strings:
        $hook_session = "SessionStart" ascii wide
        $hook_always = "alwaysApply" ascii wide
        $payload_ref1 = "setup.js" ascii wide
        $payload_ref2 = ".github/setup.js" ascii wide
        $matcher_all = "\"matcher\"" ascii
        $matcher_star = "\"*\"" ascii
        $folder_open = "folderOpen" ascii wide
        $run_on = "runOn" ascii wide

    condition:
        filesize < 50KB and
        (
            ($hook_session and ($payload_ref1 or $payload_ref2)) or
            ($hook_always and ($payload_ref1 or $payload_ref2)) or
            ($folder_open and $run_on and ($payload_ref1 or $payload_ref2)) or
            ($matcher_all and $matcher_star and ($payload_ref1 or $payload_ref2))
        )
}
```

## Lessons Learned

1. **AI coding tools are a new attack surface.** The Miasma worm is the first documented supply chain threat to weaponize configuration files for AI coding agents (Claude Code, Gemini CLI, Cursor). These tools auto-execute hooks and prompts from workspace files with minimal user interaction, creating a trust-by-default execution model analogous to the `autorun.inf` era. Tool vendors must implement explicit user consent for workspace-level hooks and code execution, and developers must audit `.claude/`, `.gemini/`, `.cursor/`, and `.vscode/` directories in pull requests with the same scrutiny applied to `package.json` scripts.

2. **Provenance signing is necessary but not sufficient.** The worm's ability to forge SLSA attestations via Sigstore and publish packages with legitimate OIDC-derived npm provenance demonstrates that cryptographic provenance alone does not prevent supply chain attacks when the signing infrastructure itself (CI/CD pipelines, OIDC tokens) is compromised. Organizations should implement multi-factor verification for package publication and monitor for unusual publishing patterns (new versions from unfamiliar IPs, rapid version increments).

3. **Build-time execution vectors extend beyond package.json.** The Phantom Gyp technique -- using `binding.gyp` command substitution to execute arbitrary code during native builds -- bypasses all `package.json` script monitoring. The broader lesson: any build tool that supports command substitution, template expansion, or plugin execution is a potential code execution vector. Security tools must monitor build processes holistically, not just npm lifecycle scripts.

4. **Process memory is a credential store.** The scraping of GitHub Actions runner process memory via `/proc/{pid}/mem` to extract secrets that are masked in logs but present in memory highlights a fundamental gap: secret masking is a display-layer control, not a security boundary. CI/CD platforms should consider memory protection mechanisms (secure enclaves, short-lived credential injection) and restrict `/proc/*/mem` access in runner environments.

## Sources

- [The Hacker News - Miasma Worm Supply Chain Attack](https://thehackernews.com/2026/06/miasma-worm-supply-chain.html) -- Primary reporting on the 73 Microsoft GitHub repositories compromise and AI tool targeting
- [StepSecurity - Phantom Gyp Deep Technical Analysis](https://www.stepsecurity.io/blog/miasma-worm-phantom-gyp) -- Deep technical analysis of the binding.gyp exploitation, four-stage obfuscation chain, credential harvesting, and propagation engines
- [Microsoft Security Blog - Red Hat npm Supply Chain Compromise](https://www.microsoft.com/en-us/security/blog/2026/06/05/miasma-npm-supply-chain-attack/) -- Analysis of @redhat-cloud-services compromise, IOC hashes, KQL detection queries, and C2 channel enumeration
- [CyberSec Guru - AI Coding Agent Targeting](https://cybersecguru.com/2026/06/miasma-ai-coding-agent-targeting) -- Detailed breakdown of Claude Code, Gemini CLI, Cursor, and VS Code configuration file weaponization

---
*Report generated by Actioner*
