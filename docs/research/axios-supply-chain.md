# Axios npm Supply Chain Compromise — Cross-Platform RAT via Sapphire Sleet

## Executive Summary

On March 31, 2026, a North Korean state-sponsored threat actor (tracked as Sapphire Sleet / UNC1069) compromised the npm maintainer account for **axios**, the most widely-used HTTP client in the JavaScript ecosystem (~100 million weekly downloads, 174,000 dependent packages). The attacker published two backdoored versions — `axios@1.14.1` and `axios@0.30.4` — which injected a malicious dependency (`plain-crypto-js@4.2.1`) that silently deployed a cross-platform Remote Access Trojan (RAT) on macOS, Windows, and Linux systems via a `postinstall` hook. The malicious versions were live for approximately **3 hours** (00:21–03:29 UTC) before npm removed them. Any CI/CD pipeline, developer workstation, or server that ran `npm install` with a permissive version range during this window was compromised.

**Severity: CRITICAL**

---

## Threat Actor

| Attribute | Detail |
|-----------|--------|
| **Name** | Sapphire Sleet (Microsoft) / UNC1069 (Mandiant) |
| **Origin** | North Korea (DPRK) |
| **Nexus** | Lazarus Group cluster |
| **Motivation** | Financial (cryptocurrency theft), espionage |
| **Prior Activity** | WAVESHAPER backdoor campaigns, npm/PyPI supply chain attacks |

Microsoft Threat Intelligence formally attributed the infrastructure and the axios compromise to Sapphire Sleet. The macOS RAT variant exhibits significant overlap with WAVESHAPER, a C++ backdoor tracked by Mandiant and attributed to UNC1069, a DPRK-linked threat cluster.

---

## Timeline

| Timestamp (UTC) | Event |
|------------------|-------|
| ~March 16, 2026 | Social engineering campaign against maintainer begins (~2 weeks prior) |
| March 27, 2026 | Last legitimate `axios@1.14.0` published via GitHub Actions OIDC with SLSA provenance |
| March 30, 05:57 | Decoy `plain-crypto-js@4.2.0` published (benign, establishing package legitimacy) |
| March 30, 23:59 | Malicious `plain-crypto-js@4.2.1` published |
| March 31, 00:05 | Socket automated detection flags `plain-crypto-js@4.2.1` (6 minutes after publish) |
| March 31, 00:21 | `axios@1.14.1` published, tagged `latest` — all `npm install axios` now pulls backdoor |
| March 31, 01:00 | `axios@0.30.4` published, tagged `legacy` |
| March 31, 01:38 | Collaborator DigitalBrainJS initiates deprecation PR and contacts npm security |
| March 31, 01:50 | Elastic Security Labs files GitHub Security Advisory |
| March 31, 03:15 | Malicious axios versions removed from npm |
| March 31, 03:29 | `plain-crypto-js` removed entirely from npm |
| April 01, 2026 | Microsoft publishes attribution and mitigation guidance |

---

## Attack Chain

### Phase 1: Initial Access — Maintainer Compromise

The attacker conducted a **targeted social engineering campaign** over approximately two weeks against `jasonsaayman`, the primary npm maintainer of axios. The campaign delivered RAT malware to the maintainer's workstation, providing the attacker with full remote access. This bypassed 2FA protections by operating directly from the compromised machine. Key indicators of account takeover:

- Maintainer email changed from `jasonsaayman@gmail[.]com` to `ifstap@proton[.]me`
- Publishing method changed from GitHub Actions OIDC (with SLSA provenance attestations) to direct CLI publish without attestations
- No corresponding GitHub tags or releases for the malicious versions

### Phase 2: Supply Chain Injection

The attacker published across both release branches simultaneously to maximize exposure:

- **`axios@1.14.1`** (tagged `latest`) — catches all `^1.x` version ranges
- **`axios@0.30.4`** (tagged `legacy`) — catches all `^0.30.x` version ranges

Both versions added a single new dependency: `plain-crypto-js@4.2.1`. This package's `postinstall` hook (`setup.js`) executes automatically during `npm install` — no user interaction required.

