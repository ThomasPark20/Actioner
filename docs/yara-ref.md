# YARA Rule Reference

> Concise reference for generating valid YARA detection rules. Loaded into the Rule Generator Agent's context alongside topic summaries. Focus: CTI-derived file indicators — malware strings, byte sequences, PE characteristics.

## Rule Structure

Every YARA rule follows this structure:

```yara
rule Rule_Name : optional_tag1 optional_tag2
{
    meta:
        description = "What this rule detects"
        author = "Actioner"
        date = "YYYY-MM-DD"
        reference = "https://source-url"
        hash = "SHA256 of known sample (if available)"
        tlp = "WHITE"
        severity = "high"

    strings:
        $s1 = "text string"
        $h1 = { DE AD BE EF }
        $r1 = /regex pattern/

    condition:
        uint16(0) == 0x5A4D and 2 of ($s*)
}
```

**Naming convention:** Use `PascalCase_With_Underscores`. Prefix with threat context: `APT_GroupName_Backdoor`, `Malware_FamilyName_Loader`, `Exploit_CVE_2024_XXXXX`.

## Meta Section

| Field | Required | Description |
|---|---|---|
| `description` | Yes | What the rule detects and why |
| `author` | Yes | Always `"Actioner"` for generated rules |
| `date` | Yes | Creation date `YYYY-MM-DD` |
| `reference` | Yes | Source URL from the topic summary |
| `hash` | No | SHA256 of a known sample, if available in the summary |
| `tlp` | No | Traffic Light Protocol: `WHITE`, `GREEN`, `AMBER`, `RED` |
| `severity` | No | `low`, `medium`, `high`, `critical` |

## Strings Section

### Text Strings

```yara
strings:
    $plain   = "CreateRemoteThread"
    $wide    = "cmd.exe /c" wide          // UTF-16 LE encoding
    $nocase  = "powershell" nocase        // Case-insensitive
    $full    = "malware.exe" fullword     // Match whole word only
    $combo   = "beacon" ascii wide nocase // Multiple modifiers
    $b64     = "eval(" base64             // Match base64-encoded form
    $xor     = "secret_key" xor(0x00-0xFF) // Match XOR-encoded with any single-byte key
    $private = "internal" private         // Don't report in output
```

**Modifiers (append after the string):**

| Modifier | Effect |
|---|---|
| `ascii` | Match ASCII encoding (default) |
| `wide` | Match UTF-16 LE encoding |
| `nocase` | Case-insensitive matching |
| `fullword` | Match only if delimited by non-alphanumeric chars |
| `base64` | Match base64-encoded form of the string |
| `base64wide` | Match base64-encoded form in UTF-16 LE |
| `xor` | Match XOR-encoded with single-byte keys; `xor(0x01-0xFF)` excludes plaintext |
| `private` | String is used in condition but not reported in scan output |

### Hex Strings (Byte Patterns)

```yara
strings:
    $hex1 = { 4D 5A 90 00 }              // Exact bytes
    $hex2 = { 4D 5A ?? 00 }              // ?? = any single byte (wildcard)
    $hex3 = { 4D 5A [2-4] 00 }           // [2-4] = 2 to 4 arbitrary bytes (jump)
    $hex4 = { 4D 5A ( 90 00 | 00 00 ) }  // Alternation (OR)
    $hex5 = { ~4D 5A }                   // ~XX = NOT this byte
```

### Regular Expressions

```yara
strings:
    $re1 = /https?:\/\/[a-z0-9\-\.]+\.(ru|cn|top)\//
    $re2 = /[A-Za-z0-9+\/]{40,}={0,2}/ nocase  // Base64 blob
```

Regex supports: `.`, `*`, `+`, `?`, `|`, `()`, `[]`, `{}`, `\d`, `\w`, `\s`, `\b`, `^`, `$`. Modifiers `nocase` and `ascii`/`wide` can be appended.

## Condition Section

### Basic Operators

```yara
condition:
    $s1 and $s2               // Both strings present
    $s1 or $s2                // Either string present
    not $s1                   // String absent
    any of ($s*)              // Any string matching $s* prefix
    all of ($s*)              // All strings matching $s* prefix
    2 of ($s1, $s2, $s3)     // At least 2 of the listed strings
    3 of them                 // At least 3 of ALL defined strings
    #s1 > 5                   // String $s1 occurs more than 5 times
    @s1 < 0x100              // First occurrence of $s1 is before offset 0x100
```

### File Properties

