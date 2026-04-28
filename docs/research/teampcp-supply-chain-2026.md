---
title: "TeamPCP Supply Chain Campaign"
date: 2026-04-04
description: "How TeamPCP compromised Trivy, KICS, LiteLLM, and 47+ npm packages in a cascading supply chain attack."
---

::: warning
**Disclaimer:** This is OSINT summarized by AI. Trust, but verify.
:::

# TeamPCP Supply Chain Campaign (March 2026)

**Date:** 2026-04-07
**TLP:** CLEAR
**Severity:** CRITICAL
**Last Updated:** 2026-04-07

---

## Executive Summary

TeamPCP (aliases: PCPcat, Persy\_PCP, ShellForce, CipherForce, DeadCatx3) executed one of the most significant open-source supply chain attack campaigns in history during March 2026. Beginning with the compromise of Aqua Security's Trivy vulnerability scanner on March 19, the group cascaded access through Checkmarx KICS, BerriAI LiteLLM, the Telnyx Python SDK, and 47+ npm packages — weaponizing the very security tools organizations rely on. The campaign harvested cloud credentials, CI/CD secrets, and Kubernetes tokens from an estimated 500,000+ machines. CERT-EU attributed the breach of the European Commission's AWS infrastructure (92 GB exfiltrated) to TeamPCP with high confidence. The group partnered with Vect ransomware-as-a-service for monetization and deployed a self-replicating worm (CanisterWorm) with destructive wiper capabilities. CVE-2026-33634 (CVSS 9.4 Critical) was assigned and added to CISA's Known Exploited Vulnerabilities catalog with a remediation deadline of April 8, 2026.

---

## Threat Actor Profile

- **Name:** TeamPCP
- **Aliases:** PCPcat, Persy\_PCP, ShellForce, CipherForce, DeadCatx3
- **Telegram:** @Persy\_PCP, @teampcp
- **Motivation:** Financial (credential theft, ransomware, cryptomining, extortion)
- **Sophistication:** Advanced — multi-stage payloads, WAV steganography, ICP-hosted C2, cascading supply chain compromise
- **Partnerships:** Vect ransomware group (RaaS), announced via BreachForums; CipherForce (breach data publication)
- **OPSEC:** Low — uses identifiable open-source tools (TruffleHog, Nord Stream), obvious resource names ("pawn", "massive-exfil"), prioritizes speed over stealth

---

## Campaign Timeline

| Date | Event |
|------|-------|
| Late Feb 2026 | PwnRequest vulnerability exploited; aqua-bot PAT exfiltrated from Trivy repo |
| 2026-03-19 17:43 UTC | Malicious Trivy v0.69.4 released; 76 of 77 trivy-action tags force-pushed to credential-stealing malware |
| 2026-03-21 | Checkmarx KICS compromised — all 35 tags + v2.3.28 via stolen GitHub PATs |
| 2026-03-22 13:15 UTC | CanisterWorm begins propagating through npm ecosystem |
| 2026-03-22 21:40 UTC | Malicious Docker Hub images published (Trivy v0.69.5, v0.69.6) |
| 2026-03-23 | LiteLLM CEO Krish Dholakia's GitHub account compromised; destructive wiper component deployed targeting Iran |
| 2026-03-23 | Checkmarx GitHub Actions (ast-github-action, kics-github-action) compromised via stolen CI/CD secrets |
| 2026-03-24 ~14:00 UTC | Malicious LiteLLM v1.82.7 & v1.82.8 published to PyPI; checkmarx.ast-results v2.53 and checkmarx.cx-dev-assist v1.7.0 published to Open VSX |
| 2026-03-24 | European Commission breach discovered (access began March 19); 72-minute detection-to-quarantine for LiteLLM on PyPI |
| 2026-03-26 | CISA adds CVE-2026-33634 to KEV catalog |
| 2026-03-27 03:51 UTC | Malicious Telnyx SDK v4.87.1 & v4.87.2 published to PyPI |
| 2026-03-28 | EU stolen data appears on ShinyHunters' dark web site |
| Late March | Vect ransomware partnership announced on BreachForums; ~300,000 affiliates receive individual keys |

---

## Attack Chain

### Phase 1 — Initial Access (Trivy)
TeamPCP exploited incomplete credential rotation from a minor February breach to retain the `aqua-bot` service account PAT. They force-pushed 76 of 77 version tags in `aquasecurity/trivy-action` and all 7 tags in `aquasecurity/setup-trivy` to credential-stealing commits. A malicious Trivy binary (v0.69.4) was published via spoofed commits impersonating users `rauchg` and `DmitriyLewen`.

### Phase 2 — Cascading Compromise (KICS, LiteLLM)
Credentials harvested from Trivy CI/CD runners were used to compromise Checkmarx KICS GitHub Actions and the personal GitHub account of LiteLLM CEO Krish Dholakia. Malicious LiteLLM packages (v1.82.7, v1.82.8) were pushed to PyPI containing a three-stage payload: orchestrator (.pth file), credential collector, and persistence backdoor.

### Phase 3 — Ecosystem Expansion (Telnyx, npm)
PyPI credentials stolen from prior compromises enabled the Telnyx Python SDK compromise. A new TTP was introduced: WAV audio file steganography for payload delivery, with platform-specific payloads (Windows: `msbuild.exe` dropper; Linux/macOS: credential harvester). 47+ additional npm packages were poisoned via harvested publishing tokens.

