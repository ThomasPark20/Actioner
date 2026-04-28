---
title: "Lazarus Group: Comprehensive Threat Actor Profile"
date: 2026-04-02
description: "Full profile of North Korea's Lazarus Group including the $1.5B Bybit heist, Medusa ransomware, and supply chain attacks."
---

::: warning
**Disclaimer:** This is OSINT summarized by AI. Trust, but verify.
:::

# Lazarus Group — Comprehensive Threat Actor Profile

**Date:** 2026-04-02
**Author:** AEGIS Research Agent
**Classification:** TLP:AMBER
**Severity:** Critical

---

## Executive Summary

Lazarus Group (also tracked as HIDDEN COBRA, Diamond Sleet, ZINC, Labyrinth Chollima, NICKEL ACADEMY, and Guardians of Peace) is a North Korean state-sponsored advanced persistent threat (APT) group attributed to the Reconnaissance General Bureau (RGB). Active since at least 2009, Lazarus has evolved from destructive operations and espionage into one of the most financially motivated nation-state actors in the world. The group is responsible for the largest cryptocurrency heist in history — the $1.5 billion Bybit breach in February 2025 — and has expanded into ransomware-as-a-service (Medusa), open-source supply chain attacks targeting developer ecosystems (npm, PyPI, GitHub), and sophisticated social engineering campaigns (Operation Dream Job, Contagious Interview). Lazarus subgroups include Andariel (Stonefly), APT38, BlueNoroff (TraderTraitor), and Citrine Sleet. Their operations fund DPRK weapons programs and generate revenue estimated in the billions annually.

---

## Background & Attribution

- **Country of Origin:** Democratic People's Republic of Korea (DPRK / North Korea)
- **Sponsoring Entity:** Reconnaissance General Bureau (RGB), DPRK's primary intelligence agency
- **Active Since:** At least 2009
- **Primary Motivations:** Financial gain (cryptocurrency theft, ransomware), espionage (defense, aerospace, nuclear), destructive operations
- **Alternative Names:** HIDDEN COBRA (US-CERT), Diamond Sleet (Microsoft), ZINC (Microsoft legacy), Labyrinth Chollima (CrowdStrike), NICKEL ACADEMY (SecureWorks), Guardians of Peace, Group G0032 (MITRE)

### Key Subgroups

| Subgroup | Focus | Notable Operations |
|----------|-------|--------------------|
| **BlueNoroff / TraderTraitor** | Cryptocurrency & financial institutions | Bybit heist ($1.5B), Bangladesh Bank ($81M), AppleJeus |
| **Andariel / Stonefly** | Espionage & ransomware | Medusa ransomware, defense/tech targeting |
| **APT38** | Banking SWIFT network attacks | Multiple bank heists worldwide |
| **Citrine Sleet / Gleaming Pisces** | Developer supply chain & crypto | PondRAT, ThemeForestRAT, Operation 99 |

---

## FBI Wanted List & Indicted Members

Three members of Lazarus Group have been indicted by the U.S. Department of Justice and are featured on the FBI's Cyber Most Wanted list. All three are members of the DPRK's Reconnaissance General Bureau (RGB) military intelligence service.

