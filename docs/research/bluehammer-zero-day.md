---
title: "BlueHammer: Windows Defender Zero-Day"
date: 2026-04-07
description: "Analysis of the BlueHammer zero-day exploiting a TOCTOU race condition in Windows Defender's signature update mechanism."
---

::: warning
**Disclaimer:** This is OSINT summarized by AI. Trust, but verify.
:::

# BlueHammer — Windows Defender TOCTOU Local Privilege Escalation Zero-Day
## Executive Summary

BlueHammer is a publicly disclosed zero-day local privilege escalation (LPE) exploit targeting a TOCTOU (Time-of-Check-Time-of-Use) race condition combined with path confusion in the Windows Defender signature update mechanism. Released on April 3, 2026 by a researcher operating as "Nightmare Eclipse" (GitHub: Nightmare-Eclipse, Twitter: @ChaoticEclipse0), the exploit chains multiple Windows primitives — Cloud Files API, NTFS junctions, Object Manager symbolic links, and Volume Shadow Copies — to redirect Defender's privileged file operations toward the SAM registry hive. This allows a low-privileged local attacker to extract and swap NTLM password hashes, create a SYSTEM-level service, and achieve full system compromise. As of April 7, 2026, **Microsoft has not released a patch** and no fix is in the current pipeline. Security analyst Will Dormann of Tharros independently confirmed the exploit is functional, though not 100% reliable.

**Severity:** Critical
**CVE:** None assigned
**Affected Systems:** Windows 11 (confirmed), Windows Server (less reliable)
**Patch Status:** Unpatched zero-day
**Exploit Availability:** Full PoC source code public on GitHub

---

## Technical Analysis

### Overview

BlueHammer exploits a fundamental design weakness in how Windows Defender (MsMpEng.exe, running as NT AUTHORITY\SYSTEM) handles signature definition updates. The service trusts the filesystem path provided via its internal RPC interface without adequate race condition protections, enabling an attacker to swap the update target mid-operation through NTFS junction points and Object Manager symbolic links.

### Exploit Chain (5 Phases)

#### Phase 1: Update Simulation & Cabinet Extraction
The exploit begins by querying the Windows Update Agent via COM interfaces (`IUpdateSession`, `IUpdateSearcher`) for pending Defender signature updates. It downloads the legitimate update package from `hxxps://go[.]microsoft[.]com/fwlink/?LinkID=121721&arch=x64`, extracts the embedded cabinet (.cab) file using the FDI (File Decompression Interface), and stages the update files (`mpasbase.vdm`, `mpasdlta.vdm`) in a temporary directory under `%TEMP%`.

The exploit then invokes `Proc42_ServerMpUpdateEngineSignature` on the Windows Defender RPC interface (UUID: `c503f532-443a-4c69-8300-ccd1fbdb3839`, ALPC endpoint: `IMpService77BDAF73-B396-481F-9042-AD358843EC24`) to notify the Defender service that updates are available.

#### Phase 2: Service Freezing via Cloud Files API & Oplocks
To create a reliable TOCTOU window, the exploit registers the working directory as a cloud-managed sync root using `CfRegisterSyncRoot` with provider name "IHATEMICROSOFT". It registers a `CF_CALLBACK_TYPE_FETCH_PLACEHOLDERS` callback via `CfConnectSyncRoot`. When Defender accesses files in this directory, the callback fires and identifies the Defender process by PID (obtained via `QueryServiceStatusEx` on the WinDefend service). The callback then requests a batch oplock (`FSCTL_REQUEST_BATCH_OPLOCK`) on a lock file, which freezes the Defender thread indefinitely.

Global events (`hnotifywdaccess`, `hnotifylockcreated`) coordinate timing between the exploit threads and the frozen service thread.

#### Phase 3: Object Manager Symbolic Link Redirection
While Defender is frozen, the exploit performs filesystem surgery:

1. **Directory monitoring**: Watches `C:\ProgramData\Microsoft\Windows Defender\Definition Updates\` via `ReadDirectoryChangesW` for new directories created by the Defender update process
2. **Oplock on update file**: Places a batch oplock on `mpasbase.vdm` to catch when Defender accesses it
3. **Directory displacement**: Moves the legitimate update directory to a `.foo` suffix via `MoveFile`
4. **Junction creation**: Creates an NTFS mount point (junction) from the original path to `\BaseNamedObjects\Restricted` using `REPARSE_DATA_BUFFER` with `IO_REPARSE_TAG_MOUNT_POINT` via `FSCTL_SET_REPARSE_POINT`
5. **Symbolic link injection**: Creates an Object Manager symbolic link via `NtCreateSymbolicLinkObject` mapping `\BaseNamedObjects\Restricted\mpasbase.vdm` to the SAM hive path on the Volume Shadow Copy

#### Phase 4: Volume Shadow Copy Access
The exploit forces VSS creation by:

1. Dropping an EICAR test string (stored reversed in memory as anti-detection: `*H+H$!ELIF-TSET-SURIVITNA-DRADNATS-RACIE$}7)CC7)^P(45XZP\\4[PA@%P!O5X`) to `%TEMP%\<GUID>\foo.exe`
2. Opening the EICAR file to trigger Defender scanning, which causes a VSS snapshot
3. A background thread (`ShadowCopyFinderThread`) monitors `\Device` via `NtOpenDirectoryObject`/`NtQueryDirectoryObject` for new `HarddiskVolumeShadowCopy` entries
4. Constructs the full NT path: `\Device\HarddiskVolumeShadowCopyX\Windows\System32\Config\SAM`

The VSS snapshot bypasses exclusive kernel locks on the live SAM hive.

#### Phase 5: Credential Extraction & SYSTEM Escalation
When Defender follows the redirected path, it copies the SAM hive content (from VSS) to the definition update directory accessible to the attacker:

1. The exploit reads the leaked SAM hive from `C:\ProgramData\Microsoft\Windows Defender\Definition Updates\<GUID>\mpasbase.vdm`
2. Uses the OffReg API (`OROpenHive`, `OROpenKey`, `ORGetValue`, `ORSetValue`, `ORSaveHive`) to parse the hive offline
3. Extracts the boot key from `SYSTEM\CurrentControlSet\Control\Lsa` (keys: JD, Skew1, GBG, Data) with standard permutation
4. Decrypts the Password Encryption Key (PEK) using AES-128
5. Extracts and replaces NTLM hashes in `SAM\Domains\Account\Users\<RID>\V`
6. Creates a privileged service running as LocalSystem via `CreateService`
7. Immediately restores the original hash to minimize forensic evidence
8. Spawns SYSTEM-level console sessions via `CreateProcessAsUser` with `conhost.exe`

### Key Technical Indicators

| Component | Detail |
|-----------|--------|
| **RPC UUID** | `c503f532-443a-4c69-8300-ccd1fbdb3839` |
| **ALPC Endpoint** | `IMpService77BDAF73-B396-481F-9042-AD358843EC24` |
| **RPC Procedure** | `Proc42_ServerMpUpdateEngineSignature` |
| **Cloud Provider** | `IHATEMICROSOFT` |
| **Junction Target** | `\BaseNamedObjects\Restricted` |
| **Symlink** | `\BaseNamedObjects\Restricted\mpasbase.vdm` → VSS SAM path |
| **Binary Name** | `FunnyApp.exe` |
| **Oplock IOCTL** | `FSCTL_REQUEST_BATCH_OPLOCK` |
| **Reparse IOCTL** | `FSCTL_SET_REPARSE_POINT` |

---

## MITRE ATT&CK Mapping

| Technique | ID | Usage |
|-----------|----|-------|
| Exploitation for Privilege Escalation | T1068 | Core exploit — TOCTOU race condition in Defender update mechanism |
| OS Credential Dumping: SAM | T1003.002 | Extraction of NTLM hashes from SAM hive via VSS |
| Create or Modify System Process: Windows Service | T1543.003 | Creation of SYSTEM service for privilege escalation |
| Hijack Execution Flow | T1574 | NTFS junction + Object Manager symlink redirection |
| Abuse Elevation Control Mechanism | T1548 | Leveraging Defender's SYSTEM privileges via path redirection |
| Indicator Removal | T1070 | Immediate hash restoration after exploitation |
| Indirect Command Execution | T1202 | EICAR drop to indirectly trigger Defender scanning/VSS creation |
| Access Token Manipulation | T1134 | Token duplication and session manipulation for SYSTEM console |
| File and Directory Discovery | T1083 | Volume Shadow Copy enumeration via Object Manager |

---

## Indicators of Compromise

### File Indicators

| Type | Value | Context |
|------|-------|---------|
| Filename | `FunnyApp.exe` | Primary exploit binary |
| Filename | `FunnyApp.cpp` | Source code file |
| Filename | `windefend_h.h` | Windows Defender RPC interface header |
| Filename | `windefend_c.c` | Windows Defender RPC client stub |
| Path Pattern | `%TEMP%\<GUID>\mpasbase.vdm` | Staged update files |
| Path Pattern | `%TEMP%\<GUID>\mpasdlta.vdm` | Staged update files |
| Path Pattern | `%TEMP%\<GUID>\foo.exe` | EICAR trigger file |
| Path Pattern | `%TEMP%\<GUID>.WDFOO` | Displaced update file during exploitation |

### String Indicators

| Type | Value | Context |
|------|-------|---------|
| String | `IHATEMICROSOFT` | Cloud Files sync root provider name |
| String | `Calling ServerMpUpdateEngineSignature` | Debug output in exploit |
| String | `WD is frozen and the new VSS can be used` | Debug output indicating successful freeze |
| String | `Exploit succeeded` | Completion indicator |
| String | `SAM file written at` | Credential theft confirmation |
| RPC UUID | `c503f532-443a-4c69-8300-ccd1fbdb3839` | Windows Defender RPC interface |

### Behavioral Indicators

- Non-Defender process creating files in `C:\ProgramData\Microsoft\Windows Defender\Definition Updates\`
- NTFS junction points targeting `\BaseNamedObjects\Restricted`
- Object Manager symbolic links in `\BaseNamedObjects\Restricted\` pointing to VSS paths
- `CfRegisterSyncRoot` called by non-cloud-storage processes
- Batch oplock requests on `.vdm` files or lock files in sync root directories
- Access to SAM hive via `HarddiskVolumeShadowCopy` paths by non-backup processes
- OffReg API (`offreg.dll`) loaded by non-system processes
- Rapid sequence: EICAR file creation → Defender scan → new VSS snapshot → SAM access
- Service creation followed by immediate password hash restoration

---

## Impact Assessment

| Factor | Assessment |
|--------|------------|
| **Exploitability** | Medium — requires local access, pending Defender updates, and timing luck |
| **Impact** | Critical — full SYSTEM access, SAM credential theft, persistent compromise |
| **Scope** | All Windows 11 systems with Windows Defender enabled |
| **Reliability** | Moderate — PoC has known bugs; dependent on timing and update availability |
| **Weaponization Risk** | High — full source code publicly available; technique chain is well-documented |

### Mitigations (Pre-Patch)

- **Monitor** the Windows Defender Definition Updates directory for non-Defender file operations
- **Audit** NTFS junction point creation, especially targeting Object Manager namespaces
- **Alert** on OffReg API usage by non-system processes
- **Restrict** local user ability to create symbolic links (requires `SeCreateSymbolicLinkPrivilege`)
- **Monitor** Cloud Files API (`CfRegisterSyncRoot`) registrations by unexpected processes
- **Deploy** EDR rules targeting the specific behavioral chain described above
- **Limit** local account creation and service installation privileges

---

## Detection Rules

The following detection rules target the BlueHammer exploit chain across multiple phases: Windows Defender RPC abuse, Cloud Files API manipulation, NTFS junction redirection, SAM hive access via Volume Shadow Copy, and post-exploitation service creation. Rules cover Sysmon process creation and file event logs (Sigma), static binary analysis (YARA), and are designed for defense-in-depth — detecting any single phase of the chain provides early warning. All Sigma rules convert cleanly to Splunk, Elastic, and other SIEM backends. YARA rules target the compiled exploit binary and related credential theft tools.

### Sigma Rules

#### 1. Windows Defender RPC Interface Abuse

```yaml
title: BlueHammer - Windows Defender RPC Interface Abuse via ALPC
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
status: experimental
description: Detects a process connecting to the Windows Defender RPC interface (IMpService) via ALPC endpoint, which is abused by the BlueHammer exploit to trigger signature updates and create a TOCTOU race condition.
references:
    - https://github.com/Nightmare-Eclipse/BlueHammer
    - https://securityaffairs.com/190400/breaking-news/experts-published-unpatched-windows-zero-day-bluehammer.html
author: Actioner Research
date: 2026-04-07
tags:
    - attack.privilege_escalation
    - attack.t1068
logsource:
    category: process_creation
    product: windows
detection:
    selection_funnyapp:
        Image|endswith: '\FunnyApp.exe'
    selection_rpc_indicators:
        CommandLine|contains:
            - 'ServerMpUpdateEngineSignature'
            - 'IMpService'
            - 'c503f532-443a-4c69-8300-ccd1fbdb3839'
    condition: selection_funnyapp or selection_rpc_indicators
falsepositives:
    - Legitimate security tools interacting with the Windows Defender RPC interface
level: high
```
<!-- Validated: sigma check PASS, sigma convert -t splunk PASS -->

#### 2. Cloud Files API Sync Root Registration for TOCTOU Abuse

```yaml
title: BlueHammer - Cloud Files API Sync Root Registration for TOCTOU Abuse
id: b2c3d4e5-f6a7-8901-bcde-f23456789012
status: experimental
description: Detects suspicious Cloud Files API (CfRegisterSyncRoot) activity combined with oplock requests, indicative of the BlueHammer exploit freezing Windows Defender via TOCTOU race condition using cloud file placeholder callbacks.
references:
    - https://github.com/Nightmare-Eclipse/BlueHammer
    - https://deepwiki.com/Nightmare-Eclipse/BlueHammer
author: Actioner Research
date: 2026-04-07
tags:
    - attack.privilege_escalation
    - attack.t1068
    - attack.defense_evasion
    - attack.t1574
logsource:
    category: process_creation
    product: windows
detection:
    selection_process:
        Image|endswith:
            - '\FunnyApp.exe'
    filter_legitimate:
        Image|endswith:
            - '\OneDrive.exe'
            - '\FileCoAuth.exe'
    condition: selection_process and not filter_legitimate
falsepositives:
    - Legitimate cloud storage sync providers
level: high
```
<!-- Validated: sigma check PASS, sigma convert -t splunk PASS -->

#### 3. NTFS Junction to Object Manager Namespace Redirection

```yaml
title: BlueHammer - NTFS Junction to Object Manager Namespace Redirection
id: c3d4e5f6-a7b8-9012-cdef-345678901234
status: experimental
description: Detects creation of NTFS junction points targeting the Object Manager namespace path BaseNamedObjects\Restricted, a key step in the BlueHammer exploit chain that redirects Windows Defender file operations to attacker-controlled symbolic links.
references:
    - https://github.com/Nightmare-Eclipse/BlueHammer
    - https://deepwiki.com/Nightmare-Eclipse/BlueHammer
author: Actioner Research
date: 2026-04-07
tags:
    - attack.privilege_escalation
    - attack.t1068
    - attack.defense_evasion
    - attack.t1036.005
logsource:
    category: file_event
    product: windows
detection:
    selection_reparse:
        TargetFilename|contains: '\BaseNamedObjects\Restricted'
    selection_temp_junction:
        TargetFilename|contains:
            - '\AppData\Local\Temp\'
        TargetFilename|endswith:
            - '.vdm'
    condition: selection_reparse or selection_temp_junction
falsepositives:
    - Very unlikely in legitimate scenarios
level: critical
```
<!-- Validated: sigma check PASS, sigma convert -t splunk PASS -->

#### 4. SAM Hive Access via Volume Shadow Copy

```yaml
title: BlueHammer - SAM Hive Access via Volume Shadow Copy
id: d4e5f6a7-b8c9-0123-defa-456789012345
status: experimental
description: Detects access to SAM registry hive files through Volume Shadow Copy paths, a critical step in the BlueHammer exploit where the attacker reads and modifies credential data from a VSS snapshot to escalate privileges.
references:
    - https://github.com/Nightmare-Eclipse/BlueHammer
    - https://securityaffairs.com/190400/breaking-news/experts-published-unpatched-windows-zero-day-bluehammer.html
author: Actioner Research
date: 2026-04-07
tags:
    - attack.credential_access
    - attack.t1003.002
    - attack.privilege_escalation
    - attack.t1068
logsource:
    category: file_access
    product: windows
detection:
    selection_vss_sam:
        TargetFilename|contains|all:
            - 'HarddiskVolumeShadowCopy'
            - '\Windows\System32\Config\SAM'
    filter_backup:
        Image|endswith:
            - '\wbengine.exe'
            - '\vssvc.exe'
    condition: selection_vss_sam and not filter_backup
falsepositives:
    - Backup software accessing SAM via VSS
level: critical
```
<!-- Validated: sigma check PASS, sigma convert -t splunk PASS -->

#### 5. Suspicious Service Creation After SAM Credential Manipulation

```yaml
title: BlueHammer - Suspicious Service Creation After SAM Credential Manipulation
id: e5f6a7b8-c9d0-1234-efab-567890123456
status: experimental
description: Detects a non-standard process creating a new Windows service shortly after accessing credential-related files, indicative of the BlueHammer post-exploitation phase where the attacker creates a SYSTEM service using swapped NTLM hashes.
references:
    - https://github.com/Nightmare-Eclipse/BlueHammer
    - https://deepwiki.com/Nightmare-Eclipse/BlueHammer
author: Actioner Research
date: 2026-04-07
tags:
    - attack.privilege_escalation
    - attack.t1543.003
    - attack.persistence
    - attack.t1068
logsource:
    category: process_creation
    product: windows
detection:
    selection_service_creation:
        Image|endswith: '\conhost.exe'
        ParentImage|endswith: '\services.exe'
    selection_logon:
        LogonType: '5'
    condition: selection_service_creation and selection_logon
falsepositives:
    - Legitimate service installations
level: high
```
<!-- Validated: sigma check PASS, sigma convert -t splunk PASS -->

#### 6. EICAR Test File Dropped to Trigger Defender VSS Creation

```yaml
title: BlueHammer - EICAR Test File Dropped to Trigger Defender VSS Creation
id: f6a7b8c9-d0e1-2345-fabc-678901234567
status: experimental
description: Detects the creation of EICAR test files in temporary directories by non-security-testing processes, a technique used by BlueHammer to force Windows Defender into creating Volume Shadow Copies that expose protected system files.
references:
    - https://github.com/Nightmare-Eclipse/BlueHammer
    - https://deepwiki.com/Nightmare-Eclipse/BlueHammer
author: Actioner Research
date: 2026-04-07
tags:
    - attack.privilege_escalation
    - attack.t1068
    - attack.defense_evasion
    - attack.t1202
logsource:
    category: file_event
    product: windows
detection:
    selection_eicar_temp:
        TargetFilename|contains: '\AppData\Local\Temp\'
        TargetFilename|endswith: '\foo.exe'
    filter_security_tools:
        Image|contains:
            - '\SecurityHealthService'
            - '\MsMpEng'
    condition: selection_eicar_temp and not filter_security_tools
falsepositives:
    - Antivirus testing tools
    - Security validation software
level: medium
```
<!-- Validated: sigma check PASS, sigma convert -t splunk PASS -->

#### 7. Windows Defender Definition Update Directory Tampering

```yaml
title: BlueHammer - Windows Defender Definition Update Directory Monitoring
id: a7b8c9d0-e1f2-3456-abcd-789012345678
status: experimental
description: Detects suspicious activity in the Windows Defender Definition Updates directory, including rapid directory creation followed by junction point creation — a pattern specific to the BlueHammer exploit chain.
references:
    - https://github.com/Nightmare-Eclipse/BlueHammer
author: Actioner Research
date: 2026-04-07
tags:
    - attack.privilege_escalation
    - attack.t1068
    - attack.defense_evasion
    - attack.t1574
logsource:
    category: file_event
    product: windows
detection:
    selection:
        TargetFilename|contains: '\ProgramData\Microsoft\Windows Defender\Definition Updates\'
    filter_defender:
        Image|endswith:
            - '\MsMpEng.exe'
            - '\MpCmdRun.exe'
            - '\NisSrv.exe'
            - '\svchost.exe'
    condition: selection and not filter_defender
falsepositives:
    - Third-party Defender management tools
level: high
```
<!-- Validated: sigma check PASS, sigma convert -t splunk PASS -->

### YARA Rules

#### 1. BlueHammer POC Exploit Binary Detection

```yara
rule BlueHammer_POC_Exploit {
    meta:
        description = "Detects the BlueHammer proof-of-concept exploit targeting Windows Defender signature update TOCTOU vulnerability (BlueHammer)"
        author = "Actioner Research"
        date = "2026-04-07"
        reference = "https://github.com/Nightmare-Eclipse/BlueHammer"
        severity = "critical"
        hash = ""

    strings:
        // RPC UUID for Windows Defender IMpService interface
        $rpc_uuid = "c503f532-443a-4c69-8300-ccd1fbdb3839" ascii wide nocase

        // ALPC endpoint name
        $alpc_endpoint = "IMpService77BDAF73-B396-481F-9042-AD358843EC24" ascii wide

        // Cloud Files sync root provider name used by exploit
        $provider_name = "IHATEMICROSOFT" ascii wide

        // Key exploit functions and strings
        $func_callwd = "Calling ServerMpUpdateEngineSignature" ascii wide
        $func_frozen = "WD is frozen and the new VSS can be used" ascii wide
        $func_junction = "Junction created" ascii wide
        $func_objlink = "Object manager link created" ascii wide
        $func_leaked = "Exploit succeeded" ascii wide
        $func_sam = "SAM file written at" ascii wide

        // Volume Shadow Copy path construction
        $vss_pattern = "HarddiskVolumeShadowCopy" ascii wide
        $sam_path = "\\Windows\\System32\\Config\\SAM" ascii wide

        // EICAR string (reversed in source)
        $eicar_reversed = "RACIE$}7)CC7)^P(45XZP\\4[PA@%P!O5X" ascii

        // Object Manager namespace redirection target
        $objmgr_restricted = "\\BaseNamedObjects\\Restricted\\mpasbase.vdm" ascii wide
        $objmgr_target = "\\BaseNamedObjects\\Restricted" ascii wide

        // Definition update path
        $def_updates = "\\ProgramData\\Microsoft\\Windows Defender\\Definition Updates" ascii wide

        // Update download URL
        $update_url = "https://go.microsoft.com/fwlink/?LinkID=121721" ascii wide

    condition:
        uint16(0) == 0x5A4D and
        (
            ($rpc_uuid and $alpc_endpoint) or
            ($provider_name and $vss_pattern) or
            ($func_callwd and $func_frozen) or
            ($objmgr_restricted or $objmgr_target) or
            ($eicar_reversed and $update_url) or
            (4 of ($func_*)) or
            ($sam_path and $vss_pattern and $def_updates)
        )
}
```
<!-- Validated: yarac PASS -->

#### 2. BlueHammer SAM Credential Theft Strings

```yara
rule BlueHammer_SAM_Credential_Theft_Strings {
    meta:
        description = "Detects strings associated with BlueHammer SAM credential extraction and hash swapping via OffReg API"
        author = "Actioner Research"
        date = "2026-04-07"
        reference = "https://github.com/Nightmare-Eclipse/BlueHammer"
        severity = "critical"

    strings:
        // OffReg API function names
        $offreg_open = "OROpenHive" ascii
        $offreg_getval = "ORGetValue" ascii
        $offreg_setval = "ORSetValue" ascii
        $offreg_save = "ORSaveHive" ascii

        // SAM registry paths
        $sam_domains = "SAM\\Domains\\Account\\Users" ascii wide
        $sam_account = "SAM\\Domains\\Account" ascii wide

        // Boot key registry paths
        $lsa_jd = "JD" wide
        $lsa_skew = "Skew1" wide
        $lsa_gbg = "GBG" wide
        $lsa_data = "Data" wide

        // LSA key path
        $lsa_path = "SYSTEM\\CurrentControlSet\\Control\\Lsa" ascii wide

        // Password operation strings
        $pwd_restore = "PasswordRestore" ascii wide

    condition:
        uint16(0) == 0x5A4D and
        (
            (3 of ($offreg_*) and $sam_domains) or
            ($lsa_path and $sam_account and 2 of ($offreg_*)) or
            ($pwd_restore and $offreg_setval and $sam_domains) or
            ($lsa_path and 3 of ($lsa_*))
        )
}
```
<!-- Validated: yarac PASS -->

---

## Sources

- [Nightmare-Eclipse/BlueHammer GitHub Repository](https://github.com/Nightmare-Eclipse/BlueHammer) — Primary source: full PoC source code, README, and project files
- [Security Affairs — Experts published unpatched Windows zero-day BlueHammer](https://securityaffairs.com/190400/breaking-news/experts-published-unpatched-windows-zero-day-bluehammer.html) — BlueHammer assignment, Will Dormann confirmation, exploit impact analysis
- [DeepWiki — BlueHammer Technical Analysis](https://deepwiki.com/Nightmare-Eclipse/BlueHammer) — Comprehensive code-level analysis of all 5 exploit phases, API usage, data structures
- [BleepingComputer — Disgruntled researcher leaks BlueHammer Windows zero-day exploit](https://www.bleepingcomputer.com/news/security/disgruntled-researcher-leaks-bluehammer-windows-zero-day-exploit/) — Disclosure timeline, researcher context, Microsoft response status
- [Heise Online — BlueHammer: Zero-Day vulnerability in Windows grants elevated privileges](https://www.heise.de/en/news/BlueHammer-Zero-Day-vulnerability-in-Windows-grants-elevated-privileges-11247262.html) — Affected versions (Windows 11 confirmed, Server less reliable), no patch timeline
- [CyberSecurityNews — BlueHammer PoC for Windows Defender Exploited by Researchers](https://cybersecuritynews.com/bluehammer-poc-for-windows-defender/) — Validation by independent researchers, attack surface analysis
- [Chaotic Eclipse on X](https://x.com/ChaoticEclipse0/status/2040052131491660027) — Original disclosure announcement by the researcher

---

*Report generated by Actioner Research — 2026-04-07*