### Phase 4 — Post-Compromise & Monetization
Stolen credentials were validated at scale using TruffleHog. AWS environments were systematically enumerated and exfiltrated (S3, Secrets Manager, RDS, ECS). The CanisterWorm worm component enabled self-replication through Docker API scanning, SSH key harvesting, and Kubernetes DaemonSet deployment. Partnership with Vect RaaS provided ransomware and extortion capability. 16+ victim organizations were publicly leaked; AstraZeneca was named as a victim (unconfirmed).

---

## Malware Analysis

### TeamPCP Cloud Stealer — Three Versions

**Version 1 — Monolithic Bash (150 lines)**
- Environment fingerprinting
- AWS/GCP/Azure IMDS credential harvesting
- Memory scraping via `/proc/<pid>/mem` to bypass GitHub secret masking (searches for `{"value":"<secret>","isSecret":true}`)
- Filesystem sweep of 50+ credential paths (~/.ssh/id\_rsa, ~/.aws/credentials, ~/.kube/config, .env files)
- AES-256-CBC encryption with RSA-4096 key wrapping
- Exfiltration to C2 as `tpcp.tar.gz`
- Fallback: create `tpcp-docs` repository in victim's GitHub account

**Version 2 — Modular Loader (15-line pull-based)**
- Downloads `kube.py` payload from C2
- Self-deletion (`rm "$0"`)
- Remote payload updates without re-poisoning packages

**Version 3 — CanisterWorm (Worm & Wiper)**
- Self-replication via Docker API scanning (port 2375)
- SSH key harvesting for lateral movement
- Kubernetes cluster targeting via DaemonSet deployment
- Destructive wiper payload (deployed March 23, targeting Iran)
- C2 via Internet Computer Protocol (ICP) canister — decentralized, tamper-proof
- Masquerades as systemd services (`sysmon.service`) and PostgreSQL utilities (`pgmon`, `pglog`)

### LiteLLM Payload — Three-Stage Architecture

| Stage | File | Behavior |
|-------|------|----------|
| Orchestrator | `litellm_init.pth` (34 KB) | CPython .pth auto-execution; 50-minute C2 polling; YouTube link anti-sandbox check |
| Collector | `proxy_server.py` | Targets 50+ credential file paths; IMDS theft; K8s service account token extraction |
| Persistence | `sysmon.py` at `~/.config/systemd/user/sysmon.py` | Systemd user service; polls ICP-hosted C2; downloads payloads to `/tmp/pglog` |

### Telnyx Payload — WAV Steganography

Payloads embedded in `.wav` files that blend with Telnyx's voice/telecom API purpose:
- **Windows:** `hangup.wav` → XOR-decrypted `msbuild.exe` dropped to Startup folder
- **Linux/macOS:** `ringtone.wav` → AES-256-CBC + RSA-4096 credential sweeper matching LiteLLM pattern
- Same RSA-4096 public key and `tpcp.tar.gz` exfiltration pattern across all variants (strongest attribution link)

### Obfuscation Techniques
- LiteLLM v1.82.7: Base64 + zlib, RC4-encrypted strings
- LiteLLM v1.82.8: Evolved RC4 obfuscation
- Telnyx: WAV steganography with platform-specific XOR/AES decryption
- Double Base64 encoding in earlier payloads

---

## Indicators of Compromise

> All IOCs are defanged per standard practice.

### Command & Control Domains

| Domain | Context |
|--------|---------|
| `scan[.]aquasecurtiy[.]org` | Primary C2 for Trivy payload (typosquat of aquasecurity) |
| `checkmarx[.]zone` | C2 for KICS & VSX payloads |
| `checkmarx[.]zone/vsx` | Exfiltration endpoint for VS Code extensions |
| `models[.]litellm[.]cloud` | C2 for LiteLLM payload |
| `nsa[.]cat` | Attacker VPS |
| `tdtqy-oyaaa-aaaae-af2dq-cai[.]raw[.]icp0[.]io` | ICP-hosted fallback C2 |

### Cloudflare Tunnel C2 (Ephemeral)

| URL |
|-----|
| `championships-peoples-point-cassette[.]trycloudflare[.]com` |
| `create-sensitivity-grad-sequence[.]trycloudflare[.]com` |
| `investigation-launches-hearings-copying[.]trycloudflare[.]com` |
| `plug-tab-protective-relay[.]trycloudflare[.]com` |
| `souls-entire-defined-routes[.]trycloudflare[.]com` |

### IP Addresses

| IP | Context |
|----|---------|
| `23[.]142[.]184[.]129` | C2 infrastructure |
| `45[.]148[.]10[.]212` | Resolves from scan[.]aquasecurtiy[.]org (TECHOFF SRV LIMITED, Amsterdam) |
| `63[.]251[.]162[.]11` | C2 infrastructure |
| `83[.]142[.]209[.]11` | C2 infrastructure |
| `83[.]142[.]209[.]203` | C2 for Telnyx compromise |
| `195[.]5[.]171[.]242` | C2 infrastructure |
| `209[.]34[.]235[.]18` | C2 infrastructure |
| `212[.]71[.]124[.]188` | C2 infrastructure |
| `103[.]75[.]11[.]59` | Referenced in Kudelski research |

### Post-Compromise Operational IPs (Wiz)

