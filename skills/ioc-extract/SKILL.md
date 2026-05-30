---
name: ioc-extract
description: "Extract, normalize, and defang indicators of compromise (IPs, domains, URLs, hashes, file paths, registry keys) from source text, and extract TTPs mapped to MITRE ATT&CK. Use when processing an article, report, or technical writeup into structured indicators before building a detection report. Bridges research and rule generation."
---

# Skill: IOC Extract

Identification, normalization, and defanging of indicators of compromise and TTP extraction from source text.

> **Key Principle:** Extract IOCs and TTPs as **co-equal, first-class outputs**. Concrete artifacts (IOCs — strings, hashes, paths, network indicators) are what the **PoC/advisory-specific** layer keys on (the product default); TTPs describe durable behavior for the **opt-in behavioral** layer and for MITRE ATT&CK mapping. *Which* one a given rule keys on is an altitude decision made downstream in rule-gen — so extract both thoroughly and tag them; don't pre-rank one over the other here.

---

## When to Use This Skill

Invoke this skill when processing source text (articles, reports, technical writeups) to extract structured indicators before populating a topic summary. This skill bridges ingestion/research and rule generation.

---

## Step 1: Extract IOCs by Type

Scan the source text for the following indicator types:

| IOC Type | Pattern | Examples |
|----------|---------|----------|
| IPv4 Address | Dotted-quad, optional port | `192.168.1.100`, `45.33.32.156:8443` |
| IPv6 Address | Colon-separated hex groups | `2001:0db8::1` |
| Domain | FQDN with valid TLD | `malware-c2.evil.com`, `update.legitimatesoftware.net` |
| URL | Full URI with scheme | `https://evil.com/payload.exe?id=123` |
| File Hash (MD5) | 32 hex characters | `d41d8cd98f00b204e9800998ecf8427e` |
| File Hash (SHA1) | 40 hex characters | `da39a3ee5e6b4b0d3255bfef95601890afd80709` |
| File Hash (SHA256) | 64 hex characters | `e3b0c44298fc1c149afbf4c8996fb924...` |
| File Path | OS-specific paths | `/tmp/.cache/update`, `C:\Users\Public\svchost.exe` |
| Registry Key | Windows registry paths | `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` |
| Email Address | user@domain format | `phisher@evil-domain.com` |
| CVE ID | CVE-YYYY-NNNNN format | `CVE-2024-3400` |

### Extraction Guidelines

- Extract ALL instances, even duplicates — dedup in normalization step
- Look for IOCs in prose text, tables, code blocks, appendices, and linked IOC repos
- Do not invent IOCs — only extract what is explicitly stated in the source
- Watch for IOCs embedded in screenshots or images — note them for manual review if text extraction fails
- Cross-reference IOCs with their context — note whether each is C2, staging, exfil, persistence, etc.
- Ignore benign infrastructure mentioned for comparison (e.g., "unlike legitimate microsoft.com traffic...")

---

## Step 2: Extract TTPs (Behavioral Indicators)

TTPs describe adversary behavior — the actions they take, not just the artifacts they leave. They are the basis for the durable, **opt-in** behavioral detection layer (and for MITRE ATT&CK mapping). Capture them precisely — vague TTPs make weak, false-positive-prone rules.

### Specific HTTP Endpoints
- Request method + URI pattern + headers + body content
- Example: `POST /api/v1/check-in` with `User-Agent: Mozilla/5.0 (compatible; UpdateService/1.0)` and base64-encoded body

### Process Execution Chains
- Parent-child process relationships and command-line arguments
- Example: `excel.exe` → `cmd.exe` → `powershell.exe -enc [base64]` → `certutil -urlcache -f http://... payload.dll`

### File System Artifacts
- Files created, modified, or deleted during execution
- Example: Drops `C:\ProgramData\svchost.exe` (note: legitimate path, suspicious binary name collision)

### Registry Modifications
- Keys created or modified for persistence, configuration, or evasion
- Example: Creates `HKCU\Software\Classes\CLSID\{...}\InprocServer32` pointing to malicious DLL

### DNS Query Patterns
- DGA characteristics, unusual query types, beaconing intervals
- Example: DNS TXT queries to `[random-8-chars].c2domain.com` every 60 seconds

### Authentication Patterns
- Credential harvesting, lateral movement, privilege escalation techniques
- Example: Kerberoasting via `klist` followed by TGS requests for service accounts

### Network Communication Patterns
- Beacon intervals, jitter, data encoding, protocol abuse
- Example: HTTPS POST to `/api/update` every 300s +/-15% jitter, 64-byte minimum payload

---

## Step 3: MITRE ATT&CK Mapping

Map observed behaviors to MITRE ATT&CK techniques:

1. Identify the tactic (what the adversary is trying to achieve)
2. Map to the specific technique and sub-technique
3. Format as: `T####.### - Technique Name`

### Mapping Examples

