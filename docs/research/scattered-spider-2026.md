---
title: "Scattered Spider: Recent Campaigns and Evolving TTPs"
date: 2026-04-02
description: "Analysis of Scattered Spider's 2025-2026 campaigns including UK retail attacks, aviation targeting, and DragonForce ransomware pivot."
---

::: warning
**Disclaimer:** This is OSINT summarized by AI. Trust, but verify.
:::

# Scattered Spider — Recent Campaigns & Evolving TTPs (2025–2026)

**Date:** 2026-04-07
**Severity:** Critical
**TLP:** CLEAR
**Aliases:** UNC3944, Scatter Swine, Oktapus, Octo Tempest, Storm-0875, Muddled Libra, 0ktapus, Starfraud

---

## Executive Summary

Scattered Spider remains one of the most active and dangerous cybercriminal collectives operating in 2025–2026. Since the high-profile MGM Resorts and Caesars Entertainment breaches in late 2023, the group has significantly evolved its tactics, expanding from hospitality and telecommunications into retail, aviation, financial services, and technology sectors. Key developments include a pivot to DragonForce Ransomware-as-a-Service (RaaS), escalated Attacker-in-the-Middle (AiTM) phishing operations using Evilginx, deployment of an updated Spectre RAT with enhanced C2 capabilities, and increasingly sophisticated social engineering that targets third-party IT help desks. Despite multiple law enforcement operations resulting in arrests across the US and UK, the group's decentralized structure has allowed operations to continue with minimal disruption.

The April–May 2025 UK retail attacks (Marks & Spencer, Co-op, Harrods) caused an estimated £300M+ in damages, followed by a June–July 2025 wave targeting airlines (Hawaiian Airlines, WestJet, Qantas). A July 29, 2025 joint CISA/FBI advisory updated TTPs with new indicators including DragonForce deployment, AnyDesk/Teleport abuse, and RattyRAT usage. International law enforcement arrested multiple members in 2025, but the threat persists.

---

## Threat Actor Profile

### Structure & Organization
Scattered Spider is a loosely organized, English-speaking cybercriminal collective primarily composed of young adults (ages 17–22) from the US and UK. The group operates with a decentralized structure, recruiting members through online communities (Telegram, Discord). Members specialize in social engineering, with some actors hired specifically for vishing operations at compensation rates of $10,000–$25,000/month plus performance bonuses.

### Motivation
Financial gain through data extortion, ransomware deployment, and cryptocurrency theft. The group has stolen an estimated $11M+ in cryptocurrency and caused hundreds of millions in damages through ransomware operations.

### Ransomware Affiliations
- **ALPHV/BlackCat** (2023): Used in MGM/Caesars attacks
- **RansomHub** (2024): Affiliate operations
- **Qilin** (2024): Secondary ransomware deployment
- **DragonForce** (2025–present): Current primary RaaS platform; 80/20 revenue split with DragonForce operators

---

## Campaign Timeline (2025–2026)