| IP | ASN | Activity |
|----|-----|----------|
| `105[.]245[.]181[.]120` | Vodacom | TruffleHog secret validation |
| `138[.]199[.]15[.]172` | Mullvad VPN | GitHub exfiltration, AWS ops |
| `154[.]47[.]29[.]12` | Mullvad VPN | Secret validation, AWS recon |
| `163[.]245[.]223[.]12` | Interserver | GitHub exfiltration |
| `170[.]62[.]100[.]245` | Mullvad VPN | AWS reconnaissance |
| `185[.]77[.]218[.]4` | Oy Crea Nova | TruffleHog secret validation |
| `193[.]32[.]126[.]157` | Mullvad VPN | GitHub exfiltration |
| `209[.]159[.]147[.]239` | Interserver | TruffleHog validation |
| `23[.]234[.]107[.]104` | Tzulo | TruffleHog validation |
| `34[.]205[.]27[.]48` | Amazon | TruffleHog validation |

### Malicious File Hashes (SHA256)

**Malicious Trivy Binaries (v0.69.4):**

| Hash | Platform |
|------|----------|
| `887e1f5b5b50162a60bd03b66269e0ae545d0aef0583c1c5b00972152ad7e073` | FreeBSD-64bit |
| `f7084b0229dce605ccc5506b14acd4d954a496da4b6134a294844ca8d601970d` | Linux-32bit |
| `822dd269ec10459572dfaaefe163dae693c344249a0161953f0d5cdd110bd2a0` | Linux-64bit |
| `bef7e2c5a92c4fa4af17791efc1e46311c0f304796f1172fce192f5efc40f5d7` | Linux-ARM |
| `e64e152afe2c722d750f10259626f357cdea40420c5eedae37969fbf13abbecf` | Linux-ARM64 |
| `ecce7ae5ffc9f57bb70efd3ea136a2923f701334a8cd47d4fbf01a97fd22859c` | Linux-PPC64LE |
| `d5edd791021b966fb6af0ace09319ace7b97d6642363ef27b3d5056ca654a94c` | Linux-s390x |
| `e6310d8a003d7ac101a6b1cd39ff6c6a88ee454b767c1bdce143e04bc1113243` | macOS-64bit |
| `6328a34b26a63423b555a61f89a6a0525a534e9c88584c815d937910f1ddd538` | macOS-ARM64 |
| `0880819ef821cff918960a39c1c1aada55a5593c61c608ea9215da858a86e349` | Windows-64bit |

**Additional Payload Hashes:**

| Hash |
|------|
| `0c0d206d5e68c0cf64d57ffa8bc5b1dad54f2dda52f24e96e02e237498cb9c3a` |
| `0c6a3555c4eb49f240d7e0e3edbfbb3c900f123033b4f6e99ac3724b9b76278f` |
| `18a24f83e807479438dcab7a1804c51a00dafc1d526698a66e0640d1e5dd671a` |
| `1e559c51f19972e96fcc5a92d710732159cdae72f407864607a513b20729decb` |
| `5e2ba7c4c53fa6e0cef58011acdd50682cf83fb7b989712d2fcf1b5173bad956` |
| `61ff00a81b19624adaad425b9129ba2f312f4ab76fb5ddc2c628a5037d31a4ba` |
| `7321caa303fe96ded0492c747d2f353c4f7d17185656fe292ab0a59e2bd0b8d9` |
| `7b5cc85e82249b0c452c66563edca498ce9d0c70badef04ab2c52acef4d629ca` |
| `7df6cef7ab9aae2ea08f2f872f6456b5d51d896ddda907a238cd6668ccdc4bb7` |
| `c37c0ae9641d2e5329fcdee847a756bf1140fdb7f0b7c78a40fdc39055e7d926` |
| `cd08115806662469bbedec4b03f8427b97c8a4b3bc1442dc18b72b4e19395fe3` |
| `e4edd126e139493d2721d50c3a8c49d3a23ad7766d0b90bc45979ba675f35fea` |
| `e87a55d3ba1c47e84207678b88cacb631a32d0cb3798610e7ef2d15307303c49` |
| `e9b1e069efc778c1e77fb3f5fcc3bd3580bbc810604cbf4347897ddb4b8c163b` |
| `f398f06eefcd3558c38820a397e3193856e4e6e7c67f81ecc8e533275284b152` |

### Self-Signed Certificate Hashes (SHA256)

| Hash |
|------|
| `30015DD1E2CF4DBD49FFF9DDEF2AD4622DA2E60E5C0B6228595325532E948F14` |
| `41C4F2F37C0B257D1E20FE167F2098DA9D2E0A939B09ED3F63BC4FE010F8365C` |
| `D8CAF4581C9F0000C7568D78FB7D2E595AB36134E2346297D78615942CBBD727` |

### Malicious Package Versions

| Package | Registry | Malicious Versions | Safe Version |
|---------|----------|--------------------|--------------|
| Trivy | GitHub Releases / Docker Hub | v0.69.4, v0.69.5, v0.69.6 | v0.69.3 |
| trivy-action | GitHub Actions | 75 of 76 tags compromised | Pin to verified SHA |
| setup-trivy | GitHub Actions | All 7 tags | Pin to verified SHA |
| LiteLLM | PyPI | v1.82.7, v1.82.8 | v1.82.6 |
| Telnyx | PyPI | v4.87.1, v4.87.2 | v4.87.0 |
| checkmarx.ast-results | Open VSX | v2.53 | Prior version |
| checkmarx.cx-dev-assist | Open VSX | v1.7.0 | Prior version |
| 47+ npm packages | npm | Various | Audit required |

### File Artifacts

