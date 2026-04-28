---
title: "Redsun: Windows Defender Cloud File Privilege Escalation"
date: 2026-04-17
description: "Analysis of the Nightmare-Eclipse Redsun PoC exploiting a logic flaw in Windows Defender's cloud file remediation to achieve user-to-SYSTEM privilege escalation."
---

::: warning
**Disclaimer:** This is OSINT summarized by AI. Trust, but verify.
:::

# Nightmare-Eclipse Redsun: Windows Defender Cloud File Privilege Escalation PoC

## Executive Summary

Redsun is a local privilege escalation (LPE) proof-of-concept published by researcher "Nightmare-Eclipse" on April 15, 2026. It exploits a logic flaw in Windows Defender's handling of cloud-tagged files: when Defender detects a malicious file bearing a Windows Cloud Files API sync tag, it **rewrites the file to its original location** instead of removing it. Redsun weaponizes this behavior by combining an EICAR-triggered AV scan with NTFS junction points and batch oplocks to redirect Defender's file-rewrite operation into `C:\Windows\System32`, overwriting `TieringEngineService.exe`. It then triggers the Storage Tiers Management COM service to execute the planted binary as NT AUTHORITY\SYSTEM, completing a full user-to-SYSTEM privilege escalation chain.

The exploit requires only standard user privileges to execute. No kernel vulnerability is involved: this is purely a logic/design flaw in Defender's cloud file remediation path.

---

## Technical Analysis

### Attack Chain Overview

The exploit proceeds in the following stages:

**Stage 1: Setup & AV Trigger**
1. Creates a named pipe `\\.\pipe\REDSUN` used later for session ID recovery.
2. Creates a working directory at `%TEMP%\RS-{GUID}`.
3. Writes a file named `TieringEngineService.exe` containing the EICAR test string (stored reversed in the binary to avoid static detection: `*H+H$!ELIF-TSET-SURIVITNA-DRADNATS-RACIE$`).
4. Opens the file with `FILE_EXECUTE` permission to trigger Windows Defender real-time protection.

