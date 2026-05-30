# Log-Source Encoding & Field Semantics (detection correctness)

`sigma check` / `sigma convert` prove a rule is **syntactically valid**; they do NOT prove the field **values** use the representation the source actually emits, nor that the field **names** exist in the target schema. Those are the bugs that pass every compile check and still never fire. Consult this before writing detection values, and lint against it before finalizing.

---

## auditd (Linux) — THE common trap: numeric fields are HEX

auditd writes syscall arguments and several numeric fields in **hexadecimal, no `0x` prefix**: `a0` `a1` `a2` `a3` (syscall args), often `exit` and `syscall`, and `saddr` (a hex-encoded sockaddr). A value you know in decimal must be converted to hex **for the detection**.

Example that bites: `AF_ALG` = 38 decimal = **`a0=26`** in the log. A rule matching `a0: '38'` matches `0x38` = 56 (a *different* family) and never fires for AF_ALG.

Common socket families (decimal → auditd `a0` hex):

| Family | decimal | auditd `a0` (hex) |
|---|---|---|
| AF_UNIX | 1 | `1` |
| AF_INET | 2 | `2` |
| AF_INET6 | 10 | `a` |
| AF_NETLINK | 16 | `10` |
| AF_PACKET | 17 | `11` |
| AF_ALG | 38 | `26` |

**Capture-vs-detect consistency:** `auditctl -F a0=38` (a capture/audit *rule*) uses **decimal** — the kernel compares decimal. The *logged record* is **hex** (`a0=26`). So a capture snippet and the detection that consumes it legitimately show **different** values (38 vs 26). If a report includes both, they must NOT be equal — if they are, one is wrong.

**`saddr` strings are hex too — not just numbers.** `saddr` is the *whole* `sockaddr` blob hex-encoded, so any **ASCII string fields inside it** are emitted as hex digit pairs, not literal text. For `AF_ALG`, the `sockaddr_alg` carries `salg_type` / `salg_name` as ASCII — but `saddr|contains 'aead'` never matches, because the record holds `61656164` (the hex of `aead`), not the substring `aead`. Convert the ASCII to hex for the detection: `aead` → `61656164`, `authencesn` → `61757468656e6365736e`. (Same trap, string flavor: a `|contains` on a hex-encoded field with an ASCII needle compiles and never fires.)

> If you deliberately target a pipeline that normalizes `a0` to decimal, say so in a rule comment — the default raw auditd record is hex.

## Sysmon (Windows) / Sysmon-for-Linux

Field names are specific and case-sensitive in raw logs: `Image`, `OriginalFileName`, `CommandLine`, `ParentImage`, `ParentCommandLine`, `TargetFilename`, `ImageLoaded`, `Hashes`, `DestinationIp`, `QueryName`. EventID selects the operation (1 process_creation, 3 network, 7 image_load, 11 file_create, 13 registry, 22 dns). Prefer `OriginalFileName` (PE metadata, rename-resistant) over `Image` alone for process detection.

## Windows Security (EVTX)

EventID + channel-specific field names (`SubjectUserName`, `TargetUserName`, `LogonType`, `IpAddress`, `ProcessName`). 4688 command-line requires the audit policy enabled *and* the `CommandLine` field.

## Field NAME vs pipeline

`sigma convert --without-pipeline` passes field names through **unmapped** — proves syntax only; a typo'd or product-wrong field name still "converts." Converting **with the matching product pipeline** maps names to the backend schema and **fails on unknown fields** — use it where one exists (see rule-gen Step 3).

## Rules use REAL values — never defanged

Detection rules match the **real** indicator (`evil.com`, `https://…`). Defanging (`evil[.]com`, `hxxps://`) is for the **report prose only**. A rule containing a defanged value never fires.

---

## Lint checklist (apply before finalizing)

- [ ] auditd numeric arg / exit / family comparisons are **hex**, not decimal.
- [ ] auditd `saddr` string matches use the **hex** of the ASCII needle (e.g. `aead` → `61656164`), not the literal text — `saddr` is a hex-encoded blob.
- [ ] any `auditctl` / capture snippet (decimal) is **intentionally** different from the detection (hex), not an accidental copy.
- [ ] field names match the product schema (or a pipeline maps them); prefer `OriginalFileName` over `Image` alone.
- [ ] string values reflect how the source emits them (full path vs basename, case) and are **not defanged**.