| Filename | Purpose |
|----------|---------|
| `kamikaze.sh` | Initial bash payload |
| `kube.py` | Kubernetes lateral movement tool |
| `prop.py` | Credential harvester |
| `proxy_server.py` | Stage 2 collector |
| `tpcp.tar.gz` | Encrypted exfiltration archive |
| `litellm_init.pth` | Python .pth auto-execution backdoor |
| `hangup.wav` | Windows steganographic payload |
| `ringtone.wav` | Linux steganographic payload |
| `session.key` / `session.key.enc` | Encryption key material |
| `payload.enc` | Encrypted payload |
| `sysmon.service` / `sysmon.py` | Systemd persistence |
| `pglog` / `.pg_state` | Masqueraded PostgreSQL artifacts |
| `msbuild.exe` | Windows persistence dropper |
| `tpcp-docs` | Fallback GitHub exfil repository |

### Behavioral Indicators

| Indicator | Context |
|-----------|---------|
| User-Agent: `git/2.43.0` | Outdated git version used in post-compromise ops |
| User-Agent: `Boto3/1.42.73` (Kali Linux) | AWS operations from attacker infrastructure |
| Branch: `dev_remote_ea5Eu/test/v1` | Nord Stream tool default branch name |
| GitHub repo: `tpcp-docs` or `docs-tpcp` | Fallback exfiltration dead-drop |

---

## MITRE ATT&CK Mapping

| Tactic | ID | Technique | Campaign Context |
|--------|----|-----------|-----------------|
| Initial Access | T1195.001 | Supply Chain Compromise: Compromise Software Dependencies and Development Tools | Poisoned Trivy, KICS, LiteLLM, Telnyx packages |
| Execution | T1059.004 | Command and Scripting Interpreter: Unix Shell | kamikaze.sh bash payload |
| Execution | T1059.006 | Command and Scripting Interpreter: Python | kube.py, proxy\_server.py, sysmon.py |
| Execution | T1204.002 | User Execution: Malicious File | Package installation triggers payload |
| Persistence | T1546.018 | Event Triggered Execution: .pth File | litellm\_init.pth auto-executes on Python startup |
| Persistence | T1543.002 | Create or Modify System Process: Systemd Service | sysmon.service for persistent C2 polling |
| Persistence | T1547.001 | Boot or Logon Autostart: Registry Run Keys / Startup Folder | msbuild.exe dropped to Windows Startup |
| Defense Evasion | T1027 | Obfuscated Files or Information | Base64+zlib, RC4, WAV steganography |
| Defense Evasion | T1036 | Masquerading | Disguised as systemd, PostgreSQL utilities |
| Defense Evasion | T1562.001 | Impair Defenses: Disable or Modify Tools | GitHub secret masking bypass via /proc/pid/mem |
| Credential Access | T1552.001 | Unsecured Credentials: Credentials in Files | 50+ credential file paths targeted |
| Credential Access | T1552.005 | Unsecured Credentials: Cloud Instance Metadata API | IMDS token extraction (AWS/GCP/Azure) |
| Credential Access | T1528 | Steal Application Access Token | GitHub PATs, PyPI tokens, K8s service account tokens |
| Discovery | T1526 | Cloud Service Discovery | AWS ListUsers, DescribeInstances, ListClusters, ListSecrets |
| Discovery | T1613 | Container and Resource Discovery | K8s API enumeration, Docker API scanning |
| Lateral Movement | T1021.007 | Remote Services: Cloud Services | ECS Exec, K8s DaemonSet deployment |
| Lateral Movement | T1550.001 | Use Alternate Authentication Material: Application Access Token | Stolen GitHub PATs for cross-repo access |
| Collection | T1005 | Data from Local System | SSH keys, cloud creds, K8s secrets, .env files |
| Exfiltration | T1041 | Exfiltration Over C2 Channel | AES-256-CBC + RSA-4096 encrypted bundles to C2 |
| Exfiltration | T1537 | Transfer Data to Cloud Account | S3 bucket access, GitHub repo dead-drops |
| Impact | T1561 | Disk Wipe | CanisterWorm wiper component (March 23, Iran) |
| Impact | T1531 | Account Access Removal | Recursive file deletion on non-containerized hosts |

---

## Affected Organizations & Impact

- **European Commission:** 92 GB exfiltrated from AWS infrastructure (42 internal clients, 29 EU entities); data appeared on ShinyHunters' site
- **Mandiant estimate:** 1,000+ SaaS environments impacted, projected to reach 5,000–10,000
- **Unit 42 telemetry:** 300 GB+ data from 500,000+ machines; 16+ organizations publicly leaked
- **AstraZeneca:** Named as victim by LAPSUS$ (unconfirmed) — claimed 3 GB including code repos, AWS/Azure configs, Terraform, GitHub Enterprise
- **Vect RaaS partnership:** ~300,000 BreachForums affiliates received individual ransomware keys

---

## CVE Details

**CVE-2026-33634** — Remote Supply Chain Compromise in Trivy Ecosystem via Non-Atomic Secret Rotation
- **CVSS v4.0:** 9.4 (CRITICAL)
- **CVSS v3.1:** 8.8 (HIGH)
- **CWE:** CWE-506 (Embedded Malicious Code)
- **CISA KEV Deadline:** April 8, 2026

**CVE-2026-33017** — Langflow Unauthenticated RCE (related; versions prior to 1.8.2)
- **CISA KEV Deadline:** April 9, 2026

---

## Detection Rules