**Stage 2: Volume Shadow Copy Racing**
5. A secondary thread (`ShadowCopyFinderThread`) enumerates `\Device\` object directory via `NtOpenDirectoryObject` / `NtQueryDirectoryObject`, watching for newly-created `HarddiskVolumeShadowCopy*` volumes.
6. When Defender creates a shadow copy as part of remediation, the thread opens the file within the VSC and acquires a **batch oplock** (`FSCTL_REQUEST_BATCH_OPLOCK`) to stall Defender's file operations.

**Stage 3: Cloud File API Abuse**
7. After Defender quarantines the EICAR file, Redsun marks the original file for POSIX-style deletion via `NtSetInformationFile` with `FILE_DISPOSITION_INFORMATION_EX` (flags `0x3`, delete + ignore readonly).
8. Registers a Windows Cloud Files sync root on the working directory via `CfRegisterSyncRoot` with provider name `SERIOUSLYMSFT`.
9. Creates a cloud placeholder file via `CfCreatePlaceholders` with the name `TieringEngineService.exe`, flagged `CF_PLACEHOLDER_CREATE_FLAG_SUPERSEDE | CF_PLACEHOLDER_CREATE_FLAG_MARK_IN_SYNC`.
10. This cloud tag triggers Defender's flawed logic: **Defender rewrites the detected file back to the original location** to ensure it can be "properly" handled.

**Stage 4: Directory Junction Redirect**
11. Renames the working directory, recreates it, and sets up a new file with a batch oplock.
12. Converts the working directory to a **mount point reparse** (NTFS junction) targeting `\??\C:\Windows\System32` using `FSCTL_SET_REPARSE_POINT` with `IO_REPARSE_TAG_MOUNT_POINT`.
13. When the oplock breaks (Defender writes the file back), the junction redirects the write to `C:\Windows\System32\TieringEngineService.exe`.

**Stage 5: SYSTEM Execution**
14. After successfully writing to System32, copies itself over `TieringEngineService.exe`.
15. Triggers the **Storage Tiers Management** service via COM activation (CLSID `{50d185b9-fff3-4656-92c7-e4018da4361d}`), which loads `TieringEngineService.exe` as SYSTEM.
16. When running as SYSTEM, opens the `REDSUN` named pipe to recover the original user's session ID, duplicates its own token, sets the session ID, and spawns `conhost.exe` in the user's session, delivering a SYSTEM-level console.

### Key API Usage

| API | Purpose |
|-----|---------|
| `NtOpenDirectoryObject` / `NtQueryDirectoryObject` | Enumerate object manager for VSC volumes |
| `NtSetInformationFile` (class 64) | POSIX-style file deletion (`FILE_DISPOSITION_INFORMATION_EX`) |
| `NtSetInformationFile` (class 10) | File rename (`FILE_RENAME_INFORMATION`) |
| `FSCTL_REQUEST_BATCH_OPLOCK` | Acquire batch oplocks to stall Defender |
| `FSCTL_SET_REPARSE_POINT` | Create NTFS junction / mount point |
| `CfRegisterSyncRoot` / `CfConnectSyncRoot` / `CfCreatePlaceholders` | Windows Cloud Files API abuse |
| `CoCreateInstance` (CLSID `50d185b9-...`) | Trigger Storage Tiers Management service |
| `DuplicateTokenEx` / `SetTokenInformation` / `CreateProcessAsUser` | Token manipulation for SYSTEM shell delivery |

### Linked Libraries

- `ntdll.dll`: Native API calls
- `CldApi.dll`: Cloud Files API
- `synchronization.lib`: `WaitOnAddress` / `WakeByAddressAll`
- `sas.lib`: Secure Attention Sequence (linked but not actively used in PoC)

---

## MITRE ATT&CK Mapping

| Technique ID | Technique Name | Usage in Redsun |
|-------------|---------------|-----------------|
| T1068 | Exploitation for Privilege Escalation | Core exploit: abuses Defender cloud file logic flaw |
| T1036.005 | Masquerading: Match Legitimate Name or Location | Drops payload as `TieringEngineService.exe` in System32 |
| T1574.010 | Hijack Execution Flow: Services File Permissions Weakness | Overwrites legitimate service binary to hijack execution |
| T1106 | Native API | Extensive use of NT native APIs (`NtCreateFile`, `NtSetInformationFile`, etc.) |
| T1564 | Hide Artifacts | Cloud Files sync root registration to trigger Defender behavior |
| T1547.012 | Boot or Logon Autostart Execution: Print Processors | Service-based execution (Storage Tiers Management) |
| T1134.002 | Access Token Manipulation: Create Process with Token | `DuplicateTokenEx` + `CreateProcessAsUser` for SYSTEM shell |

---

## Indicators of Compromise

### Named Pipe
| Type | Value | Context |
|------|-------|---------|
| Named Pipe | `\\.\pipe\REDSUN` | IPC channel for session ID recovery |

### File System Artifacts
| Type | Value | Context |
|------|-------|---------|
| File Path | `%TEMP%\RS-{GUID}\TieringEngineService.exe` | Initial EICAR payload staging location |
| File Path | `C:\Windows\System32\TieringEngineService.exe` | Overwritten service binary (if exploit succeeds) |
| Directory | `%TEMP%\RS-{GUID}` | Working directory with cloud sync root |
| Registry Key | `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\SyncRootManager\*SERIOUSLYMSFT*` | Cloud sync root registration |

### Strings in Binary
| Type | Value | Context |
|------|-------|---------|
| String | `SERIOUSLYMSFT` | Cloud Files provider name |
| String | `The sun is shinning...` | Console output on VSC file open success |
| String | `The red sun shall prevail.` | Console output on System32 write success |
| String | `*H+H$!ELIF-TSET-SURIVITNA-DRADNATS-RACIE$` | Reversed EICAR test string |

### COM Object
| Type | Value | Context |
|------|-------|---------|
| CLSID | `{50d185b9-fff3-4656-92c7-e4018da4361d}` | Storage Tiers Management service trigger |

### Process Relationships
| Parent | Child | Context |
|--------|-------|---------|
| `TieringEngineService.exe` | `conhost.exe` | SYSTEM shell delivery |

---

## Impact Assessment

- **Scope:** Local privilege escalation from standard user to NT AUTHORITY\SYSTEM
- **Prerequisites:** Windows Defender with real-time and cloud protection enabled (default configuration)
- **User Interaction:** None (fully automated after execution)
- **Affected Systems:** Windows 10/11 with default Defender configuration (specific version range TBD pending Microsoft advisory)
- **Exploitation Complexity:** Low, compiled PoC runs as a single executable
- **Severity:** Critical, achieves full SYSTEM compromise on default Windows installations

---

## Recommendations

1. **Monitor for NTFS junction creation** in user-writable directories pointing to protected system paths
2. **Alert on Cloud Files sync root registration** from non-standard applications, particularly with suspicious provider names
3. **Audit `TieringEngineService.exe`**: the legitimate binary should only be updated via Windows servicing
4. **Monitor for the `REDSUN` named pipe**: unique to this PoC but trivially renamed in variants
5. **Track `conhost.exe` spawned by service processes**: unusual parent-child relationship
6. **Watch for EICAR string activity** followed by cloud file operations in the same process, signature of the trigger mechanism
7. **Expect a Microsoft patch**: this is a design flaw in Defender's remediation logic; monitor MSRC advisories

---

## Detection Rules

The following rules target Redsun's specific behavioral chain: named pipe creation, cloud sync root abuse, NTFS junction redirection to System32, service binary overwrite, and SYSTEM shell delivery via token manipulation. Log sources covered include Sysmon (pipe creation, file events, process creation, registry), Windows Security (process creation), and endpoint file monitoring.

### Sigma Rules

All Sigma rules validated with `sigma check`: 0 errors, 0 condition errors, 0 issues.

#### Rule 1: Redsun Named Pipe Creation
<!-- Validated -->
```yaml
title: Redsun PoC Named Pipe Creation
id: a1f3b7c2-9d4e-4f8a-b6c1-2e5d8f3a7b9c
status: experimental
description: Detects creation of the REDSUN named pipe used by the Nightmare-Eclipse Redsun privilege escalation PoC
references:
    - https://github.com/Nightmare-Eclipse/Redsun