| Observed Behavior | TID | Technique |
|-------------------|-----|-----------|
| Phishing email with macro-enabled doc | T1566.001 | Spearphishing Attachment |
| PowerShell download cradle | T1059.001 | PowerShell |
| Scheduled task for persistence | T1053.005 | Scheduled Task |
| certutil for download | T1105 | Ingress Tool Transfer |
| Process injection via CreateRemoteThread | T1055.001 | Dynamic-link Library Injection |
| DNS tunneling for exfil | T1048.001 | Exfiltration Over Symmetric Encrypted Non-C2 Protocol |

- Only map techniques with clear evidence in the source text
- Prefer sub-techniques (T####.###) over parent techniques when the behavior is specific enough

---

## Step 4: Normalize IOCs

Apply consistent formatting:

- **Domains:** lowercase all domains (`Evil.COM` → `evil.com`)
- **Hashes:** lowercase all hex strings
- **URLs:** remove tracking parameters (`?utm_source=...`, `&ref=...`, `&fbclid=...`)
- **IPs:** remove leading zeros (`045.033.032.156` → `45.33.32.156`)
- **Hash type by length:** 32 chars = MD5, 40 chars = SHA1, 64 chars = SHA256
- **Deduplicate:** remove exact duplicates after normalization
- **Validate format:** discard malformed indicators (e.g., hash with wrong character count, IP octets > 255)

---

## Step 5: Defang IOCs

Apply defanging to prevent accidental resolution or click-through:

| Type | Rule | Before | After |
|------|------|--------|-------|
| URL scheme | Replace `http` with `hxxp` | `https://evil.com/payload` | `hxxps://evil[.]com/payload` |
| Domain dots | Replace `.` with `[.]` | `evil.com` | `evil[.]com` |
| IP dots | Replace `.` with `[.]` | `45.33.32.156` | `45.33.32[.]156` |
| Email @ | Replace `@` with `[at]` | `attacker@evil.com` | `attacker[at]evil[.]com` |
| Email domain | Also defang dots | `attacker@evil.com` | `attacker[at]evil[.]com` |

### What NOT to Defang
- File hashes (not resolvable)
- File paths (local references)
- Registry keys (local references)
- CVE IDs (identifiers, not network artifacts)
- Internal/private IP ranges (unless they appear as actual IOCs in the report)

---

## Step 6: Categorize for Output

Organize extracted indicators into the topic summary template sections:

### IOCs → Template IOC Tables
Place in the appropriate table under `## Indicators of Compromise (IOCs)`:

- **Package / Software Level:** Malicious packages, compromised libraries, trojanized updates
- **File System:** Dropped files, modified binaries, artifacts (with platform, path, hash, description)
- **Network:** Domains, IPs, URL patterns (with type, defanged value, context/role)
- **Behavioral:** Process chains, registry modifications, timing patterns (prose format)

### TTPs → MITRE ATT&CK Table
Place in the `## MITRE ATT&CK Mapping` table with TID, Technique Name, and Observed Behavior columns.

### TTPs → Technical Analysis Sections
Feed detailed TTP descriptions into the appropriate `## Technical Analysis` subsections (stages, C2, platform-specific behavior).

---

## IOC vs. TTP — which detection layer it feeds

Both are valuable; they feed **different altitudes**. Concrete artifacts power the **PoC/advisory-specific** layer (the default — precise, low false-positive); behaviors power the **durable behavioral (TTP)** layer (opt-in — higher recall, broader). Tag each so rule-gen can select per the requested altitude.

| Indicator | Classification | Feeds | Note |
|-----------|---------------|-------|------|
| `45.33.32[.]156` | IOC (artifact) | PoC/advisory-specific | Precise now; rotates over time |
| `evil[.]com` | IOC (artifact) | PoC/advisory-specific | Precise now; may be burned later |
| SHA256 of malware binary | IOC (artifact) | PoC/advisory-specific | Exact-match; one variant |
| `POST /api/v1/check-in` with specific User-Agent | TTP (behavioral) | durable behavioral | C2 protocol pattern |
| `excel.exe` → `cmd.exe` → `powershell.exe -enc` | TTP (behavioral) | durable behavioral | Execution-chain behavior |
| DNS TXT queries at regular intervals | TTP (behavioral) | durable behavioral | C2 communication pattern |
| Registry run key persistence | TTP (behavioral) | durable behavioral | Persistence mechanism |

**Rule of thumb:** if the adversary can change it by editing a config file, it's an IOC/artifact (feeds the specific layer); if changing it requires rewriting code or redesigning the attack, it's a TTP (feeds the behavioral layer). The default altitude keys on the artifacts; the behavioral layer is opt-in.

---

## Error Handling

- If source text contains no extractable IOCs or TTPs, note this explicitly — not all reports contain technical indicators
- If IOC format is ambiguous (e.g., string could be a hash or random hex), include it with a note marking uncertainty
- If MITRE mapping is uncertain, use the parent technique rather than guessing a sub-technique