### Phase 3: Stage 1 Dropper (`setup.js`)

The dropper uses **two-layer obfuscation**:

1. **Layer 1**: String reversal + Base64 decoding with padding substitution
2. **Layer 2**: XOR cipher with key `OrDeR_7077` and position-dependent index `7 * i² % 10`, constant value `333`

All 18 sensitive strings (module names, C2 URLs, shell commands) are stored in encoded array `stq[]`.

**Execution flow:**
1. Detects OS via `os.platform()`
2. POSTs to `hxxp://sfrclak[.]com:8000/6202033` with platform-specific body:
   - macOS: `packages.npm[.]org/product0`
   - Windows: `packages.npm[.]org/product1`
   - Linux: `packages.npm[.]org/product2`
3. Downloads and executes platform-specific Stage 2 payload
4. **Anti-forensics cleanup**: Deletes `setup.js`, replaces `package.json` with clean `package.md` (benign v4.2.0 config), erasing all evidence of the `postinstall` trigger

The entire process from `npm install` to full compromise takes **approximately 15 seconds**.

### Phase 4: Stage 2 RAT — Cross-Platform

All three RAT variants share a common C2 protocol:

| Feature | Value |
|---------|-------|
| **Transport** | HTTP POST |
| **Encoding** | Base64-encoded JSON |
| **User-Agent** | `mozilla/4.0 (compatible; msie 8.0; windows nt 5.1; trident/4.0)` |
| **Beacon interval** | 60 seconds |
| **Session ID** | 16-character random alphanumeric |
| **Campaign ID** | `6202033` |

**Outbound message types**: `FirstInfo`, `BaseInfo`, `CmdResult`
**Inbound commands**: `kill`, `peinject`, `runscript`, `rundir`

#### macOS Variant (C++ Mach-O)

- **Path**: `/Library/Caches/com.apple.act.mond` (mimics Apple system daemon)
- **Persistence**: None
- **Execution**: AppleScript via `/usr/bin/osascript`
- **Binary injection**: Base64-decoded, dropped with ad-hoc code signing
- **Recon**: Hostname, username, macOS version, boot time, CPU arch, timezone, process list
- **Build artifacts**: Xcode project `macWebT`, developer username `mac`, build path `/Users/mac/Desktop/Jain_DEV/client_mac/macWebT/`

#### Windows Variant (PowerShell)

- **Delivery**: VBScript dropper (`6202033.vbs`) downloads PowerShell RAT (`6202033.ps1`)
- **Evasion**: Copies `powershell.exe` to `%PROGRAMDATA%\wt.exe` (masquerades as Windows Terminal)
- **Execution**: Hidden window, `-NoProfile -ep Bypass`
- **Persistence**: Registry Run key `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\MicrosoftUpdate` → `system.bat`
- **Binary injection**: Reflective .NET assembly loading via `[System.Reflection.Assembly]::Load()`
- **Recon**: Hostname, username, OS version, timezone, boot time, install date, hardware model, CPU type, process list, drive enumeration

#### Linux Variant (Python)

- **Path**: `/tmp/ld.py`
- **Execution**: `nohup python3` as orphaned background process
- **Persistence**: None
- **Binary injection**: Base64-decoded to `/tmp/.<random 6-char>` (hidden file)
- **Script execution**: `subprocess.run(shell=True)` or `python3 -c`
- **Known bug**: Crashes on `os.getlogin()` in containers/CI environments (limits impact in many pipeline scenarios)

---

## Indicators of Compromise

### Malicious Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | `1.14.1` | Backdoored HTTP client (latest branch) |
| `axios` | `0.30.4` | Backdoored HTTP client (legacy branch) |
| `plain-crypto-js` | `4.2.0` | Decoy package (benign, establishing legitimacy) |
| `plain-crypto-js` | `4.2.1` | Stage 1 dropper (postinstall hook) |
| `@shadanai/openclaw` | `2026.3.31-1`, `2026.3.31-2` | Vendors `plain-crypto-js` directly |
| `@qqbrowser/openclaw-qbot` | `0.0.130` | Includes tampered `axios@1.14.1` |

### Network Indicators