author: Actioner Research
date: 2026-04-17
tags:
    - attack.privilege-escalation
    - attack.t1068
logsource:
    product: windows
    category: pipe_created
detection:
    selection:
        PipeName|endswith: '\REDSUN'
    condition: selection
falsepositives:
    - Unknown
level: critical
```

#### Rule 2: TieringEngineService.exe Dropped to System32
<!-- Validated -->
```yaml
title: Redsun TieringEngineService.exe Dropped to System32
id: b2c4d8e5-3f6a-4b9c-8d7e-1a5f9c2b6d3e
status: experimental
description: Detects creation of TieringEngineService.exe in System32 by a non-standard process, indicative of the Redsun exploit chain overwriting system binaries
references:
    - https://github.com/Nightmare-Eclipse/Redsun
author: Actioner Research
date: 2026-04-17
tags:
    - attack.privilege-escalation
    - attack.t1068
    - attack.defense-evasion
    - attack.t1036
logsource:
    product: windows
    category: file_event
detection:
    selection:
        TargetFilename|endswith: '\Windows\System32\TieringEngineService.exe'
    filter:
        Image|endswith: '\TiWorker.exe'
    condition: selection and not filter
falsepositives:
    - Legitimate Windows servicing operations
level: high
```

#### Rule 3: Suspicious Cloud Sync Root Registration (SERIOUSLYMSFT)
<!-- Validated -->
```yaml
title: Redsun Cloud Sync Root Registration in Temp Directory
id: c3d5e9f6-4a7b-5c0d-9e8f-2b6a0d3c7e4f
status: experimental
description: Detects suspicious cloud file sync root registration from a temp directory, a technique used by Redsun to trigger Windows Defender file rewrite behavior
references:
    - https://github.com/Nightmare-Eclipse/Redsun
author: Actioner Research
date: 2026-04-17
tags:
    - attack.privilege-escalation
    - attack.t1068
    - attack.defense-evasion
    - attack.t1564
logsource:
    product: windows
    category: registry_set
detection:
    selection:
        TargetObject|contains|all:
            - '\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\SyncRootManager'
            - 'SERIOUSLYMSFT'
    condition: selection
falsepositives:
    - Unknown