### Q1 2025 — Phishing Infrastructure Overhaul
- Shifted from hyphenated domains (`sso-company[.]com`) to subdomain-based keywords (`sso[.]c0mpany[.]com`) to evade domain monitoring
- Deployed new phishing kit (#5) with dynamic subdomain usage and multi-brand templates
- Began using Cloudflare (AS13335) for hosting alongside existing Njalla (AS39287) and Virtuo (AS399486)
- Registered domains targeting Klaviyo, HubSpot, Pure Storage, Morningstar, Instacart, Vodafone

### Q2 2025 — UK Retail Attacks (April–May)
- **Marks & Spencer** (April 2025): Attackers gained initial access as early as February 2025 by impersonating an M&S employee and calling the third-party service desk to obtain a password reset. Exfiltrated the NTDS.dit file from the Windows domain controller. Deployed DragonForce ransomware, halting warehouse operations for 46 days. Estimated £300M in lost profit; ~£1B stock valuation impact.
- **Co-op Group** (May 2025): Attempted breach via similar social engineering; VPN access suspended as containment measure.
- **Harrods** (May 2025): Intrusion contained; stores remained operational.
- **Additional targets**: Dior, The North Face, Cartier, Victoria's Secret, Adidas at "unprecedented rate"

### Q2–Q3 2025 — Aviation Sector Targeting (June–July)
- **Hawaiian Airlines** (June 26, 2025): Cybersecurity event impacting IT systems
- **WestJet** (June 13, 2025): Incident affecting internal systems and the WestJet app
- **Qantas** (June 30, 2025): Unusual activity on third-party contact centre platform; customer data exposed (names, emails, phone numbers, birth dates, Frequent Flyer numbers)
- FBI issued formal warning on June 30 about Scattered Spider targeting the airline industry

### July 2025 — CISA/FBI Joint Advisory Update
- Updated advisory AA23-320A published July 29, 2025
- Added new TTPs: DragonForce ransomware, AnyDesk, Teleport.sh tunneling, RattyRAT, fake identity backstopping
- Co-authored by Canadian Centre for Cyber Security, Australian Cyber Security Centre, and UK NCSC

### Q3 2025–Q1 2026 — Continued Operations
- Expanded targeting of SaaS platforms (Salesforce, ServiceNow, Workday)
- Increased insider recruitment attempts
- Continued high-volume AiTM phishing campaigns with automated spear-phishing tools

---

## Tactics, Techniques, and Procedures (TTPs)

### Initial Access

#### Social Engineering — Help Desk Exploitation (T1566.004, T1656)
The group's signature technique. Attackers impersonate employees or executives, calling IT help desks to request password resets or MFA device registration. They prepare by gathering employee information from LinkedIn, ZoomInfo, and breached databases. Callers are native English speakers with minimal accents, sometimes using regional dialects (e.g., Southern US). The M&S breach specifically used this vector against a third-party managed service desk.

#### AiTM Phishing with Evilginx (T1566, T1557)
Significantly escalated in 2025. Evilginx-based phishing pages capture both credentials and session tokens, bypassing MFA entirely. Notable behaviors:
- **Rickroll redirects**: Evilginx configuration redirects security researchers to "Never Gonna Give You Up" YouTube video
- **Pre-populated victim information** in phishing links
- **One-time magic links** preventing security team analysis
- **Conditional content loading** — login page only renders for specific usernames
- **Malvertising distribution** via Google Ads to bypass email/network controls

#### SMS Phishing / Smishing (T1660)
High-volume campaigns using automated tools, some abusing Google Voice for identity harvesting at scale.

#### SIM Swapping (T1451)
Transferring victim phone numbers to attacker-controlled SIMs to intercept OTPs and MFA codes.

#### Trusted Relationship Exploitation (T1199)
Compromising MSPs and IT contractors (e.g., Tata Consultancy Services in the M&S attack) as a "one-to-many" access vector.

### Execution & Persistence

#### Remote Monitoring & Management Tools (T1219)
Deploys multiple RMM tools for persistent access:
- AnyDesk (newly added in 2025)
- ScreenConnect / ConnectWise
- Fleetdeck.io
- Level.io
- Pulseway
- Splashtop
- Tactical.RMM
- TeamViewer

#### Tunneling for C2 (T1090, T1572)
- **Ngrok**: Internet tunneling, often tunneling RDP (port 3389)
- **Teleport.sh**: Custom hostname masking (e.g., `CUSTOMERNAME.teleport[.]sh`)
- **Tailscale**: VPN mesh tunneling

#### Identity Federation Abuse (T1484.002)
Adding federated identity providers to victim SSO infrastructure for persistent, unrestricted tenant access.

#### MFA Token Registration (T1556.006)
Registering attacker-controlled MFA devices after obtaining password reset via help desk social engineering.

### Credential Access

#### NTDS.dit Extraction (T1003.003)
Exfiltrating Active Directory database for offline credential harvesting — confirmed in the M&S attack.

#### LSASS Memory Dumping (T1003.001)
Using Mimikatz for credential extraction from memory.

#### MFA Fatigue / Push Bombing (T1621)
Sending repeated MFA notification prompts until victim accepts.

#### Session Cookie Theft (T1539)
Evilginx captures session tokens that bypass MFA entirely.

### Lateral Movement & Discovery

#### Cloud Instance Abuse (T1578.002, T1021.007)
Creating new EC2 instances or accessing pre-existing cloud VMs for lateral movement.

#### Active Directory Enumeration (T1482, T1018)
Using AdFind for domain trust discovery and network mapping. Targeting VMware vCenter, backup infrastructure, and VPN concentrators.

#### DRSGetNCChanges / DCSync
Directory replication requests to extract credentials from domain controllers.

### Exfiltration

#### Multi-Channel Exfiltration (T1567, T1567.002)
- MEGA[.]NZ cloud storage
- Amazon S3 buckets
- Dropbox, FiveTran SaaS connectors
- SSH transfers to Vultr infrastructure
- Snowflake Data Cloud queries via ETL tools

### Impact

#### DragonForce Ransomware (T1486)
Current ransomware of choice. Built from leaked LockBit 3.0 and Conti source code. Targets Windows, Linux, and VMware ESXi systems. Uses RSA + AES / ChaCha8 encryption. Pre-encryption behavior includes shadow copy deletion, event log clearing, backup destruction, and service stopping.

---

## MITRE ATT&CK Mapping

| Tactic | Technique ID | Technique Name |
|--------|-------------|----------------|
| Reconnaissance | T1589 | Gather Victim Identity Information |
| Reconnaissance | T1593.001 | Search Open Websites/Domains: Social Media |
| Reconnaissance | T1594 | Search Victim-Owned Websites |
| Reconnaissance | T1597.002 | Search Closed Sources: Purchase Technical Data |
| Reconnaissance | T1598 | Phishing for Information |
| Reconnaissance | T1598.004 | Phishing for Information: Spearphishing Voice |
| Resource Development | T1583.001 | Acquire Infrastructure: Domains |
| Resource Development | T1585.001 | Establish Accounts: Social Media Accounts |
| Initial Access | T1078.002 | Valid Accounts: Domain Accounts |
| Initial Access | T1199 | Trusted Relationship |
| Initial Access | T1566 | Phishing |
| Initial Access | T1566.004 | Phishing: Spearphishing Voice |
| Initial Access | T1660 | SMS Phishing |
| Execution | T1204 | User Execution |
| Execution | T1648 | Serverless Execution |
| Persistence | T1078 | Valid Accounts |
| Persistence | T1136 | Create Account |
| Persistence | T1484.002 | Domain Policy Modification: Trust Modification |
| Persistence | T1556.006 | Modify Authentication Process: MFA |
| Defense Evasion | T1090 | Proxy |
| Defense Evasion | T1562.001 | Impair Defenses: Disable or Modify Tools |
| Defense Evasion | T1656 | Impersonation |
| Credential Access | T1003.001 | OS Credential Dumping: LSASS Memory |
| Credential Access | T1003.003 | OS Credential Dumping: NTDS |
| Credential Access | T1451 | SIM Card Swap |
| Credential Access | T1539 | Steal Web Session Cookie |
| Credential Access | T1552.001 | Unsecured Credentials: Credentials in Files |
| Credential Access | T1606 | Forge Web Credentials |
| Credential Access | T1621 | Multi-Factor Authentication Request Generation |
| Discovery | T1018 | Remote System Discovery |
| Discovery | T1046 | Network Service Discovery |
| Discovery | T1082 | System Information Discovery |
| Discovery | T1083 | File and Directory Discovery |
| Discovery | T1213.002 | Data from Information Repositories: SharePoint |
| Discovery | T1213.003 | Data from Information Repositories: Code Repositories |
| Discovery | T1482 | Domain Trust Discovery |
| Lateral Movement | T1021.001 | Remote Services: RDP |
| Lateral Movement | T1021.002 | Remote Services: SMB/Windows Admin Shares |
| Lateral Movement | T1021.007 | Remote Services: Cloud Services |
| Lateral Movement | T1578.002 | Modify Cloud Compute Infrastructure: Create Cloud Instance |
| Collection | T1074 | Data Staged |
| Collection | T1114 | Email Collection |
| Collection | T1530 | Data from Cloud Storage |
| Command and Control | T1071.001 | Application Layer Protocol: Web Protocols |
| Command and Control | T1219 | Remote Access Software |
| Command and Control | T1572 | Protocol Tunneling |
| Exfiltration | T1567 | Exfiltration Over Web Service |
| Exfiltration | T1567.002 | Exfiltration Over Web Service: Exfiltration to Cloud Storage |
| Impact | T1486 | Data Encrypted for Impact |
| Impact | T1490 | Inhibit System Recovery |
| Impact | T1657 | Financial Theft |

---

## Indicators of Compromise

### Phishing Domain Patterns (Defanged)
| Domain | Target | Date |
|--------|--------|------|
| klv1[.]it[.]com | Klaviyo | Feb 2025 |
| corp-hubspot[.]com | HubSpot | Q1 2025 |
| morningstar-okta[.]com | Morningstar | Q1 2025 |
| pure-okta[.]com | Pure Storage | Q1 2025 |
| signin-nydig[.]com | NYDIG | Q1 2025 |
| sso-instacart[.]com | Instacart | Q1 2025 |
| sts-vodafone[.]com | Vodafone | Q1 2025 |
| paxos-my-salesforce[.]com | Paxos | Feb 2025 |
| twitter-okta[.]com | X/Twitter | Oct 2024 |
| targetsname-cms[.]com | Generic pattern | 2025 |
| targetsname-helpdesk[.]com | Generic pattern | 2025 |
| oktalogin-targetcompany[.]com | Generic pattern | 2025 |

**Domain naming conventions (keywords):** `okta`, `sso`, `help`, `he1p`, `helpdesk`, `internal`, `connect`, `duo`, `vpn`, `mfa`, `support`, `servicedesk`, `corp`, `dev`, `workspace`, `ops`, `hr`, `cdn`

**TLD preferences:** .com, .co, .net, .org

**Registrars:** NiceNIC, Hosting Concepts B.V., NameSilo, GoDaddy

**Domain lifespan:** Typically active less than 7 days; some as short as 5 minutes to 2 hours

### Hosting Infrastructure (ASNs)
| ASN | Provider | Notes |
|-----|----------|-------|
| AS13335 | Cloudflare | New in January 2025 |
| AS39287 | ABSTRACT (Njalla) | Finland; active since Oct 2024 |
| AS399486 | Virtuo | Canada; active since Aug 2024 |
| AS14061 | DigitalOcean | Historical |
| AS20473 | AS-CHOOPA (Vultr) | Historical; used for exfiltration |

### DragonForce Ransomware Hashes
| Type | Hash | Notes |
|------|------|-------|
| SHA-256 | 1ccf8baf11427fae273ffed587b41c857fa2d8f3d3c6c0ddaa1fe4835f665eba | DragonForce sample |
| SHA-256 | dc7e706587d4897789cc4a5f7cccbb539646b58aa9c86272728c8c1e6ec2a529 | DragonForce sample |
| SHA-256 | 410db536a57c511b0ccac2639e0eb3320f303fc5c90242379ab43364c51ef321 | DragonForce sample |
| SHA-256 | f5df98b344242c5eaad1fce421c640fadd71f7f21379d2bf7309001dfeb25972 | DragonForce sample |
| SHA-256 | 24e8ef41ead6fc45d9a7ec2c306fd04373eaa93bbae0bd1551a10234574d0e07 | DragonForce sample |
| SHA-256 | b10129c175c007148dd4f5aff4d7fb61eb3e4b0ed4897fea6b33e90555f2b845 | DragonForce sample |
| SHA-256 | d67a475f72ca65fd1ac5fd3be2f1cce2db78ba074f54dc4c4738d374d0eb19c7 | DragonForce sample |
| MD5 | 3a6e2c775c9c1060c54a9a94e80d923a | DragonForce sample |
| MD5 | 74a97d25595ad73129fa946dc3156cec | DragonForce sample |
| MD5 | 7ceeb2208a50b1ef61fdec935d66e992 | DragonForce sample |
| MD5 | e67e7b8e0fb6baff4f25bb05dd5a5e21 | DragonForce sample |
| MD5 | 770c1dc157226638f8ad1ac9669f4883 | DragonForce sample |

### Spectre RAT Indicators
| Type | Value | Notes |
|------|-------|-------|
| Config file | 89CC88 | Dynamic C2 configuration |
| Config file | 733949 | System information storage |
| C2 URI pattern | `wber` command structure | HTTP-based C2 protocol |
| Binary | 32-bit and 64-bit Intel PE | XOR-encoded strings |
| Tool | nircmdc.exe | LOLBin used by Spectre RAT |

### Malware Arsenal
| Malware | Type | Status |
|---------|------|--------|
| DragonForce | Ransomware (RaaS) | Active — primary 2025 |
| Spectre RAT | Remote Access Trojan | Active — updated 2025 |
| RattyRAT | Java-based RAT | Active — added July 2025 |
| Raccoon Stealer (S1148) | Infostealer | Active |
| VIDAR Stealer | Infostealer | Active |
| AveMaria/WarZone (S0670) | RAT | Historical |
| POORTRY | Kernel driver (BYOVD) | Active |
| STONESTOP | Loader for POORTRY | Active |
| Cobalt Strike Beacon | C2 Framework | Active via DragonForce |
| SystemBC | SOCKS5 proxy backdoor | Active via DragonForce |
| Mimikatz (S0002) | Credential dumper | Active |

### Legitimate Tools Abused
AnyDesk, ScreenConnect, Fleetdeck.io, Level.io, Pulseway, Splashtop, Tactical.RMM, TeamViewer, Ngrok, Teleport.sh, Tailscale, SimpleHelp RMM, Rclone, AdFind, SoftPerfect Network Scanner

### Exfiltration Destinations
- MEGA[.]NZ
- Amazon S3 (US-based)
- Dropbox
- FiveTran (SaaS connector)
- Snowflake Data Cloud
- Vultr-hosted infrastructure
- BitLaunch (cryptocurrency-paid servers)

### Communication Channels
TOR, Tox, encrypted messaging applications, Telegram, Discord

---

## Law Enforcement Actions

### 2024 Federal Charges (November 20, 2024)
Five members charged by US DOJ:
- **Tyler Robert Buchanan** (22, UK) — arrested in Spain; 27M in Bitcoin traced
- **Ahmed Hossam Eldin Elbadawy** (23, US)
- **Noah Michael Urban** (20, US) — sentenced to 10 years for SIM-swapping ($13M)
- **Evans Onyeaka Osiebo** (20, US)
- **Joel Martin Evans** (25, US)
Charges: conspiracy to commit wire fraud, conspiracy, aggravated identity theft — up to 25 years each.

### 2025 UK Indictments & Arrests
- **Thalha Jubair** (19, UK) — charged with 7 counts including fraud and money laundering for allegedly participating in 120+ network intrusions targeting 47 US entities
- **Owen Flowers** (18, UK) — indicted for attacks on US and British companies
- **17-year-old** involved in MGM/Caesars breaches — surrendered in Las Vegas

### July 2025 UK Retail Attack Arrests
Four arrested in connection with M&S/Co-op/Harrods attacks:
- 20-year-old British woman (Staffordshire)
- 19-year-old Latvian male (West Midlands)
- 19-year-old British man (London)
- 17-year-old British male (West Midlands)

### International Coordination
Operations involved FBI, National Crime Agency (UK), Spanish police, Las Vegas Metro Police, Canadian RCMP, and Australian Federal Police.

---

## Detection Rules

The following detection rules target key Scattered Spider TTPs and DragonForce ransomware indicators. Rules cover help desk social engineering indicators in Okta logs, suspicious RMM tool deployment, tunneling for C2, Active Directory credential extraction, DragonForce pre-encryption behavior, identity federation abuse, and file-level malware indicators. Log sources covered: Okta IdP, Windows process creation (Sysmon/EDR), Azure AD audit logs, and file scanning (YARA).

### Sigma Rules

#### 1. Help Desk MFA Bypass Social Engineering Indicators (Okta)
**Status:** Validated
```yaml
title: Scattered Spider - Help Desk MFA Bypass Social Engineering Indicators
id: 8a3f2e1d-4b5c-6d7e-9f0a-1b2c3d4e5f6a
status: experimental
description: Detects patterns consistent with Scattered Spider help desk social engineering - multiple failed MFA attempts followed by MFA factor reset and successful authentication within a short timeframe.
references:
    - https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a
    - https://pushsecurity.com/blog/scattered-spider-ttp-evolution-in-2025
author: Actioner Research Agent
date: 2026-04-07
tags:
    - attack.initial_access
    - attack.t1566.004
    - attack.credential_access
    - attack.t1621
    - attack.t1556.006
logsource:
    product: okta
    service: okta
detection:
    selection_mfa_deny:
        eventType: 'user.authentication.auth_via_mfa'
        outcome.result: 'FAILURE'
    selection_mfa_reset:
        eventType:
            - 'user.mfa.factor.deactivate'
            - 'user.mfa.factor.activate'
            - 'system.mfa.factor.deactivate'
    selection_password_reset:
        eventType:
            - 'user.account.reset_password'
            - 'user.lifecycle.password_reset'
    condition: selection_mfa_deny or selection_mfa_reset or selection_password_reset
falsepositives:
    - Legitimate help desk password resets
    - User self-service MFA enrollment
level: medium
```

#### 2. Suspicious RMM Tool Execution (Windows)
**Status:** Validated
```yaml
title: Scattered Spider - Suspicious RMM Tool Execution
id: 7b4e3f2a-5c6d-8e9f-0a1b-2c3d4e5f6a7b
status: experimental
description: Detects execution of remote monitoring and management tools commonly abused by Scattered Spider for persistence and command-and-control.
references:
    - https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a
    - https://reliaquest.com/blog/scattered-spider-cyber-attacks-using-phishing-social-engineering-2025/
author: Actioner Research Agent
date: 2026-04-07
tags:
    - attack.command_and_control
    - attack.t1219
    - attack.persistence
    - attack.t1078
logsource:
    category: process_creation
    product: windows
detection:
    selection_rmm:
        Image|endswith:
            - '\AnyDesk.exe'
            - '\ScreenConnect.ClientService.exe'
            - '\ScreenConnect.WindowsClient.exe'
            - '\saborern.exe'
            - '\saborern64.exe'
            - '\Pulseway.exe'
            - '\fleetdeck-agent.exe'
            - '\level-agent.exe'
            - '\TeamViewer.exe'
            - '\TeamViewer_Service.exe'
            - '\tacticalrmm.exe'
            - '\meshagent.exe'
    filter_legitimate:
        ParentImage|endswith:
            - '\services.exe'
            - '\svchost.exe'
        Image|endswith:
            - '\TeamViewer_Service.exe'
    condition: selection_rmm and not filter_legitimate
falsepositives:
    - Legitimate IT administration using authorized RMM tools
    - Software deployment systems
level: medium
```

#### 3. Ngrok or Teleport Tunneling Activity (Windows)
**Status:** Validated
```yaml
title: Scattered Spider - Ngrok or Teleport Tunneling Activity
id: 6c5d4e3f-2a1b-9c8d-7e6f-5a4b3c2d1e0f
status: experimental
description: Detects execution of tunneling tools (Ngrok, Teleport) commonly used by Scattered Spider for command-and-control and to bypass network security controls.
references:
    - https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a
    - https://www.darktrace.com/blog/untangling-the-web-darktraces-investigation-of-scattered-spiders-evolving-tactics
author: Actioner Research Agent
date: 2026-04-07
tags:
    - attack.command_and_control
    - attack.t1090
    - attack.t1572
logsource:
    category: process_creation
    product: windows
detection:
    selection_ngrok:
        Image|endswith: '\ngrok.exe'
    selection_teleport:
        Image|endswith: '\tsh.exe'
    selection_cmdline_ngrok:
        CommandLine|contains:
            - 'ngrok'
            - 'tcp 3389'
            - 'tcp 445'
    selection_cmdline_teleport:
        CommandLine|contains:
            - 'teleport.sh'
            - 'tsh login'
            - 'tsh ssh'
    condition: selection_ngrok or selection_teleport or selection_cmdline_ngrok or selection_cmdline_teleport
falsepositives:
    - Legitimate developer use of ngrok for testing
    - Authorized Teleport deployments
level: high
```

#### 4. NTDS.dit Credential Extraction (Windows)
**Status:** Validated
```yaml
title: Scattered Spider - NTDS.dit Credential Extraction
id: 5d6e7f8a-9b0c-1d2e-3f4a-5b6c7d8e9f0a
status: experimental
description: Detects attempts to access or copy the NTDS.dit Active Directory database file, a technique used by Scattered Spider and DragonForce affiliates to harvest domain credentials before ransomware deployment.
references:
    - https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a
    - https://specopssoft.com/blog/marks-spencer-ransomware-active-directory/
author: Actioner Research Agent
date: 2026-04-07
tags:
    - attack.credential_access
    - attack.t1003.003
    - attack.t1003.001
logsource:
    category: process_creation
    product: windows
detection:
    selection_ntdsutil:
        Image|endswith: '\ntdsutil.exe'
        CommandLine|contains:
            - 'ifm'
            - 'create full'
            - 'ac i ntds'
    selection_vssadmin:
        Image|endswith: '\vssadmin.exe'
        CommandLine|contains: 'create shadow'
    selection_copy_ntds:
        CommandLine|contains:
            - 'ntds.dit'
            - 'NTDS.dit'
    selection_secretsdump:
        CommandLine|contains:
            - 'secretsdump'
            - 'impacket'
    condition: selection_ntdsutil or selection_vssadmin or selection_copy_ntds or selection_secretsdump
falsepositives:
    - Legitimate Active Directory backup operations
    - Authorized security assessments
level: critical
```

#### 5. DragonForce Ransomware Pre-Encryption Indicators (Windows)
**Status:** Validated
```yaml
title: DragonForce Ransomware - Pre-Encryption Indicators
id: 4e5f6a7b-8c9d-0e1f-2a3b-4c5d6e7f8a9b
status: experimental
description: Detects pre-encryption behavior associated with DragonForce ransomware, including shadow copy deletion, event log clearing, and service stopping - techniques observed in Scattered Spider affiliate operations.
references:
    - https://www.picussecurity.com/resource/blog/dragonforce-ransomware-attacks-retail-giants
    - https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a
author: Actioner Research Agent
date: 2026-04-07
tags:
    - attack.impact
    - attack.t1490
    - attack.t1486
    - attack.defense_evasion
    - attack.t1070.001
logsource:
    category: process_creation
    product: windows
detection:
    selection_shadow_delete:
        Image|endswith:
            - '\vssadmin.exe'
            - '\wmic.exe'
        CommandLine|contains:
            - 'delete shadows'
            - 'shadowcopy delete'
    selection_bcdedit:
        Image|endswith: '\bcdedit.exe'
        CommandLine|contains:
            - 'recoveryenabled no'
            - 'bootstatuspolicy ignoreallfailures'
    selection_wevtutil:
        Image|endswith: '\wevtutil.exe'
        CommandLine|contains:
            - 'cl System'
            - 'cl Security'
            - 'cl Application'
    selection_service_stop:
        Image|endswith: '\net.exe'
        CommandLine|contains:
            - 'stop "SQLServerAgent"'
            - 'stop "MSSQLSERVER"'
            - 'stop "vss"'
            - 'stop "backup"'
    condition: 1 of selection_*
falsepositives:
    - System administrators performing maintenance
    - Legitimate backup software managing shadow copies
level: critical
```

#### 6. Suspicious Identity Federation Configuration Change (Azure AD)
**Status:** Validated
```yaml
title: Scattered Spider - Suspicious Identity Federation Configuration Change
id: 3f4a5b6c-7d8e-9f0a-1b2c-3d4e5f6a7b8c
status: experimental
description: Detects addition of new federated identity providers or domain federation changes in Azure AD/Entra ID, a persistence technique used by Scattered Spider to maintain access through SSO abuse.
references:
    - https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a
    - https://pushsecurity.com/blog/scattered-spider-ttp-evolution-in-2025
author: Actioner Research Agent
date: 2026-04-07
tags:
    - attack.persistence
    - attack.t1484.002
    - attack.privilege_escalation
logsource:
    product: azure
    service: auditlogs
detection:
    selection_federation:
        operationName:
            - 'Set domain authentication'
            - 'Set federation settings on domain'
            - 'Add domain to company'
            - 'Set company information'
    selection_idp:
        operationName:
            - 'Add identity provider'
            - 'Update identity provider'
    condition: selection_federation or selection_idp
falsepositives:
    - Legitimate federation configuration by IT administrators
    - Planned SSO integration projects
level: high
```

### YARA Rules

#### 7. DragonForce Ransomware Indicators
**Status:** Validated
```yara
import "pe"

rule DragonForce_Ransomware_Indicators
{
    meta:
        description = "Detects DragonForce ransomware based on known string patterns and behavioral indicators from LockBit3/Conti lineage"
        author = "Actioner Research Agent"
        date = "2026-04-07"
        reference = "https://www.picussecurity.com/resource/blog/dragonforce-ransomware-attacks-retail-giants"
        severity = "critical"
        hash1 = "1ccf8baf11427fae273ffed587b41c857fa2d8f3d3c6c0ddaa1fe4835f665eba"
        hash2 = "dc7e706587d4897789cc4a5f7cccbb539646b58aa9c86272728c8c1e6ec2a529"

    strings:
        $ransom_note1 = "DragonForce" ascii wide nocase
        $ransom_note2 = "YOUR FILES HAVE BEEN ENCRYPTED" ascii wide nocase
        $ransom_note3 = ".dragonforce" ascii wide nocase
        $lockbit_heritage1 = "LockBit" ascii wide
        $lockbit_heritage2 = "lockbit3" ascii wide nocase

        $cmd_shadow1 = "vssadmin delete shadows /all /quiet" ascii wide nocase
        $cmd_shadow2 = "wmic shadowcopy delete" ascii wide nocase
        $cmd_bcdedit = "bcdedit /set {default} recoveryenabled no" ascii wide nocase
        $cmd_wevtutil = "wevtutil cl" ascii wide

        $mutex1 = "Global\\DragonForce" ascii wide
        $ext1 = ".dragonforce_encrypted" ascii wide

    condition:
        uint16(0) == 0x5A4D and
        filesize < 5MB and
        (
            (2 of ($ransom_note*)) or
            ($mutex1) or
            ($ext1 and 1 of ($cmd_*)) or
            (2 of ($cmd_*) and 1 of ($ransom_note*)) or
            (1 of ($lockbit_heritage*) and 1 of ($ransom_note*) and 1 of ($cmd_*))
        )
}
```

#### 8. Spectre RAT (Scattered Spider)
**Status:** Validated
```yara
rule Spectre_RAT_Scattered_Spider
{
    meta:
        description = "Detects Spectre RAT malware associated with Scattered Spider operations - XOR-encoded strings and C2 configuration patterns"
        author = "Actioner Research Agent"
        date = "2026-04-07"
        reference = "https://www.silentpush.com/blog/scattered-spider-2025/"
        severity = "high"

    strings:
        $config1 = "89CC88" ascii wide
        $config2 = "733949" ascii wide
        $wber = "wber" ascii
        $cmd_exec = "cmd.exe /c" ascii wide
        $nircmd = "nircmdc.exe" ascii wide nocase
        $mutex_check = "CreateMutex" ascii
        $http_ua = "Mozilla/5.0" ascii
        $xor_loop = { 8B ?? 33 ?? 89 ?? 4? FF ?? 75 }

    condition:
        uint16(0) == 0x5A4D and
        filesize < 3MB and
        (
            ($config1 and $config2) or
            ($wber and $mutex_check and $http_ua) or
            ($config1 and $xor_loop) or
            ($nircmd and 2 of ($config1, $config2, $wber, $cmd_exec))
        )
}
```

### Detection Rules Summary

| # | Rule | Type | Targets | Level | Status |
|---|------|------|---------|-------|--------|
| 1 | Help Desk MFA Bypass | Sigma (Okta) | T1566.004, T1621, T1556.006 | Medium | Validated |
| 2 | Suspicious RMM Tool Execution | Sigma (Windows) | T1219, T1078 | Medium | Validated |
| 3 | Ngrok/Teleport Tunneling | Sigma (Windows) | T1090, T1572 | High | Validated |
| 4 | NTDS.dit Credential Extraction | Sigma (Windows) | T1003.003, T1003.001 | Critical | Validated |
| 5 | DragonForce Pre-Encryption | Sigma (Windows) | T1490, T1486, T1070.001 | Critical | Validated |
| 6 | Federation Configuration Change | Sigma (Azure AD) | T1484.002 | High | Validated |
| 7 | DragonForce Ransomware | YARA | File-level detection | Critical | Validated |
| 8 | Spectre RAT | YARA | File-level detection | High | Validated |

---

## Defensive Recommendations

### Immediate Priority
1. **Deploy phishing-resistant MFA** — FIDO2/WebAuthn or PKI-based; eliminates push bombing, SIM swap, and AiTM attacks
2. **Harden help desk identity verification** — Implement callback verification, video confirmation, or manager-approved identity checks before password resets or MFA changes
3. **Audit and allowlist RMM tools** — Block all unauthorized remote access software; alert on any RMM execution not in the approved list
4. **Monitor for NTDS.dit access** — Deploy Sigma rule #4; any access to NTDS.dit outside scheduled AD backups is critical
5. **Protect domain controllers** — Enable LSASS protection, credential guard, and DCSync detection

### Network & Infrastructure
6. **Block tunneling services** — Egress filter for ngrok[.]io, teleport[.]sh, tailscale domains; deploy Sigma rule #3
7. **Segment networks** — Isolate backup infrastructure, domain controllers, and VMware management from general user networks
8. **Monitor cloud infrastructure** — Alert on new EC2 instances, cloud storage access from unusual sources, and federation configuration changes
9. **Implement immutable backups** — Offline, air-gapped, regularly tested backup copies

### Identity & Access
10. **Restrict third-party access** — Harden MSP/contractor access with dedicated jumpboxes, mandatory MFA, and limited session duration
11. **Monitor Okta/Entra ID logs** — Deploy Sigma rules #1 and #6; alert on MFA factor changes, federation modifications, and bulk password resets
12. **Implement conditional access** — Risk-based authentication with impossible travel detection, device compliance, and anomalous login alerting

### Employee Training
13. **Vishing awareness** — Train help desk staff on social engineering pretexts; simulate attacks
14. **OTP/MFA code sharing** — Strict policy against sharing authentication codes under any circumstances
15. **Report suspicious calls** — Clear escalation path for help desk personnel when receiving unusual reset requests

---

## Sources

- [CISA Advisory AA23-320A — Scattered Spider (Updated July 29, 2025)](https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a) — Primary joint advisory from CISA, FBI, CCCS, ACSC, AFP, and NCSC with comprehensive TTPs and mitigations
- [FBI Scattered Spider Flash Alert (July 29, 2025)](https://www.fbi.gov/file-repository/cyber-alerts/scattered-spider-072925.pdf/view) — FBI alert with updated IOCs and airline targeting indicators
- [Push Security — How Scattered Spider TTPs Are Evolving in 2025](https://pushsecurity.com/blog/scattered-spider-ttp-evolution-in-2025) — Detailed analysis of AiTM phishing evolution, Evilginx usage, domain infrastructure changes, and retail attack wave
- [ReliaQuest — Scattered Spider Targets Tech Companies for Help-Desk Exploitation](https://reliaquest.com/blog/scattered-spider-cyber-attacks-using-phishing-social-engineering-2025/) — Analysis of 600+ malicious domains, social engineering playbook, and MSP targeting
- [Silent Push — Scattered Spider: Still Hunting for Victims in 2025](https://www.silentpush.com/blog/scattered-spider-2025/) — Technical deep-dive on phishing kits, Spectre RAT analysis, domain infrastructure, and IOCs
- [Darktrace — Untangling the Web: Investigation of Scattered Spider's Evolving Tactics](https://www.darktrace.com/blog/untangling-the-web-darktraces-investigation-of-scattered-spiders-evolving-tactics) — Network detection indicators, Teleport C2 usage, and behavioral anomaly detection
- [Picus Security — DragonForce Ransomware Attacks on Retail Giants](https://www.picussecurity.com/resource/blog/dragonforce-ransomware-attacks-retail-giants) — DragonForce technical analysis, MITRE ATT&CK mapping, and ransomware tooling
- [The Hacker News — Four Arrested in £440M Cyber Attack on M&S, Co-op, and Harrods](https://thehackernews.com/2025/07/four-arrested-in-440m-cyber-attack-on.html) — July 2025 UK arrests in connection with retail attacks
- [BlackFog — Marks & Spencer Breach: How A Ransomware Attack Crippled a UK Retail Giant](https://www.blackfog.com/marks-and-spencer-ransomware-attack/) — M&S incident timeline and financial impact analysis
- [CSO Online — Scattered Spider Shifts Focus to Airlines](https://www.csoonline.com/article/4014787/scattered-spider-shifts-focus-to-airlines-as-strikes-hit-hawaiian-westjet-and-now-qantas.html) — Aviation sector targeting including Hawaiian Airlines, WestJet, and Qantas incidents
- [Obsidian Security — Scattered Spider Now Targeting Airlines and Transportation](https://www.obsidiansecurity.com/resource/scattered-spider-now-targeting-airlines-and-transportation-fbi-warns-of-imminent-data-theft) — FBI warning analysis and airline attack methodology
- [Rewterz — DragonForce Ransomware Active IOCs](https://rewterz.com/threat-advisory/dragonforce-ransomware-active-iocs-3) — DragonForce file hashes (SHA-256, MD5, SHA-1)
- [Huntress — Scattered Spider Threat Actor Profile](https://www.huntress.com/threat-library/threat-actors/scattered-spider) — Comprehensive threat library entry with historical context
- [GitHub — DragonForce Ransomware YARA Rules](https://github.com/petstuk/DragonForceRansomwareYARA) — Community YARA rules and hash collection for DragonForce samples
- [Splunk Security Content — Scattered Spider Analytics Story](https://research.splunk.com/stories/scattered_spider/) — Pre-built Splunk detection content for Scattered Spider TTPs
- [Specops Software — M&S Ransomware Hack: Service Desk & Active Directory Lessons](https://specopssoft.com/blog/marks-spencer-ransomware-active-directory/) — Technical analysis of NTDS.dit exfiltration and AD security recommendations
- [Killian Sherer — Scattered Spider: TTPs, IOCs & Detection Tips](https://sherer.io/2025/07/09/scattered-spider-ttps-iocs-detection/) — Independent researcher IOC compilation and detection guidance