The following detection rules target TeamPCP's core TTPs: supply chain payload execution, credential harvesting from CI/CD runners and cloud metadata services, persistence via .pth files and systemd services, WAV steganography payload delivery, and C2 communication. Rules cover process execution logs, file system events, network traffic, and file-level indicators. Log sources include Sysmon (Linux/Windows), cloud audit logs, DNS logs, and network flow data. All Sigma rules validated with `sigma check` (exit 0). All YARA rules validated with `yarac` (exit 0). Snort/Suricata rules are syntactically correct but Snort was not available for runtime validation.

### Sigma Rules

#### 1. TeamPCP Cloud Stealer — Proc Memory Scraping for GitHub Secrets

<!-- Validated: sigma check exit 0 -->

```yaml
title: TeamPCP Proc Memory Scraping for CI/CD Secrets
id: 7a3b9c01-d4e5-4f6a-8b7c-9d0e1f2a3b4c
status: experimental
description: >
    Detects access to /proc/pid/mem files commonly used by TeamPCP Cloud Stealer
    to bypass GitHub Actions secret masking and extract CI/CD credentials.
references:
    - https://unit42.paloaltonetworks.com/teampcp-supply-chain-attacks/
    - https://www.wiz.io/blog/trivy-compromised-teampcp-supply-chain-attack
author: Actioner Research
date: 2026-04-07
tags:
    - attack.credential_access
    - attack.t1003
    - attack.t1552.001
logsource:
    product: linux
    category: file_access
detection:
    selection:
        TargetFilename|re: '/proc/\d+/mem'
    filter_known:
        Image|endswith:
            - '/gdb'
            - '/strace'
            - '/lldb'
            - '/valgrind'
    condition: selection and not filter_known
falsepositives:
    - Legitimate debugging tools
    - Memory profiling applications
level: high
```

#### 2. TeamPCP Persistence — Malicious .pth File Creation

<!-- Validated: sigma check exit 0 -->

```yaml
title: TeamPCP Malicious Python .pth File in Site-Packages
id: 8b4c0d12-e5f6-4a7b-9c8d-0e1f2a3b4c5d
status: experimental
description: >
    Detects creation of .pth files in Python site-packages directories, a technique
    used by TeamPCP's LiteLLM payload for auto-execution on every Python process start.
references:
    - https://isc.sans.edu/diary/32838
    - https://www.reversinglabs.com/blog/teampcp-supply-chain-attack-spreads
author: Actioner Research
date: 2026-04-07
tags:
    - attack.persistence
    - attack.t1546
logsource:
    product: linux
    category: file_event
detection:
    selection:
        TargetFilename|contains: 'site-packages/'
        TargetFilename|endswith: '.pth'
    filter_pip:
        Image|endswith:
            - '/pip'
            - '/pip3'
            - '/python'
            - '/python3'
        CommandLine|contains:
            - 'install'
            - 'setup.py'
    condition: selection and not filter_pip
falsepositives:
    - Legitimate Python package installations
    - Development environment setup
level: high
```

#### 3. TeamPCP Persistence — Systemd User Service Masquerading as Sysmon

<!-- Validated: sigma check exit 0 -->

```yaml
title: TeamPCP Systemd Persistence via Fake Sysmon Service
id: 9c5d1e23-f6a7-4b8c-0d9e-1f2a3b4c5d6e
status: experimental
description: >
    Detects creation of systemd user service files that masquerade as sysmon or
    PostgreSQL monitoring, consistent with TeamPCP Cloud Stealer persistence.
references:
    - https://unit42.paloaltonetworks.com/teampcp-supply-chain-attacks/
    - https://ramimac.me/teampcp/
author: Actioner Research
date: 2026-04-07
tags:
    - attack.persistence
    - attack.t1543.002
    - attack.t1036
logsource:
    product: linux
    category: file_event
detection:
    selection_sysmon:
        TargetFilename|contains: '.config/systemd/user/'
        TargetFilename|endswith:
            - 'sysmon.service'
            - 'sysmon.py'
    selection_pgmon:
        TargetFilename|contains: '.config/systemd/user/'
        TargetFilename|endswith:
            - 'pgmon.service'
            - 'pglog'
    condition: selection_sysmon or selection_pgmon
falsepositives:
    - Legitimate sysmon for Linux installations (rare in user systemd directory)
level: critical
```

#### 4. TeamPCP C2 — DNS Queries to Known Infrastructure

<!-- Validated: sigma check exit 0 -->

```yaml
title: TeamPCP C2 Domain DNS Resolution
id: 0d6e2f34-a7b8-4c9d-1e0f-2a3b4c5d6e7f
status: experimental
description: >
    Detects DNS queries to known TeamPCP command and control domains including
    typosquatted security vendor domains and ICP-hosted fallback infrastructure.
references:
    - https://unit42.paloaltonetworks.com/teampcp-supply-chain-attacks/
    - https://www.wiz.io/blog/trivy-compromised-teampcp-supply-chain-attack
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
            - 'aquasecurtiy.org'
            - 'checkmarx.zone'
            - 'litellm.cloud'
            - 'nsa.cat'
            - 'icp0.io'
    condition: selection
falsepositives:
    - Unlikely
level: critical
```

#### 5. TeamPCP Credential Harvesting — IMDS Access from Python Process

<!-- Validated: sigma check exit 0 -->