| Type | Value | Context |
|------|-------|---------|
| Domain | `sfrclak[.]com` | Primary C2 server (registered 2026-03-30 via Namecheap) |
| IP | `142[.]11[.]206[.]73` | C2 IP address (Hostwinds ASN) |
| Port | `8000` | C2 port |
| Domain | `callnrwise[.]com` | Secondary infrastructure |
| URL | `hxxp://sfrclak[.]com:8000/6202033` | Stage 1 payload delivery endpoint |
| User-Agent | `mozilla/4.0 (compatible; msie 8.0; windows nt 5.1; trident/4.0)` | Hardcoded across all RAT variants |

### File System Artifacts

| OS | Path | Hash (SHA-256) | Purpose |
|----|------|----------------|---------|
| All | `setup.js` | — | Stage 1 dropper (self-deletes) |
| macOS | `/Library/Caches/com.apple.act.mond` | `92ff08773995ebc8d55ec4b8e1a225d0d1e51efa4ef88b8849d0071230c9645a` | RAT binary |
| Windows | `%TEMP%\6202033.ps1` | `617b67a8e1210e4fc87c92d1d1da45a2f311c08d26e89b12307cf583c900d101` | PowerShell RAT |
| Windows | `%TEMP%\6202033.vbs` | — | VBScript dropper |
| Windows | `%PROGRAMDATA%\wt.exe` | — | Masqueraded PowerShell copy |
| Windows | `%PROGRAMDATA%\system.bat` | — | Persistence script |
| Linux | `/tmp/ld.py` | `fcb81618bb15edfdedfb638b4c08a2af9cac9ecfa551af135a8402bf980375cf` | Python RAT |

### Additional Hashes

- `ad8ba560ae5c4af4758bc68cc6dcf43bae0e0bbf9da680a8dc60a9ef78e22ff7` (additional sample)

### Registry Indicators (Windows)

| Key | Value |
|-----|-------|
| `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\MicrosoftUpdate` | Path to `system.bat` |

### Vulnerability Identifiers

| Source | ID |
|--------|----|
| Snyk | `SNYK-JS-AXIOS-15850650` |
| Snyk | `SNYK-JS-PLAINCRYPTOJS-15850652` |
| Snyk | `SNYK-JS-QQBROWSEROPENCLAWQBOT-15850776` |
| Snyk | `SNYK-JS-SHADANAIOPENCLAW-15850775` |

---

## MITRE ATT&CK Mapping

| Tactic | Technique | ID | Application |
|--------|-----------|-----|-------------|
| Initial Access | Supply Chain Compromise: Compromise Software Dependencies | T1195.001 | Malicious axios versions published to npm |
| Initial Access | Trusted Relationship | T1199 | Compromised maintainer npm account |
| Execution | Command and Scripting Interpreter: JavaScript | T1059.007 | `setup.js` postinstall hook |
| Execution | Command and Scripting Interpreter: PowerShell | T1059.001 | Windows RAT payload |
| Execution | Command and Scripting Interpreter: AppleScript | T1059.002 | macOS payload execution |
| Execution | Command and Scripting Interpreter: Unix Shell | T1059.004 | Linux shell command execution |
| Execution | Command and Scripting Interpreter: Python | T1059.006 | Linux RAT (`ld.py`) |
| Persistence | Boot or Logon Autostart: Registry Run Keys | T1547.001 | Windows `MicrosoftUpdate` Run key |
| Defense Evasion | Obfuscated Files or Information | T1027 | Two-layer XOR + Base64 obfuscation |
| Defense Evasion | Masquerading | T1036 | `wt.exe` (PowerShell as Windows Terminal), `com.apple.act.mond` (Apple daemon) |
| Defense Evasion | Hidden Files and Directories | T1564.001 | Linux `/tmp/.<random>` hidden files |
| Defense Evasion | Indicator Removal: File Deletion | T1070.004 | Self-deletion of `setup.js` and evidence cleanup |
| Defense Evasion | Process Injection | T1055 | Reflective .NET assembly loading (Windows) |
| Discovery | System Information Discovery | T1082 | Hostname, OS, hardware, timezone collection |
| Discovery | Process Discovery | T1057 | Process enumeration across all platforms |
| Discovery | File and Directory Discovery | T1083 | `rundir` command, initial recon of home directories |
| Command and Control | Application Layer Protocol: Web Protocols | T1071.001 | HTTP POST C2 beaconing |
| Command and Control | Non-Standard Port | T1571 | Port 8000 for HTTP C2 |
| Command and Control | Data Encoding: Standard Encoding | T1132.001 | Base64-encoded JSON payloads |
| Command and Control | Ingress Tool Transfer | T1105 | Stage 2 RAT download |