level: critical
```

#### Rule 4: Directory Junction to System32 from Temp Directory
<!-- Validated -->
```yaml
title: Redsun Directory Junction to System32 from Temp Directory
id: d4e6f0a7-5b8c-6d1e-0f9a-3c7b1e4d8f5a
status: experimental
description: Detects creation of a directory junction (mount point reparse) from a temp directory targeting System32, a key step in the Redsun privilege escalation exploit
references:
    - https://github.com/Nightmare-Eclipse/Redsun
author: Actioner Research
date: 2026-04-17
tags:
    - attack.privilege-escalation
    - attack.t1068
    - attack.defense-evasion
    - attack.t1222
logsource:
    product: windows
    category: process_creation
detection:
    selection:
        CommandLine|contains|all:
            - 'mklink'
            - '/J'
            - '\Windows\System32'
        CommandLine|contains:
            - '\Temp\'
            - '\AppData\Local\Temp\'
    condition: selection
falsepositives:
    - Developer tools creating junctions in temp directories
level: high
```

#### Rule 5: Storage Tiers Management Service Abuse: conhost.exe Spawn
<!-- Validated -->
```yaml
title: Redsun Storage Tiers Management Service Abuse
id: e5f7a1b8-6c9d-7e2f-1a0b-4d8c2f5e9a6b
status: experimental
description: Detects conhost.exe being spawned by TieringEngineService.exe, indicating Redsun SYSTEM-level privilege escalation via Storage Tiers Management service hijack
references:
    - https://github.com/Nightmare-Eclipse/Redsun
author: Actioner Research
date: 2026-04-17
tags:
    - attack.privilege-escalation
    - attack.t1068
    - attack.execution
    - attack.t1106
logsource:
    product: windows
    category: process_creation
detection:
    selection:
        ParentImage|endswith: '\TieringEngineService.exe'
        Image|endswith: '\conhost.exe'
    condition: selection
falsepositives:
    - Unknown
level: critical
```

### YARA Rule

#### Rule 6: Redsun PoC Binary Detection
<!-- Validated -->
```yara
rule Redsun_PoC_Exploit {
    meta:
        description = "Detects the Nightmare-Eclipse Redsun Windows Defender privilege escalation PoC"
        author = "Actioner Research"
        date = "2026-04-17"
        reference = "https://github.com/Nightmare-Eclipse/Redsun"
        severity = "critical"

    strings:
        $pipe = "\\??\\pipe\\REDSUN" wide ascii
        $provider = "SERIOUSLYMSFT" wide
        $msg1 = "The sun is shinning" ascii wide
        $msg2 = "The red sun shall prevail" ascii wide
        $tiereng = "TieringEngineService.exe" wide
        $eicar_rev = "*H+H$!ELIF-TSET-SURIVITNA-DRADNATS-RACIE$" ascii
        $cloud_api1 = "CfRegisterSyncRoot" ascii
        $cloud_api2 = "CfCreatePlaceholders" ascii
        $cloud_api3 = "CfConnectSyncRoot" ascii
        $target_path = "\\Windows\\System32" wide

    condition:
        uint16(0) == 0x5A4D and
        filesize < 500KB and
        (
            ($pipe and $provider) or
            ($eicar_rev and $tiereng) or
            ($msg1 and $msg2) or
            (3 of ($cloud_api*) and $tiereng) or
            ($pipe and $tiereng and $target_path)
        )
}
```

---

## Sources

- [Nightmare-Eclipse/Redsun GitHub Repository](https://github.com/Nightmare-Eclipse/Redsun) — Primary source; full PoC source code and README
- [Microsoft Cloud Files API Documentation](https://learn.microsoft.com/en-us/windows/win32/api/cfapi/) — Reference for CfRegisterSyncRoot, CfCreatePlaceholders, CfConnectSyncRoot APIs
- [Microsoft FSCTL_SET_REPARSE_POINT Documentation](https://learn.microsoft.com/en-us/windows/win32/api/winioctl/ni-winioctl-fsctl_set_reparse_point) — Reference for NTFS junction/reparse point creation
- [MITRE ATT&CK - T1068: Exploitation for Privilege Escalation](https://attack.mitre.org/techniques/T1068/) — Primary technique classification
- [MITRE ATT&CK - T1574.010: Hijack Execution Flow: Services File Permissions Weakness](https://attack.mitre.org/techniques/T1574/010/) — Service binary overwrite technique

---

*Report generated by Actioner Research — 2026-04-17*