```yaml
title: TeamPCP Cloud Metadata Service Access from Python
id: 1e7f3a45-b8c9-4d0e-2f1a-3b4c5d6e7f8a
status: experimental
description: >
    Detects Python processes accessing cloud instance metadata services (IMDS),
    a key TTP in TeamPCP's credential harvesting from CI/CD and cloud environments.
references:
    - https://unit42.paloaltonetworks.com/teampcp-supply-chain-attacks/
    - https://www.wiz.io/blog/tracking-teampcp-investigating-post-compromise-attacks-seen-in-the-wild
author: Actioner Research
date: 2026-04-07
tags:
    - attack.credential_access
    - attack.t1552.005
logsource:
    category: proxy
detection:
    selection_process:
        c-useragent|contains: 'python'
    selection_imds:
        r-dns:
            - '169.254.169.254'
            - 'metadata.google.internal'
    condition: selection_process and selection_imds
falsepositives:
    - Legitimate cloud SDKs running in Python
    - Cloud-aware applications querying instance metadata
level: medium
```

#### 6. TeamPCP Exfiltration — GitHub Dead-Drop Repository Creation

<!-- Validated: sigma check exit 0 -->

```yaml
title: TeamPCP GitHub Dead-Drop Repository Creation
id: 2f8a4b56-c9d0-4e1f-3a2b-4c5d6e7f8a9b
status: experimental
description: >
    Detects creation of GitHub repositories named tpcp-docs or docs-tpcp,
    used by TeamPCP as fallback exfiltration dead-drops for stolen credentials.
references:
    - https://unit42.paloaltonetworks.com/teampcp-supply-chain-attacks/
    - https://www.wiz.io/blog/trivy-compromised-teampcp-supply-chain-attack
author: Actioner Research
date: 2026-04-07
tags:
    - attack.exfiltration
    - attack.t1537
logsource:
    product: github
    service: audit
detection:
    selection:
        action: 'repo.create'
        repo|contains:
            - 'tpcp-docs'
            - 'docs-tpcp'
    condition: selection
falsepositives:
    - Unlikely
level: critical
```

#### 7. TeamPCP Post-Compromise — AWS Bulk Enumeration from Known IPs

<!-- Validated: sigma check exit 0 -->

```yaml
title: TeamPCP AWS Bulk Enumeration from Known IPs
id: 3a9b5c67-d0e1-4f2a-4b3c-5d6e7f8a9b0c
status: experimental
description: >
    Detects bulk AWS API enumeration calls originating from known TeamPCP
    operational IP addresses used for post-compromise reconnaissance.
references:
    - https://www.wiz.io/blog/tracking-teampcp-investigating-post-compromise-attacks-seen-in-the-wild
author: Actioner Research
date: 2026-04-07
tags:
    - attack.discovery
    - attack.t1526
logsource:
    product: aws
    service: cloudtrail
detection:
    selection_api:
        eventName:
            - 'ListUsers'
            - 'ListRoles'
            - 'ListAttachedUserPolicies'
            - 'DescribeInstances'
            - 'ListSecrets'
            - 'GetSecretValue'
            - 'ListBuckets'
            - 'ListClusters'
            - 'ListFunctions'
    selection_ip:
        sourceIPAddress:
            - '138.199.15.172'
            - '154.47.29.12'
            - '170.62.100.245'
            - '193.32.126.157'
            - '163.245.223.12'
            - '209.159.147.239'
    condition: selection_api and selection_ip
falsepositives:
    - Legitimate automation from these IPs (unlikely)
level: critical
```

### YARA Rules

#### 1. TeamPCP Cloud Stealer — Credential Harvester

<!-- Validated: yarac exit 0 -->

```yara
rule TeamPCP_CloudStealer_CredentialHarvester
{
    meta:
        description = "Detects TeamPCP Cloud Stealer credential harvesting payloads targeting CI/CD secrets and cloud credentials"
        author = "Actioner Research"
        date = "2026-04-07"
        reference = "https://unit42.paloaltonetworks.com/teampcp-supply-chain-attacks/"
        severity = "critical"

    strings:
        $exfil_archive = "tpcp.tar.gz" ascii wide
        $exfil_repo1 = "tpcp-docs" ascii wide
        $exfil_repo2 = "docs-tpcp" ascii wide
        $c2_aqua = "aquasecurtiy" ascii wide
        $c2_checkmarx = "checkmarx.zone" ascii wide
        $c2_litellm = "models.litellm.cloud" ascii wide
        $secret_pattern = "{\"value\":\"" ascii
        $secret_isSecret = "\"isSecret\":true}" ascii
        $proc_mem = "/proc/" ascii
        $session_key = "session.key" ascii
        $payload_enc = "payload.enc" ascii
        $sysmon_path = ".config/systemd/user/sysmon" ascii
        $kamikaze = "kamikaze.sh" ascii
        $pglog = "/tmp/pglog" ascii

    condition:
        uint8(0) != 0x4d and
        (
            ($exfil_archive and any of ($c2_*)) or
            ($secret_pattern and $secret_isSecret and $proc_mem) or
            (3 of ($c2_aqua, $c2_checkmarx, $c2_litellm, $exfil_repo1, $exfil_repo2)) or
            ($sysmon_path and $pglog) or
            ($kamikaze and any of ($c2_*)) or
            ($session_key and $payload_enc and $exfil_archive)
        )
}
```

#### 2. TeamPCP WAV Steganography Payload

<!-- Validated: yarac exit 0 -->