---

## Remediation

### Immediate Actions (Affected Systems)

1. **Isolate** any machine that ran `npm install` between 00:21–03:29 UTC on March 31, 2026
2. **Check exposure**: `grep -E '"axios"' package-lock.json | grep -E '1\.14\.1|0\.30\.4'` and `npm ls plain-crypto-js`
3. **Rotate ALL credentials** — API keys, SSH keys, cloud credentials, npm/GitHub tokens, database passwords
4. **Scan for file artifacts**:
   - macOS: `/Library/Caches/com.apple.act.mond`
   - Windows: `%PROGRAMDATA%\wt.exe`, `%PROGRAMDATA%\system.bat`
   - Linux: `/tmp/ld.py`
5. **Check Windows registry**: `HKCU\...\Run\MicrosoftUpdate`
6. **Scan network logs** for connections to `sfrclak[.]com` or `142[.]11[.]206[.]73:8000`
7. **Rebuild from clean snapshots** rather than attempting forensic cleanup on confirmed-compromised hosts

### Prevention

1. Pin axios to safe versions (`1.14.0` or `0.30.3` or earlier)
2. Commit lockfiles and use `npm ci` (not `npm install`) in CI/CD
3. Use `npm ci --ignore-scripts` in CI environments to prevent postinstall execution
4. Blocklist `plain-crypto-js` in package managers
5. Monitor for version changes in critical dependencies using tools like Socket, Snyk, or npm audit

---

## Sources