```yara
condition:
    filesize < 5MB                    // File size constraint
    filesize > 100KB and filesize < 2MB
    uint16(0) == 0x5A4D              // MZ header (PE file)
    uint32(0) == 0x464C457F          // ELF header
    uint32(0) == 0xBEBAFECA          // Mach-O fat binary
```

### Combining Conditions

```yara
condition:
    uint16(0) == 0x5A4D and          // Is a PE file
    filesize < 1MB and               // Size constraint
    (2 of ($api*) and 1 of ($str*))  // String matching
```

### Set Operations

```yara
condition:
    for any of ($s*) : (@ > 0x1000 and @ < 0x2000)  // Any $s* string found in offset range
    for all of ($s*) : (# > 2)                        // All $s* strings appear more than twice
```

## PE Module

Import the PE module for Windows executable analysis:

```yara
import "pe"

rule Example_PE_Check
{
    condition:
        pe.is_pe and
        pe.number_of_sections > 5 and
        pe.imports("kernel32.dll", "VirtualAllocEx") and
        pe.imports("kernel32.dll", "WriteProcessMemory")
}
```

**Common PE module functions and fields:**

| Usage | Description |
|---|---|
| `pe.is_pe` | File is a valid PE |
| `pe.imports("dll", "func")` | PE imports the specified function |
| `pe.exports("func")` | PE exports the specified function |
| `pe.number_of_sections` | Section count |
| `pe.sections[i].name` | Name of section at index i |
| `pe.entry_point` | Entry point RVA |
| `pe.characteristics` | PE characteristics flags |
| `pe.dll_characteristics` | DLL characteristics flags |
| `pe.timestamp` | Compilation timestamp |
| `pe.machine` | Target machine (e.g., `pe.MACHINE_AMD64`) |
| `pe.number_of_resources` | Resource count |

## Validation

Compile-check generated rules:

```bash
yarac rule.yar /dev/null
```

Exit code 0 = valid. Non-zero = syntax error. Capture stderr for error details on failure.

## Example Rules

### 1. Malware Detection by Strings (Cobalt Strike Beacon)

```yara
rule Malware_CobaltStrike_Beacon_Strings
{
    meta:
        description = "Detects Cobalt Strike beacon via characteristic strings"
        author = "Actioner"
        date = "2026-04-01"
        reference = "https://example.com/cobalt-strike-analysis"
        severity = "critical"

    strings:
        $s1 = "%s.4444" ascii
        $s2 = "beacon.dll" ascii wide
        $s3 = "%s (admin)" ascii
        $s4 = "ReflectiveLoader" ascii fullword
        $cfg1 = "sleeptime" ascii
        $cfg2 = "publickey" ascii

    condition:
        uint16(0) == 0x5A4D and
        filesize < 2MB and
        (3 of ($s*) or all of ($cfg*))
}
```

### 2. PE Structure Anomaly (Process Injection Imports)

```yara
import "pe"

rule Technique_Process_Injection_PE_Imports
{
    meta:
        description = "Detects PE files importing common process injection API chain"
        author = "Actioner"
        date = "2026-04-01"
        reference = "https://example.com/injection-technique"
        severity = "high"

    condition:
        pe.is_pe and
        pe.imports("kernel32.dll", "VirtualAllocEx") and
        pe.imports("kernel32.dll", "WriteProcessMemory") and
        (
            pe.imports("kernel32.dll", "CreateRemoteThread") or
            pe.imports("ntdll.dll", "NtCreateThreadEx")
        )
}
```

### 3. Hex Pattern Detection (Shellcode Loader)

```yara
rule Malware_Shellcode_Loader_XOR_Stub
{
    meta:
        description = "Detects common XOR decryption stub used by shellcode loaders"
        author = "Actioner"
        date = "2026-04-01"
        reference = "https://example.com/shellcode-analysis"
        hash = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
        severity = "high"

    strings:
        // XOR decryption loop pattern: mov ecx, len; xor byte ptr [edx+ecx], key; loop
        $xor_stub = { 8B 0D ?? ?? ?? ?? 80 34 0A ?? E2 FA }

        $api1 = "VirtualAlloc" ascii fullword
        $api2 = "VirtualProtect" ascii fullword
        $api3 = "RtlMoveMemory" ascii fullword

        $str1 = "payload" ascii nocase
        $str2 = "shellcode" ascii nocase

    condition:
        uint16(0) == 0x5A4D and
        filesize < 500KB and
        $xor_stub and
        1 of ($api*) and
        1 of ($str*)
}
```