```yara
rule TeamPCP_WAV_Steganography_Payload
{
    meta:
        description = "Detects WAV files containing TeamPCP steganographic payloads used in the Telnyx supply chain compromise"
        author = "Actioner Research"
        date = "2026-04-07"
        reference = "https://isc.sans.edu/diary/32838"
        severity = "critical"

    strings:
        $wav_header = { 52 49 46 46 ?? ?? ?? ?? 57 41 56 45 }
        $msbuild = "msbuild.exe" ascii wide
        $tpcp_tar = "tpcp.tar.gz" ascii wide
        $session_key = "session.key" ascii wide
        $rsa_begin = "-----BEGIN PUBLIC KEY-----" ascii
        $aes_cbc = "AES-256-CBC" ascii wide

    condition:
        $wav_header at 0 and
        (
            $msbuild or
            $tpcp_tar or
            ($session_key and $rsa_begin) or
            ($aes_cbc and ($tpcp_tar or $session_key))
        )
}
```

#### 3. TeamPCP LiteLLM Malicious .pth Backdoor

<!-- Validated: yarac exit 0 -->

```yara
rule TeamPCP_LiteLLM_Pth_Backdoor
{
    meta:
        description = "Detects the malicious .pth file used in the LiteLLM supply chain compromise for Python auto-execution persistence"
        author = "Actioner Research"
        date = "2026-04-07"
        reference = "https://ramimac.me/teampcp/"
        severity = "critical"

    strings:
        $pth_import = "import " ascii
        $litellm_init = "litellm_init" ascii
        $icp_c2 = "icp0.io" ascii
        $sysmon_py = "sysmon.py" ascii
        $proxy_server = "proxy_server.py" ascii
        $base64_zlib1 = "base64" ascii
        $base64_zlib2 = "zlib" ascii
        $rc4_ref = "RC4" ascii nocase

    condition:
        filesize < 100KB and
        $pth_import and
        (
            ($litellm_init and ($icp_c2 or $sysmon_py)) or
            ($proxy_server and $sysmon_py) or
            ($base64_zlib1 and $base64_zlib2 and ($icp_c2 or $sysmon_py)) or
            ($rc4_ref and ($icp_c2 or $litellm_init))
        )
}
```

### Suricata Rules

<!-- UNVALIDATED — Snort/Suricata not installed in validation environment -->
<!-- Rules follow Suricata syntax conventions and are syntactically modeled on ET Pro signatures -->

```
# TeamPCP C2 Communication - Typosquatted Aqua Security Domain
alert tls $HOME_NET any -> $EXTERNAL_NET any (msg:"ETPRO TROJAN TeamPCP C2 - scan.aquasecurtiy.org TLS SNI"; flow:established,to_server; tls.sni; content:"scan.aquasecurtiy.org"; nocase; classtype:trojan-activity; sid:2026001; rev:1;)

# TeamPCP C2 Communication - checkmarx.zone
alert tls $HOME_NET any -> $EXTERNAL_NET any (msg:"ETPRO TROJAN TeamPCP C2 - checkmarx.zone TLS SNI"; flow:established,to_server; tls.sni; content:"checkmarx.zone"; nocase; classtype:trojan-activity; sid:2026002; rev:1;)

# TeamPCP C2 Communication - models.litellm.cloud
alert tls $HOME_NET any -> $EXTERNAL_NET any (msg:"ETPRO TROJAN TeamPCP C2 - models.litellm.cloud TLS SNI"; flow:established,to_server; tls.sni; content:"models.litellm.cloud"; nocase; classtype:trojan-activity; sid:2026003; rev:1;)

# TeamPCP C2 Communication - ICP Fallback
alert tls $HOME_NET any -> $EXTERNAL_NET any (msg:"ETPRO TROJAN TeamPCP ICP Fallback C2"; flow:established,to_server; tls.sni; content:"icp0.io"; nocase; classtype:trojan-activity; sid:2026004; rev:1;)

# TeamPCP C2 Communication - nsa.cat
alert tls $HOME_NET any -> $EXTERNAL_NET any (msg:"ETPRO TROJAN TeamPCP C2 - nsa.cat TLS SNI"; flow:established,to_server; tls.sni; content:"nsa.cat"; nocase; classtype:trojan-activity; sid:2026005; rev:1;)

# TeamPCP Exfiltration Archive Pattern
alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"ETPRO TROJAN TeamPCP Exfil Archive Upload (tpcp.tar.gz)"; flow:established,to_server; http.method; content:"POST"; http.content_type; content:"application/"; http.request_body; content:"tpcp.tar.gz"; classtype:trojan-activity; sid:2026006; rev:1;)

# TeamPCP Known C2 IP (45.148.10.212)
alert ip $HOME_NET any -> 45.148.10.212 any (msg:"ETPRO TROJAN TeamPCP Known C2 IP (45.148.10.212)"; classtype:trojan-activity; sid:2026007; rev:1;)

# TeamPCP Known C2 IP (83.142.209.203)
alert ip $HOME_NET any -> 83.142.209.203 any (msg:"ETPRO TROJAN TeamPCP Known C2 IP (83.142.209.203)"; classtype:trojan-activity; sid:2026008; rev:1;)
```

---

## Remediation Guidance

### Immediate Actions
1. **Audit CI/CD pipelines** for any use of compromised package versions (Trivy v0.69.4–v0.69.6, LiteLLM v1.82.7–v1.82.8, Telnyx v4.87.1–v4.87.2, KICS compromised tags)
2. **Rotate ALL credentials** that may have been exposed: GitHub PATs, AWS keys, SSH keys, K8s service account tokens, PyPI tokens, .env file contents
3. **Search for fallback repositories** named `tpcp-docs` or `docs-tpcp` in all organizational GitHub accounts
4. **Scan for persistence artifacts:** `~/.config/systemd/user/sysmon.py`, `sysmon.service`, `/tmp/pglog`, `.pg_state`
5. **Block C2 infrastructure** at network level: all domains and IPs listed in IOC section
6. **Check for malicious .pth files** in Python site-packages directories