- [Elastic Security Labs — Inside the Axios supply chain compromise: one RAT to rule them all](https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all) — Primary technical analysis with full IOCs, malware reverse engineering, and MITRE ATT&CK mapping
- [Microsoft Security Blog — Mitigating the Axios npm supply chain compromise](https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/) — Attribution to Sapphire Sleet, remediation guidance
- [Google Cloud / Mandiant — North Korea-Nexus Threat Actor Compromises Widely Used Axios NPM Package](https://cloud.google.com/blog/topics/threat-intelligence/north-korea-threat-actor-targets-axios-npm-package) — DPRK attribution, WAVESHAPER overlap analysis
- [Snyk — Axios npm Package Compromised: Supply Chain Attack Delivers Cross-Platform RAT](https://snyk.io/blog/axios-npm-package-compromised-supply-chain-attack-delivers-cross-platform/) — Vulnerability IDs, detection methods, code analysis
- [Datadog Security Labs — Compromised axios npm package delivers cross-platform RAT](https://securitylabs.datadoghq.com/articles/axios-npm-supply-chain-compromise/) — Network indicators, behavioral analysis, detection queries
- [Unit 42 / Palo Alto Networks — Threat Brief: Widespread Impact of the Axios Supply Chain Attack](https://unit42.paloaltonetworks.com/axios-supply-chain-attack/) — Additional IOCs, XQL detection queries, secondary C2 domain
- [Socket — Supply Chain Attack on Axios Pulls Malicious Dependency](https://socket.dev/blog/axios-npm-package-compromised) — Early detection timeline, additional compromised packages
- [GitHub Issue #10636 — Post Mortem: axios npm supply chain compromise](https://github.com/axios/axios/issues/10636) — Official post-mortem, social engineering details, remediation steps
- [GitHub Issue #10604 — axios@1.14.1 and axios@0.30.4 are compromised](https://github.com/axios/axios/issues/10604) — Community detection and initial response
- [The Hacker News — Axios Supply Chain Attack Pushes Cross-Platform RAT via Compromised npm Account](https://thehackernews.com/2026/03/axios-supply-chain-attack-pushes-cross.html) — News coverage

---

## Detection Rules

This section contains detection rules targeting the key TTPs and IOCs from the Axios supply chain compromise. Rules cover: the malicious npm packages and postinstall execution (Sigma), network C2 indicators including the distinctive IE8 User-Agent and C2 domain/IP (Suricata), and file-level indicators for the RAT payloads across all three platforms (YARA). Log sources targeted include process creation, file creation, network traffic, DNS, and HTTP logs.

### Sigma Rules (5 rules — Validated)

#### 1. Malicious plain-crypto-js Postinstall Execution

```yaml
title: Axios Supply Chain - Malicious plain-crypto-js Postinstall Execution
id: 8a3c7e91-4d2f-4b1a-9e6c-3f5d8a2b1c0e
status: experimental
description: Detects execution of the malicious setup.js postinstall hook from the plain-crypto-js npm package, part of the Axios supply chain compromise (March 2026).
references:
    - https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all
    - https://snyk.io/blog/axios-npm-package-compromised-supply-chain-attack-delivers-cross-platform/
author: Actioner Research
date: 2026-04-07
tags:
    - attack.execution
    - attack.t1059.007
    - attack.initial_access
    - attack.t1195.001
logsource:
    category: process_creation
    product: windows
detection:
    selection_node_setup:
        ParentImage|endswith: '\node.exe'
        CommandLine|contains|all:
            - 'node_modules'
            - 'plain-crypto-js'
            - 'setup.js'
    condition: selection_node_setup
falsepositives:
    - Legitimate use of a package named plain-crypto-js (highly unlikely - package was purpose-built for this attack)
level: critical
```

#### 2. PowerShell Masquerading as Windows Terminal (wt.exe)

```yaml
title: Axios Supply Chain - PowerShell Masquerading as Windows Terminal (wt.exe)
id: 9b4d8f02-5e3a-4c2b-af7d-4a6e9b3c2d1f
status: experimental
description: Detects PowerShell being copied to ProgramData as wt.exe, a technique used by the Axios supply chain RAT to evade EDR detection on Windows.
references:
    - https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all
    - https://unit42.paloaltonetworks.com/axios-supply-chain-attack/
author: Actioner Research
date: 2026-04-07
tags:
    - attack.defense_evasion
    - attack.t1036
    - attack.execution
    - attack.t1059.001
logsource:
    category: process_creation
    product: windows
detection:
    selection_wt_ps:
        Image|endswith: '\wt.exe'
        Image|contains: 'ProgramData'
        CommandLine|contains:
            - '-NoProfile'
            - '-ep Bypass'
            - '6202033'
    condition: selection_wt_ps
falsepositives:
    - Legitimate Windows Terminal in non-standard location (rare)
level: critical
```

#### 3. MicrosoftUpdate Registry Run Key Persistence

```yaml
title: Axios Supply Chain - MicrosoftUpdate Registry Run Key Persistence
id: ac5e9013-6f4b-4d3c-b08e-5b7fab4d3e20
status: experimental
description: Detects the creation of a MicrosoftUpdate registry Run key pointing to system.bat, used for persistence by the Windows variant of the Axios supply chain RAT.
references:
    - https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all
    - https://securitylabs.datadoghq.com/articles/axios-npm-supply-chain-compromise/
author: Actioner Research
date: 2026-04-07
tags:
    - attack.persistence
    - attack.t1547.001
logsource:
    category: registry_set
    product: windows
detection:
    selection:
        TargetObject|endswith: '\CurrentVersion\Run\MicrosoftUpdate'
        Details|contains: 'system.bat'
    condition: selection
falsepositives:
    - Unlikely - specific registry value name combined with system.bat reference
level: critical
```

#### 4. Anomalous IE8 User-Agent in Proxy Logs

```yaml
title: Axios Supply Chain - Anomalous IE8 User-Agent on Non-Windows System
id: bd6fa124-7058-4e4d-c19f-6c80bc5e4f31
status: experimental
description: Detects HTTP traffic using the hardcoded IE8/Windows XP User-Agent string from the Axios supply chain RAT. This User-Agent is anachronistic and particularly suspicious on macOS/Linux hosts.
references:
    - https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all
author: Actioner Research
date: 2026-04-07
tags:
    - attack.command_and_control
    - attack.t1071.001
logsource:
    category: proxy
detection:
    selection:
        c-useragent: 'mozilla/4.0 (compatible; msie 8.0; windows nt 5.1; trident/4.0)'
    condition: selection
falsepositives:
    - Legacy applications using hardcoded IE8 User-Agent strings (increasingly rare)
level: high
```

#### 5. C2 Domain DNS Resolution

```yaml
title: Axios Supply Chain - C2 Domain DNS Resolution
id: ce70b235-8169-4f5e-d2a0-7d91cd6f5042
status: experimental
description: Detects DNS queries to the C2 domains used in the Axios supply chain compromise attributed to Sapphire Sleet (DPRK).
references:
    - https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all
    - https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/
author: Actioner Research
date: 2026-04-07
tags:
    - attack.command_and_control
    - attack.t1071.001
logsource:
    category: dns
detection:
    selection:
        query|endswith:
            - 'sfrclak.com'
            - 'callnrwise.com'
    condition: selection
falsepositives:
    - None known
level: critical
```

### Suricata Rules (6 rules — Validated)

```
alert http any any -> any any (msg:"ACTIONER Axios Supply Chain - C2 Domain sfrclak.com in HTTP Host"; flow:established,to_server; http.host; content:"sfrclak.com"; endswith; reference:url,www.elastic.co/security-labs/axios-one-rat-to-rule-them-all; classtype:trojan-activity; sid:2026040701; rev:1;)

alert http any any -> any any (msg:"ACTIONER Axios Supply Chain - C2 Domain callnrwise.com in HTTP Host"; flow:established,to_server; http.host; content:"callnrwise.com"; endswith; reference:url,unit42.paloaltonetworks.com/axios-supply-chain-attack/; classtype:trojan-activity; sid:2026040702; rev:1;)

alert http any any -> $EXTERNAL_NET 8000 (msg:"ACTIONER Axios Supply Chain - IE8 UA with Campaign ID in URI"; flow:established,to_server; http.user_agent; content:"mozilla/4.0 (compatible|3b| msie 8.0|3b| windows nt 5.1|3b| trident/4.0)"; http.uri; content:"/6202033"; reference:url,www.elastic.co/security-labs/axios-one-rat-to-rule-them-all; classtype:trojan-activity; sid:2026040703; rev:1;)

alert dns any any -> any any (msg:"ACTIONER Axios Supply Chain - DNS Query for C2 Domain sfrclak.com"; dns.query; content:"sfrclak.com"; endswith; reference:url,www.elastic.co/security-labs/axios-one-rat-to-rule-them-all; classtype:trojan-activity; sid:2026040704; rev:1;)

alert dns any any -> any any (msg:"ACTIONER Axios Supply Chain - DNS Query for C2 Domain callnrwise.com"; dns.query; content:"callnrwise.com"; endswith; reference:url,unit42.paloaltonetworks.com/axios-supply-chain-attack/; classtype:trojan-activity; sid:2026040705; rev:1;)

alert http any any -> $EXTERNAL_NET 8000 (msg:"ACTIONER Axios Supply Chain - RAT Beacon IE8 UA on Non-Standard Port"; flow:established,to_server; http.user_agent; content:"mozilla/4.0 (compatible|3b| msie 8.0|3b| windows nt 5.1|3b| trident/4.0)"; reference:url,www.elastic.co/security-labs/axios-one-rat-to-rule-them-all; classtype:trojan-activity; sid:2026040706; rev:1;)
```

### YARA Rules (4 rules — Validated)

```yara
rule axios_supply_chain_stage1_dropper {
    meta:
        description = "Detects the plain-crypto-js setup.js stage 1 dropper from the Axios supply chain compromise"
        author = "Actioner Research"
        date = "2026-04-07"
        reference = "https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all"
        severity = "critical"
        mitre_attack = "T1195.001, T1059.007, T1027"

    strings:
        $xor_key = "OrDeR_7077" ascii
        $campaign_id = "6202033" ascii
        $c2_domain = "sfrclak" ascii
        $arr_name = "stq" ascii
        $npm_spoof1 = "packages.npm" ascii
        $npm_spoof2 = "product0" ascii
        $npm_spoof3 = "product1" ascii
        $npm_spoof4 = "product2" ascii

    condition:
        $xor_key or ($campaign_id and $c2_domain) or ($arr_name and 2 of ($npm_spoof*))
}

rule axios_supply_chain_macos_rat {
    meta:
        description = "Detects the macOS Mach-O RAT payload (WAVESHAPER variant) from the Axios supply chain compromise"
        author = "Actioner Research"
        date = "2026-04-07"
        reference = "https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all"
        severity = "critical"
        hash = "92ff08773995ebc8d55ec4b8e1a225d0d1e51efa4ef88b8849d0071230c9645a"
        mitre_attack = "T1059.002, T1082, T1071.001"

    strings:
        $ua = "mozilla/4.0 (compatible; msie 8.0; windows nt 5.1; trident/4.0)" ascii
        $msg1 = "FirstInfo" ascii
        $msg2 = "BaseInfo" ascii
        $msg3 = "CmdResult" ascii
        $cmd1 = "peinject" ascii
        $cmd2 = "runscript" ascii
        $cmd3 = "rundir" ascii
        $cmd4 = "rsp_kill" ascii
        $build_path = "Jain_DEV" ascii
        $project = "macWebT" ascii
        $path = "com.apple.act.mond" ascii

    condition:
        (uint32(0) == 0xfeedface or uint32(0) == 0xfeedfacf or uint32(0) == 0xcafebabe) and
        (
            ($ua and 2 of ($msg*)) or
            ($ua and 2 of ($cmd*)) or
            ($build_path and $project) or
            $path
        )
}

rule axios_supply_chain_windows_rat {
    meta:
        description = "Detects the Windows PowerShell RAT payload from the Axios supply chain compromise"
        author = "Actioner Research"
        date = "2026-04-07"
        reference = "https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all"
        severity = "critical"
        hash = "617b67a8e1210e4fc87c92d1d1da45a2f311c08d26e89b12307cf583c900d101"
        mitre_attack = "T1059.001, T1547.001, T1036"

    strings:
        $ua = "mozilla/4.0 (compatible; msie 8.0; windows nt 5.1; trident/4.0)" ascii wide
        $msg1 = "FirstInfo" ascii wide
        $msg2 = "CmdResult" ascii wide
        $cmd1 = "peinject" ascii wide
        $cmd2 = "runscript" ascii wide
        $cmd3 = "rundir" ascii wide
        $cmd4 = "rsp_kill" ascii wide
        $persist = "MicrosoftUpdate" ascii wide
        $masq = "wt.exe" ascii wide
        $sysloader = "System.Reflection.Assembly" ascii wide

    condition:
        4 of them
}

rule axios_supply_chain_linux_rat {
    meta:
        description = "Detects the Linux Python RAT payload from the Axios supply chain compromise"
        author = "Actioner Research"
        date = "2026-04-07"
        reference = "https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all"
        severity = "critical"
        hash = "fcb81618bb15edfdedfb638b4c08a2af9cac9ecfa551af135a8402bf980375cf"
        mitre_attack = "T1059.006, T1082, T1071.001"

    strings:
        $ua = "mozilla/4.0 (compatible; msie 8.0; windows nt 5.1; trident/4.0)" ascii
        $msg1 = "FirstInfo" ascii
        $msg2 = "BaseInfo" ascii
        $msg3 = "CmdResult" ascii
        $cmd1 = "peinject" ascii
        $cmd2 = "runscript" ascii
        $cmd3 = "rundir" ascii
        $cmd4 = "rsp_kill" ascii
        $py_subprocess = "subprocess.run" ascii
        $py_nohup = "subprocess.Popen" ascii

    condition:
        $ua and 2 of ($msg*) and 2 of ($cmd*) and ($py_subprocess or $py_nohup)
}
```