| Name | Age (at indictment) | FBI Wanted Page | Charges | Key Attacks |
|------|---------------------|-----------------|---------|-------------|
| **Park Jin Hyok** | ~36 | [FBI Wanted](https://www.fbi.gov/wanted/cyber/park-jin-hyok) | Conspiracy to Commit Wire Fraud & Bank Fraud; Conspiracy to Commit Computer-Related Fraud (Computer Intrusion) | 2014 Sony Pictures hack, 2016 Bangladesh Bank heist ($81M), 2017 WannaCry ransomware |
| **Jon Chang Hyok** | ~31 | [FBI Wanted](https://www.fbi.gov/wanted/cyber/jon-chang-hyok) | Conspiracy to Commit Wire Fraud & Bank Fraud; Conspiracy to Commit Computer-Related Fraud (Computer Intrusion) | ATM cash-out schemes, cryptocurrency theft, fraudulent blockchain applications |
| **Kim Il** | ~27 | FBI Cyber Most Wanted | Conspiracy to Commit Wire Fraud & Bank Fraud; Conspiracy to Commit Computer-Related Fraud (Computer Intrusion) | Bank heists in Asia and Africa, cryptocurrency theft schemes |

**Additional Charges:**
- The three are alleged to have stolen or extorted more than **$1.3 billion** in cash and cryptocurrency
- Schemes included a **$6.1 million ATM heist** from Bank Islami in Pakistan
- Used fake interbank (SWIFT) messages to attempt theft from financial institutions in Bangladesh, Vietnam, Taiwan, Mexico, Malta, and several African countries
- Created the **WannaCry 2.0** ransomware used to extort companies and the UK's National Health Service

**Associated Money Launderer:**
- **Ghaleb Alaumary** (37, Mississauga, Ontario, Canada) — pleaded guilty to money laundering for North Korean schemes including ATM cash-outs, BEC attacks, and other fraud. Organized teams of co-conspirators in the US and Canada to launder millions for the DPRK regime.

All three North Korean operatives remain at large and are considered fugitives by the U.S. Department of Justice. Park Jin Hyok reportedly worked for **Chosun Expo Joint Venture**, a North Korean front company operating in Dalian, China.

---

## Recent Campaigns & Activity (2025–2026)

### 1. Bybit Cryptocurrency Heist (February 2025)

The largest cryptocurrency theft in history. Lazarus (via the TraderTraitor subgroup) compromised Safe{Wallet}'s development infrastructure through a supply chain attack, stealing approximately 401,000 ETH (~$1.5 billion).

**Attack Chain:**
1. Social engineering of a Safe{Wallet} developer — compromised workstation
2. Stole AWS session tokens to access Safe{Wallet}'s infrastructure
3. Injected malicious JavaScript into the Safe{Wallet} UI bundle (`_app-52c9031bfa03da47.js`)
4. Malicious code monitored for Bybit signer addresses, then replaced transaction parameters
5. Bybit operators approved what appeared to be legitimate transactions, but recipient addresses were replaced with attacker-controlled ones
6. On-chain: `execTransaction()` triggered `delegatecall` to attacker contract, modifying storage slot 0 to grant full proxy control
7. ~401,347 ETH drained in a single transaction

**Key IOCs:**
- Bybit Cold Wallet (Proxy): `0x1Db92e2EeBC8E0c075a02BeA49a2935BcD2dFCF4`
- Attacker Contract: `0x96221423681A6d52E184D440a8eFCEbB105C7242`
- Attacker Destination: `0xbDd077f651EBe7f7b3cE16fe5F2b025BE2969516`
- Tampered JS file: `_app-52c9031bfa03da47.js`

### 2. Medusa Ransomware Deployment (Late 2025–2026)

Lazarus subgroup Stonefly/Andariel has adopted Medusa ransomware-as-a-service, shifting from pure espionage to extortion. Confirmed targets include a Middle East organization and U.S. healthcare/nonprofit entities.

**Malware & Tools Deployed:**
- Medusa ransomware (SHA256: `15208030eda48b3786f7d85d756d2bd6596ef0f465d9c8509a8f02c53fad9a10`)
- Comebacker backdoor (multiple variants)
- BLINDINGCAN information stealer
- ChromeStealer
- Mimikatz
- RP_Proxy tunneling tool
- DLL sideloading payloads

**File Hash IOCs (Comebacker):**
- `0842dd5c1f79f313ea08c49d1fb227654c32485b3f413e354dbe47b8a519a120`
- `202b03d788df6a9d22bbd2cbc01ba9c7b4a9caad0f78a4d420f8c2c30171a08d`
- `61f3b09bcbae2fc2c98ccac7b2a0becdf5ddb28fe6a8b9c679fd574d58f8ca40`
- `8f6866532abd8400d244d0441be097f8209065ac43d9f864b2a6894f9da2880a`
- `a12c84dabaffa868507807c645f7f0769ac848cc575a8c3b42dfb791aa5caeef`
- `bf27c5e2591febe90e52cd99231526a342bc423000fe87cce44ef1c3acaeeab5`

**File Hash IOCs (Loaders):**
- `60b942bbdac625300eeb11cccba5ed44f376634f73d3bc01a17e7a758c570a8e` — Comebacker Loader
- `7a22880780c74b212e36ebb871af4af26a620326c456cf96a3dfb1481ee436cc` — Loader
- `ab3e3a8673ba5da40b325b160a782cf2f03547d9b489e87d9546da35a65d62d6` — SSH Loader
- `16d57ff889aab5b8c8a646da99d5a9335177fb4c158191baa1cf199f0e818d3a` — DLL sideloading

**File Hash IOCs (Credential Theft):**
- `db98d087d4cdb2a82096df424f86edea8d4730543a2005f43bede9ffc6123791` — Mimikatz
- `e24e4c949894b08a66b925b6c55f12d1b3c69adc95b79e99a31315e289d193fc` — ChromeStealer
- `61c49c8f116cb7118dee613536085cfaa7a59d5f49c36b9ff432be7b8a7f25f0` — Credential Stealer

**File Hash IOCs (RP_Proxy):**
- `3e3e0519a154266da1558e324c9097e7c39ccf88f323f2f932f204871d1b91cb`
- `60aaf6c01ba0c15b78902fd4be12c7e5f2323ade8f9db7e9fbbb9ec0c2afc8ba`
- `7530323c3976687a329e06bb7b7f95017f2cfd408f6a5261cb2f0c6b6f18f081`
- `ce4fcb97ada09a42c03c3456c5fe09d805948a95efaf365eb1cd2b4e82013990`

**Network IOCs:**
- `23.27.140[.]49`
- `23.27.140[.]135`
- `23.27.140[.]228`
- `23.27.124[.]228`

**Domain IOCs:**
- `amazonfiso[.]com`
- `human-check[.]com`
- `illycoffee[.]my`
- `illycafe[.]my`
- `markethubuk[.]com`
- `sictradingc[.]com`
- `trustpdfs[.]com`
- `zypras[.]com`

### 3. Operation Dream Job / Contagious Interview (2024–2026)

Long-running social engineering campaign targeting developers, cryptocurrency professionals, and defense sector employees with fake job offers. Recent variants include Operation 99 and the "graphalgo" campaign.

**Attack Chain:**
1. Fake recruiter profiles on LinkedIn, Telegram, Facebook approach targets
2. Targets are given coding assessments linking to malicious GitHub/GitLab repositories
3. Malicious npm/PyPI packages execute backdoors (InvisibleFerret, OtterCookie, PyLangGhost)
4. RATs establish persistent C2, steal credentials, crypto wallet data, and proprietary code

**Notable Malware:**
- **InvisibleFerret** — Modular RAT with keylogging, screen capture, persistent C2
- **OtterCookie** — Information stealer targeting authentication tokens, session data, crypto wallets
- **PyLangGhost** — RAT for long-term espionage and data theft
- **ScoringMathTea** — Complex RAT with ~40 commands, rolling substitution cipher
- **PondRAT** — Stripped-down POOLRAT variant; file read/write, process execution, shellcode
- **ThemeForestRAT** — 20+ commands; file/drive enumeration, process manipulation, RDP/USB monitoring
- **RemotePE** — C++ RAT using Windows DPAPI for environmental keying; reserved for high-value targets

**Supply Chain Scale:**
- 234+ malicious packages in npm/PyPI in first half of 2025 alone
- `bigmathutils` npm package: 10,000+ downloads before malicious v1.1.0 released Feb 2026
- 36,000 organizations affected across Europe, India, Brazil

**Domain IOCs (Operation Dream Job):**
- `codepool[.]cloud`
- `aurevian[.]cloud`
- `keondigital[.]com`
- `pypilibrary[.]com`
- `arcashop[.]org`

### 4. Fake IT Worker Scheme

Over 100 U.S. companies compromised using stolen and AI-enhanced identities. An Atlanta blockchain firm lost $900,000 in virtual currency. Proceeds fund espionage targeting defense, tech, and government sectors.

---

## MITRE ATT&CK Mapping

### Reconnaissance
| ID | Technique | Lazarus Usage |
|----|-----------|---------------|
| T1593.001 | Search Open Websites: Social Media | LinkedIn/Twitter reconnaissance of target employees |
| T1589.002 | Gather Victim Identity: Email Addresses | Collects email addresses for spearphishing |
| T1591.004 | Identify Roles | Targets specific individuals with job offers |

### Resource Development
| ID | Technique | Lazarus Usage |
|----|-----------|---------------|
| T1583.001 | Acquire Infrastructure: Domains | Registers domains for C2 and distribution |
| T1583.004 | Acquire Infrastructure: Server | Acquires servers for malicious tool hosting |
| T1583.006 | Acquire Infrastructure: Web Services | Hosts malware on GitHub, Dropbox, OneDrive |
| T1585.001 | Establish Accounts: Social Media | Creates fake LinkedIn/Twitter recruiter profiles |
| T1585.002 | Establish Accounts: Email | Creates fake email accounts for phishing |
| T1587.001 | Develop Capabilities: Malware | Develops custom malware (DRATzarus, Torisma, etc.) |
| T1587.002 | Develop Capabilities: Code Signing | Digitally signs malware |
| T1588.002 | Obtain Capabilities: Tool | Obtains Mimikatz, Responder, PuTTy PSCP |

### Initial Access
| ID | Technique | Lazarus Usage |
|----|-----------|---------------|
| T1566.001 | Spearphishing Attachment | Malicious Word documents with macros |
| T1566.002 | Spearphishing Link | Malicious OneDrive/Google Drive links |
| T1566.003 | Spearphishing via Service | LinkedIn/Twitter fake recruiter messages |
| T1189 | Drive-by Compromise | Watering hole attacks delivering RATANKBA |
| T1199 | Trusted Relationship | Supply chain compromise (Safe{Wallet}, npm packages) |

### Execution
| ID | Technique | Lazarus Usage |
|----|-----------|---------------|
| T1059.001 | PowerShell | Executes commands and malicious payloads |
| T1059.003 | Windows Command Shell | Uses cmd.exe for host commands |
| T1059.005 | Visual Basic | Macros embedded in Word documents |
| T1204.001 | User Execution: Malicious Link | Lures users to execute malicious links |
| T1204.002 | User Execution: Malicious File | Tricks users into launching documents |
| T1047 | Windows Management Instrumentation | WMIC for discovery and execution |
| T1203 | Exploitation for Client Execution | Exploits Adobe Flash (CVE-2018-4878) |

### Persistence
| ID | Technique | Lazarus Usage |
|----|-----------|---------------|
| T1547.001 | Registry Run Keys / Startup Folder | Registry Run keys and startup folder entries |
| T1547.009 | Shortcut Modification | Creates LNK shortcuts for persistence |
| T1543.003 | Windows Service | Installs malware as system services |
| T1053.005 | Scheduled Task | Uses schtasks for persistence |
| T1505.004 | IIS Components | Targets IIS servers for C2 installation |

### Defense Evasion
| ID | Technique | Lazarus Usage |
|----|-----------|---------------|
| T1027.002 | Software Packing | Themida, VMProtect packers |
| T1027.007 | Dynamic API Resolution | Custom hashing to resolve APIs at runtime |
| T1027.009 | Embedded Payloads | Payloads embedded in PNG files |
| T1027.013 | Encrypted/Encoded File | AES, RC4, XOR, Base64 encryption |
| T1036.005 | Match Legitimate Name | Renames malware as Microsoft narrator |
| T1070.004 | File Deletion | "Suicide scripts" for secure file deletion |
| T1070.006 | Timestomp | Copies legitimate file timestamps |
| T1140 | Deobfuscate/Decode Files | Decrypts and manually maps DLLs into memory |
| T1553.002 | Code Signing | Signs malware with Sectigo RSA certificates |
| T1574.001 | DLL Search Order Hijacking | DLL side-loading via replaced win_fw.dll |
| T1622 | Debugger Evasion | IsDebuggerPresent checks |
| T1497.001 | System Checks | Detects sandboxes and VMware services |
| T1218.011 | Rundll32 | Executes payloads via rundll32 |
| T1218.010 | Regsvr32 | Executes malware via regsvr32 |
| T1220 | XSL Script Processing | Remote XSL scripts to download DLLs |

### Credential Access
| ID | Technique | Lazarus Usage |
|----|-----------|---------------|
| T1003 | OS Credential Dumping | Mimikatz, procdump against LSASS |
| T1110.003 | Password Spraying | Weak passwords against Windows shares |
| T1555 | Credentials from Password Stores | ChromeStealer for browser credentials |
| T1056.001 | Keylogging | KiloAlfa malware with keylogging |

### Discovery
| ID | Technique | Lazarus Usage |
|----|-----------|---------------|
| T1082 | System Information Discovery | Collects OS type, computer name, CPU info |
| T1016 | System Network Configuration Discovery | Network interface enumeration |
| T1057 | Process Discovery | Gathers running processes for C2 |
| T1083 | File and Directory Discovery | Enumerates files by extension |
| T1087.002 | Domain Account Discovery | Queries AD for employee lists |
| T1012 | Query Registry | Checks for Bitcoin wallets, remote access tools |
| T1046 | Network Service Discovery | nmap port scanning |

### Lateral Movement
| ID | Technique | Lazarus Usage |
|----|-----------|---------------|
| T1021.001 | Remote Desktop Protocol | SierraCharlie malware uses RDP |
| T1021.002 | SMB/Windows Admin Shares | SierraAlfa accesses ADMIN$ shares |
| T1021.004 | SSH | SSH and PuTTy PSCP for access |

### Collection & Exfiltration
| ID | Technique | Lazarus Usage |
|----|-----------|---------------|
| T1560 | Archive Collected Data | RAR compression with custom encryption |
| T1074.001 | Local Data Staging | Stages data in %TEMP% before exfiltration |
| T1041 | Exfiltration Over C2 Channel | Exfiltrates through C2 connections |
| T1567.002 | Exfiltration Over Web Service | Custom dbxcli for Dropbox exfiltration |

### Command & Control
| ID | Technique | Lazarus Usage |
|----|-----------|---------------|
| T1071.001 | Web Protocols | C2 over HTTP/HTTPS |
| T1573.001 | Symmetric Cryptography | XOR, AES, Caracachs encrypted channels |
| T1001.003 | Protocol Impersonation | FakeTLS encryption mimicking TLS |
| T1008 | Fallback Channels | Multiple hard-coded C2 servers |
| T1571 | Non-Standard Port | Port-protocol mismatches for C2 |
| T1102.002 | Bidirectional Communication | GitHub as C2 (commits execution output) |
| T1090 | Proxy | Internal and external proxies to obfuscate traffic |

### Impact
| ID | Technique | Lazarus Usage |
|----|-----------|---------------|
| T1485 | Data Destruction | Overwrites file contents with heap memory data |
| T1561.001 | Disk Content Wipe | Overwrites first 64MB+ of drives |
| T1561.002 | Disk Structure Wipe | Overwrites Master Boot Record |
| T1489 | Service Stop | Stops MSExchangeIS service |
| T1529 | System Shutdown/Reboot | Reboots after destroying files |

---

## Indicators of Compromise (IOC) Summary

### File Hashes (SHA256)

| Hash | Description |
|------|-------------|
| `15208030eda48b3786f7d85d756d2bd6596ef0f465d9c8509a8f02c53fad9a10` | Medusa ransomware |
| `0842dd5c1f79f313ea08c49d1fb227654c32485b3f413e354dbe47b8a519a120` | Comebacker backdoor |
| `202b03d788df6a9d22bbd2cbc01ba9c7b4a9caad0f78a4d420f8c2c30171a08d` | Comebacker backdoor |
| `61f3b09bcbae2fc2c98ccac7b2a0becdf5ddb28fe6a8b9c679fd574d58f8ca40` | Comebacker backdoor |
| `8f6866532abd8400d244d0441be097f8209065ac43d9f864b2a6894f9da2880a` | Comebacker backdoor |
| `a12c84dabaffa868507807c645f7f0769ac848cc575a8c3b42dfb791aa5caeef` | Comebacker backdoor |
| `bf27c5e2591febe90e52cd99231526a342bc423000fe87cce44ef1c3acaeeab5` | Comebacker backdoor |
| `60b942bbdac625300eeb11cccba5ed44f376634f73d3bc01a17e7a758c570a8e` | Comebacker Loader |
| `7a22880780c74b212e36ebb871af4af26a620326c456cf96a3dfb1481ee436cc` | Loader |
| `ab3e3a8673ba5da40b325b160a782cf2f03547d9b489e87d9546da35a65d62d6` | SSH Loader |
| `16d57ff889aab5b8c8a646da99d5a9335177fb4c158191baa1cf199f0e818d3a` | DLL sideloading |
| `db98d087d4cdb2a82096df424f86edea8d4730543a2005f43bede9ffc6123791` | Mimikatz variant |
| `e24e4c949894b08a66b925b6c55f12d1b3c69adc95b79e99a31315e289d193fc` | ChromeStealer |
| `61c49c8f116cb7118dee613536085cfaa7a59d5f49c36b9ff432be7b8a7f25f0` | Credential Stealer |
| `3e3e0519a154266da1558e324c9097e7c39ccf88f323f2f932f204871d1b91cb` | RP_Proxy |
| `60aaf6c01ba0c15b78902fd4be12c7e5f2323ade8f9db7e9fbbb9ec0c2afc8ba` | RP_Proxy |
| `7530323c3976687a329e06bb7b7f95017f2cfd408f6a5261cb2f0c6b6f18f081` | RP_Proxy |
| `ce4fcb97ada09a42c03c3456c5fe09d805948a95efaf365eb1cd2b4e82013990` | RP_Proxy |

### Network Indicators

| Type | Indicator | Context |
|------|-----------|---------|
| IP | `23.27.140[.]49` | C2 infrastructure (Medusa campaign) |
| IP | `23.27.140[.]135` | C2 infrastructure (Medusa campaign) |
| IP | `23.27.140[.]228` | C2 infrastructure (Medusa campaign) |
| IP | `23.27.124[.]228` | C2 infrastructure (Medusa campaign) |
| Domain | `amazonfiso[.]com` | C2 / phishing infrastructure |
| Domain | `human-check[.]com` | C2 / phishing infrastructure |
| Domain | `illycoffee[.]my` | C2 / phishing infrastructure |
| Domain | `illycafe[.]my` | C2 / phishing infrastructure |
| Domain | `markethubuk[.]com` | C2 / phishing infrastructure |
| Domain | `sictradingc[.]com` | C2 / phishing infrastructure |
| Domain | `trustpdfs[.]com` | C2 / phishing infrastructure |
| Domain | `zypras[.]com` | C2 / phishing infrastructure |
| Domain | `codepool[.]cloud` | ScoringMathTea RAT C2 |
| Domain | `aurevian[.]cloud` | ScoringMathTea RAT C2 |
| Domain | `keondigital[.]com` | AppleJeus / supply chain C2 |
| Domain | `pypilibrary[.]com` | Supply chain attack infrastructure |
| Domain | `arcashop[.]org` | Supply chain attack infrastructure |

### Blockchain Indicators (Bybit Heist)

| Type | Address | Context |
|------|---------|---------|
| ETH Contract | `0x96221423681A6d52E184D440a8eFCEbB105C7242` | Attacker malicious contract |
| ETH Address | `0xbDd077f651EBe7f7b3cE16fe5F2b025BE2969516` | Attacker destination wallet |

---

## Detection Rules

The following detection rules target key Lazarus Group TTPs across their major campaigns. Rules cover credential dumping (T1003), DLL sideloading (T1574.001), supply chain package execution (T1195), suspicious scheduled tasks (T1053.005), PowerShell-based payload delivery (T1059.001), and network indicators from active C2 infrastructure. Log sources covered include Windows Security/Sysmon, process creation, DNS, network connections, and file events.

### Sigma Rules

#### Sigma Rule 1: Lazarus-Style LSASS Credential Dumping via Procdump

```yaml
title: Lazarus-Style LSASS Credential Dumping via Procdump
id: 8a7c5f3e-1b2d-4c6a-9e0f-3d4b5a6c7d8e
status: experimental
description: Detects use of procdump to dump LSASS memory, a technique heavily used by Lazarus Group for credential access (T1003.001).
references:
    - https://attack.mitre.org/groups/G0032/
    - https://attack.mitre.org/techniques/T1003/001/
author: AEGIS Research Agent
date: 2026-04-02
tags:
    - attack.credential_access
    - attack.t1003.001
    - threat.group.lazarus
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\procdump.exe'
        CommandLine|contains|all:
            - 'lsass'
            - '-ma'
    condition: selection
falsepositives:
    - Legitimate system administrators using procdump for troubleshooting
level: high
```

<!-- Validated -->

#### Sigma Rule 2: Suspicious DLL Sideloading via Rundll32 — Lazarus TTP

```yaml
title: Suspicious DLL Sideloading via Rundll32 — Lazarus TTP
id: 9b8c6f4d-2c3e-5d7b-0f1a-4e5c6b7d8e9f
status: experimental
description: Detects rundll32.exe executing DLLs from suspicious temporary or user-writable directories, consistent with Lazarus Group DLL sideloading techniques (T1574.001, T1218.011).
references:
    - https://attack.mitre.org/groups/G0032/
    - https://attack.mitre.org/techniques/T1574/001/
author: AEGIS Research Agent
date: 2026-04-02
tags:
    - attack.defense_evasion
    - attack.t1218.011
    - attack.persistence
    - attack.t1574.001
    - threat.group.lazarus
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\rundll32.exe'
    filter_paths:
        CommandLine|contains:
            - '\AppData\Local\Temp\'
            - '\Users\Public\'
            - '\ProgramData\'
            - '\Windows\Temp\'
    filter_system:
        CommandLine|contains:
            - '\Windows\System32\'
            - '\Windows\SysWOW64\'
            - '\Program Files'
    condition: selection and filter_paths and not filter_system
falsepositives:
    - Legitimate software installers using rundll32 from temp directories
level: medium
```

<!-- Validated -->

#### Sigma Rule 3: Lazarus Scheduled Task Persistence Pattern

```yaml
title: Lazarus Scheduled Task Persistence Pattern
id: 0c9d7a5e-3d4f-6e8c-1a2b-5f6d7e8a9b0c
status: experimental
description: Detects creation of scheduled tasks with characteristics matching Lazarus Group persistence patterns — tasks executing DLLs via rundll32 or scripts from temp directories (T1053.005).
references:
    - https://attack.mitre.org/groups/G0032/
    - https://attack.mitre.org/techniques/T1053/005/
author: AEGIS Research Agent
date: 2026-04-02
tags:
    - attack.persistence
    - attack.t1053.005
    - threat.group.lazarus
logsource:
    category: process_creation
    product: windows
detection:
    selection_schtasks:
        Image|endswith: '\schtasks.exe'
        CommandLine|contains: '/create'
    selection_payload:
        CommandLine|contains:
            - 'rundll32'
            - 'regsvr32'
            - 'mshta'
            - 'wscript'
            - 'cscript'
    selection_location:
        CommandLine|contains:
            - '\Temp\'
            - '\AppData\'
            - '\ProgramData\'
            - '\Users\Public\'
    condition: selection_schtasks and selection_payload and selection_location
falsepositives:
    - Software installers creating scheduled tasks for updates
level: high
```

<!-- Validated -->

#### Sigma Rule 4: DNS Query to Known Lazarus C2 Domains

```yaml
title: DNS Query to Known Lazarus C2 Domains
id: 1d0e8b6f-4e5a-7f9d-2b3c-6a7e8f9b0c1d
status: experimental
description: Detects DNS queries to domains associated with active Lazarus Group C2 infrastructure from Medusa ransomware and Operation Dream Job campaigns.
references:
    - https://attack.mitre.org/groups/G0032/
    - https://www.security.com/threat-intelligence/lazarus-medusa-ransomware
author: AEGIS Research Agent
date: 2026-04-02
tags:
    - attack.command_and_control
    - attack.t1071.001
    - threat.group.lazarus
logsource:
    category: dns_query
    product: windows
detection:
    selection:
        QueryName|endswith:
            - 'amazonfiso.com'
            - 'human-check.com'
            - 'illycoffee.my'
            - 'illycafe.my'
            - 'markethubuk.com'
            - 'sictradingc.com'
            - 'trustpdfs.com'
            - 'zypras.com'
            - 'codepool.cloud'
            - 'aurevian.cloud'
            - 'keondigital.com'
            - 'pypilibrary.com'
            - 'arcashop.org'
    condition: selection
falsepositives:
    - Unlikely — these are known malicious domains
level: critical
```

<!-- Validated -->

#### Sigma Rule 5: Suspicious npm/PyPI Package Installation with Network Callback

```yaml
title: Suspicious npm/PyPI Package Installation with Network Callback
id: 2e1f9c7a-5f6b-8a0e-3c4d-7b8f9a0c1d2e
status: experimental
description: Detects node.js or Python processes spawning network connections shortly after package installation, consistent with Lazarus supply chain attacks via malicious npm/PyPI packages.
references:
    - https://attack.mitre.org/groups/G0032/
    - https://thehackernews.com/2026/02/lazarus-campaign-plants-malicious.html
author: AEGIS Research Agent
date: 2026-04-02
tags:
    - attack.execution
    - attack.t1059.007
    - attack.initial_access
    - attack.t1195.002
    - threat.group.lazarus
logsource:
    category: process_creation
    product: windows
detection:
    selection_parent:
        ParentImage|endswith:
            - '\npm.cmd'
            - '\node.exe'
            - '\pip.exe'
            - '\pip3.exe'
            - '\python.exe'
            - '\python3.exe'
    selection_child:
        Image|endswith:
            - '\cmd.exe'
            - '\powershell.exe'
            - '\curl.exe'
            - '\wget.exe'
            - '\certutil.exe'
    condition: selection_parent and selection_child
falsepositives:
    - Legitimate post-install scripts in npm/pip packages
    - Development build tools
level: medium
```

<!-- Validated -->

### YARA Rules

#### YARA Rule 1: Lazarus Comebacker Backdoor

```yara
rule Lazarus_Comebacker_Backdoor
{
    meta:
        description = "Detects Lazarus Group Comebacker backdoor variants used in Medusa ransomware and espionage campaigns"
        author = "AEGIS Research Agent"
        date = "2026-04-02"
        reference = "https://www.security.com/threat-intelligence/lazarus-medusa-ransomware"
        hash1 = "0842dd5c1f79f313ea08c49d1fb227654c32485b3f413e354dbe47b8a519a120"
        hash2 = "202b03d788df6a9d22bbd2cbc01ba9c7b4a9caad0f78a4d420f8c2c30171a08d"
        severity = "high"
        tlp = "amber"

    strings:
        $mz = "MZ"

        // Common Comebacker C2 communication patterns
        $s1 = "POST /api/" ascii wide
        $s2 = "Content-Type: application/x-www-form-urlencoded" ascii wide
        $s3 = "Mozilla/5.0" ascii wide

        // Registry persistence patterns
        $r1 = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" ascii wide
        $r2 = "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders" ascii wide

        // Crypto and encoding routines
        $c1 = { 8B ?? 33 ?? 89 ?? 83 ?? 04 } // XOR loop pattern
        $c2 = "AES" ascii wide
        $c3 = "CryptDecrypt" ascii
        $c4 = "CryptEncrypt" ascii

        // Anti-analysis
        $a1 = "IsDebuggerPresent" ascii
        $a2 = "GetTickCount" ascii
        $a3 = "vmware" ascii nocase
        $a4 = "VBoxService" ascii nocase

    condition:
        $mz at 0 and
        (3 of ($s*)) and
        (1 of ($c*)) and
        (1 of ($a*)) and
        (1 of ($r*))
}
```

<!-- Validated -->

#### YARA Rule 2: Lazarus Supply Chain Malicious npm/PyPI Package

```yara
rule Lazarus_Supply_Chain_Malicious_Package
{
    meta:
        description = "Detects malicious JavaScript/Python packages associated with Lazarus Group supply chain attacks (graphalgo, bigmathutils campaigns)"
        author = "AEGIS Research Agent"
        date = "2026-04-02"
        reference = "https://thehackernews.com/2026/02/lazarus-campaign-plants-malicious.html"
        severity = "high"
        tlp = "amber"

    strings:
        // Malicious package indicators
        $pkg1 = "graphalgo" ascii
        $pkg2 = "bigmathutils" ascii
        $pkg3 = "graphnetworkx" ascii

        // Common Lazarus JS payload patterns
        $js1 = "child_process" ascii
        $js2 = "eval(Buffer.from(" ascii
        $js3 = ".spawn(" ascii
        $js4 = "require('os')" ascii

        // Python payload patterns
        $py1 = "subprocess.Popen" ascii
        $py2 = "base64.b64decode" ascii
        $py3 = "exec(compile(" ascii

        // C2 callback patterns
        $c2_1 = "XMLHttpRequest" ascii
        $c2_2 = "fetch(" ascii
        $c2_3 = "urllib.request" ascii

        // Credential/wallet theft
        $steal1 = "discord" ascii nocase
        $steal2 = "wallet" ascii nocase
        $steal3 = "chrome" ascii nocase
        $steal4 = "keychain" ascii nocase

    condition:
        (1 of ($pkg*)) or
        (
            filesize < 500KB and
            (2 of ($js*) or 2 of ($py*)) and
            (1 of ($c2_*)) and
            (1 of ($steal*))
        )
}
```

<!-- Validated -->

### Snort Rules

#### Snort Rule 1: Lazarus C2 Domain DNS Lookup

```
alert dns $HOME_NET any -> any 53 (msg:"AEGIS - Lazarus Group Known C2 Domain DNS Query"; content:"amazonfiso"; nocase; sid:2026040201; rev:1; classtype:trojan-activity; metadata:author AEGIS, date 2026-04-02, threat_group Lazarus, mitre_attack T1071.001;)
alert dns $HOME_NET any -> any 53 (msg:"AEGIS - Lazarus Group Known C2 Domain DNS Query"; content:"human-check"; nocase; sid:2026040202; rev:1; classtype:trojan-activity; metadata:author AEGIS, date 2026-04-02, threat_group Lazarus, mitre_attack T1071.001;)
alert dns $HOME_NET any -> any 53 (msg:"AEGIS - Lazarus Group Known C2 Domain DNS Query"; content:"zypras"; nocase; sid:2026040203; rev:1; classtype:trojan-activity; metadata:author AEGIS, date 2026-04-02, threat_group Lazarus, mitre_attack T1071.001;)
alert dns $HOME_NET any -> any 53 (msg:"AEGIS - Lazarus Group Known C2 Domain DNS Query"; content:"trustpdfs"; nocase; sid:2026040204; rev:1; classtype:trojan-activity; metadata:author AEGIS, date 2026-04-02, threat_group Lazarus, mitre_attack T1071.001;)
alert dns $HOME_NET any -> any 53 (msg:"AEGIS - Lazarus Group Known C2 Domain DNS Query"; content:"sictradingc"; nocase; sid:2026040205; rev:1; classtype:trojan-activity; metadata:author AEGIS, date 2026-04-02, threat_group Lazarus, mitre_attack T1071.001;)
alert dns $HOME_NET any -> any 53 (msg:"AEGIS - Lazarus Group Known C2 Domain DNS Query"; content:"codepool"; nocase; sid:2026040206; rev:1; classtype:trojan-activity; metadata:author AEGIS, date 2026-04-02, threat_group Lazarus, mitre_attack T1071.001;)
```

<!-- UNVALIDATED — snort validation tool not available in environment -->

#### Snort Rule 2: Lazarus C2 IP Communication

```
alert ip $HOME_NET any -> 23.27.140.49 any (msg:"AEGIS - Lazarus Group Known C2 IP Communication"; sid:2026040207; rev:1; classtype:trojan-activity; metadata:author AEGIS, date 2026-04-02, threat_group Lazarus, mitre_attack T1071;)
alert ip $HOME_NET any -> 23.27.140.135 any (msg:"AEGIS - Lazarus Group Known C2 IP Communication"; sid:2026040208; rev:1; classtype:trojan-activity; metadata:author AEGIS, date 2026-04-02, threat_group Lazarus, mitre_attack T1071;)
alert ip $HOME_NET any -> 23.27.140.228 any (msg:"AEGIS - Lazarus Group Known C2 IP Communication"; sid:2026040209; rev:1; classtype:trojan-activity; metadata:author AEGIS, date 2026-04-02, threat_group Lazarus, mitre_attack T1071;)
alert ip $HOME_NET any -> 23.27.124.228 any (msg:"AEGIS - Lazarus Group Known C2 IP Communication"; sid:2026040210; rev:1; classtype:trojan-activity; metadata:author AEGIS, date 2026-04-02, threat_group Lazarus, mitre_attack T1071;)
```

<!-- UNVALIDATED — snort validation tool not available in environment -->

---

## Sources

- [MITRE ATT&CK — Lazarus Group G0032](https://attack.mitre.org/groups/G0032/) — Comprehensive technique mapping and attribution
- [NCC Group — In-Depth Technical Analysis of the Bybit Hack](https://www.nccgroup.com/research/in-depth-technical-analysis-of-the-bybit-hack/) — Full attack chain analysis of the $1.5B heist
- [Security.com — Lazarus Group Now Working With Medusa Ransomware](https://www.security.com/threat-intelligence/lazarus-medusa-ransomware) — IOCs and TTPs for Medusa campaign
- [Security Affairs — Lazarus Deploys Medusa Ransomware Against Middle East Target](https://securityaffairs.com/188460/apt/lazarus-apt-group-deployed-medusa-ransomware-against-middle-east-target.html) — Campaign targeting details
- [The Hacker News — Lazarus Campaign Plants Malicious Packages in npm and PyPI](https://thehackernews.com/2026/02/lazarus-campaign-plants-malicious.html) — Supply chain attack analysis
- [ANY.RUN — Lazarus Group Attacks in 2025: Overview for SOC Teams](https://any.run/cybersecurity-blog/lazarus-group-attacks-2025/) — Malware family analysis and detection guidance
- [SOC Prime — Detect Lazarus Attacks Using Three New RATs](https://socprime.com/blog/detect-lazarus-attacks-using-three-new-rats/) — PondRAT, ThemeForestRAT, RemotePE analysis
- [JPCERT/CC — Lazarus Research TTP/MITRE ATT&CK Mapping](https://github.com/JPCERTCC/Lazarus-research/blob/main/TTP/MITRE_ATT%26CK_Mapping.md) — Campaign-specific technique mapping
- [Security Boulevard — Top Security Incidents of 2025: Lazarus Group's Cryptocurrency Heist](https://securityboulevard.com/2026/02/top-security-incidents-of-2025-lazarus-groups-cryptocurrency-heist/) — Bybit heist overview
- [Picus Security — Lazarus Group (APT38) Explained: Timeline, TTPs, and Major Attacks](https://www.picussecurity.com/resource/blog/lazarus-group-apt38-explained-timeline-ttps-and-major-attacks) — Historical timeline and technique analysis
- [Wiz Blog — TraderTraitor: Deep Dive](https://www.wiz.io/blog/north-korean-tradertraitor-crypto-heist) — BlueNoroff/TraderTraitor analysis
- [Immersive Labs — ScoringMathTea Analysis](https://www.immersivelabs.com/resources/c7-blog/scoringmathtea-analysis-inside-the-lazarus-groups-flagship-cyber-espionage-malware) — RAT command analysis
- [Sonatype — How Lazarus Group is Weaponizing Open Source](https://www.sonatype.com/resources/whitepapers/how-lazarus-group-is-weaponizing-open-source) — Supply chain attack scale analysis