### Hardening
1. **Pin GitHub Actions to full commit SHA hashes** — never use version tags (this attack proves tags can be hijacked)
2. **Pin package versions explicitly** — disable auto-update in CI/CD
3. **Implement SLSA framework** for supply chain integrity verification
4. **Enable branch protection** with required reviews for all tag/release operations
5. **Use OIDC-based authentication** instead of long-lived PATs in CI/CD
6. **Disable automounting** of K8s service account tokens where not needed
7. **Monitor IMDS access** from unexpected processes; consider IMDSv2 enforcement on AWS

---

## Sources

- [Unit 42 — Weaponizing the Protectors: TeamPCP's Multi-Stage Supply Chain Attack](https://unit42.paloaltonetworks.com/teampcp-supply-chain-attacks/) — Comprehensive technical analysis with full IOC list, malware versions, and MITRE mappings
- [Wiz — Tracking TeamPCP: Post-Compromise Attacks in the Wild](https://www.wiz.io/blog/tracking-teampcp-investigating-post-compromise-attacks-seen-in-the-wild) — Post-compromise AWS exploitation TTPs, operational IPs, and behavioral indicators
- [Wiz — Trivy Compromised by TeamPCP](https://www.wiz.io/blog/trivy-compromised-teampcp-supply-chain-attack) — Initial Trivy compromise analysis, malware staging, and persistence mechanisms
- [ReversingLabs — TeamPCP Supply Chain Attack Spreads](https://www.reversinglabs.com/blog/teampcp-supply-chain-attack-spreads) — Cascading compromise analysis across GitHub, npm, and PyPI ecosystems
- [SANS ISC — TeamPCP Supply Chain Campaign Update 002](https://isc.sans.edu/diary/32838) — Telnyx PyPI compromise, WAV steganography, Vect RaaS partnership, AstraZeneca claim
- [SANS ISC — TeamPCP Supply Chain Campaign Update 003](https://isc.sans.edu/diary/rss/32842) — Operational tempo shift, monetization phase
- [ramimac — TeamPCP Incident Timeline](https://ramimac.me/teampcp/) — Complete incident timeline, actor aliases, malware obfuscation analysis, common misconceptions
- [The Record — EU Attributes Major Breach to TeamPCP](https://therecord.media/european-commission-cyberattack-teampcp) — European Commission AWS breach, CERT-EU high-confidence attribution
- [Arctic Wolf — TeamPCP Targets Trivy, Checkmarx, LiteLLM](https://arcticwolf.com/resources/blog/teampcp-supply-chain-attack-campaign-targets-trivy-checkmarx-kics-and-litellm-potential-downstream-impact-to-additional-projects/) — Campaign overview and downstream impact assessment
- [Help Net Security — CISA Alarm on Trivy Supply Chain Compromise](https://www.helpnetsecurity.com/2026/03/27/cve-2026-33017-cve-2026-33634-exploited/) — CISA KEV entry, CVE-2026-33634 and CVE-2026-33017
- [CVEReports — CVE-2026-33634](https://cvereports.com/reports/CVE-2026-33634) — CVSS 9.4 Critical, CWE-506 classification
- [SecurityWeek — TeamPCP Moves From OSS to AWS Environments](https://www.securityweek.com/teampcp-moves-from-oss-to-aws-environments/) — Cloud exploitation escalation coverage
- [Stream Security — TeamPCP's LiteLLM Takeover](https://www.stream.security/post/teampcps-litellm-takeover-a-cascading-supply-chain-attack-across-five-ecosystems) — Five-ecosystem cascading attack analysis
- [SOCRadar — TeamPCP Checkmarx GitHub Actions Attack](https://socradar.io/blog/teampcp-checkmarx-github-actions-attack/) — KICS/Checkmarx-specific compromise details
- [Trend Micro — TeamPCP Telnyx Attack Marks Shift in Tactics](https://www.trendmicro.com/en_us/research/26/c/teampcp-telnyx-attack-marks-a-shift-in-tactics.html) — Telnyx compromise and WAV steganography analysis
- [Dark Reading — TeamPCP Blast Radius Expands](https://www.darkreading.com/threat-intelligence/teampcp-attacks-hacker-infighting) — Group dynamics, infighting, expanding blast radius
- [CSA Labs — TeamPCP CI/CD Kill Chain](https://labs.cloudsecurityalliance.org/research/csa-research-note-teampcp-cicd-supply-chain-20260403-csa-sty/) — CI/CD kill chain analysis
- [1898 Advisories — March 2026 Developer Supply Chain Attack Wave](https://1898advisories.burnsmcd.com/march-2026-developer-supply-chain-attack-wave-teampcp-ci/cd-infrastructure-campaign-cve-2026-33634-and-concurrent-unc1069-axios-npm-compromise) — CVE-2026-33634 and concurrent UNC1069 campaign context
- [MOXFIVE — Threat Actor Alert TeamPCP](https://www.moxfive.com/resources/moxfive-threat-actor-alert-teampcp) — Incident response perspective
- [Akamai — Telnyx PyPI and TeamPCP Supply Chain Attacks](https://www.akamai.com/blog/security-research/telnyx-pypi-2026-teampcp-supply-chain-attacks) — Telnyx technical analysis
- [Oligo Security — The Evolution of Modern Supply Chain Attacks](https://www.oligo.security/blog/teampcp-campaign-the-evolution-of-modern-supply-chain-attacks) — Supply chain attack evolution context
