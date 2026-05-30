---
name: rule-gen
description: "Generate and validate detection rules (Sigma, YARA, Snort, Suricata) from a threat analysis. Default altitude is PoC/advisory-specific; behavioral TTP layer is opt-in. Compiles each rule (sigma check, yarac, snort -T, suricata -T) and proves Splunk/CrowdStrike portability via sigma convert, retries ≤3, labels it compile-status × confidence. Skips generic advisories with no concrete artifacts. Use after IOCs and TTPs are extracted."
---

# Skill: Rule Generator

Generation, validation, and assembly of Sigma, YARA, Snort, and Suricata detection rules from a threat analysis. Rules are written to be **production-ready and portable** — they must compile and convert cleanly to Splunk and CrowdStrike — and each is labeled with an honest two-axis status (**compile-status × confidence**).

## When to Use

Invoke after a topic summary has been produced (or updated). The input is a completed topic summary, plus the caller's **altitude** and **leniency** preferences and an optional **output sink** (a connected GitHub repo path). Output: rules appended to the summary's `## Detection Rules` section; **and**, when a sink is configured, standalone rule files under `rules/`.

### Parameters the caller passes
- **altitude** — `specific` (default) | `ttp` | `both`. *What the rule keys on.*
- **leniency** — `strict` (default) | `loose`. *How tightly it matches at that altitude.*
- **output sink** — a repo/output path if persistence is configured; otherwise summary-only.

---

## Step 0: Viability gate — don't waste tokens on non-detections

Before generating anything, judge whether the source can yield a **production-ready** detection. It can if it provides **concrete, distinctive artifacts**: specific strings, hashes, command lines, file/registry paths, network indicators (from a PoC *or* an advisory), or a precise behavioral chain.

If all you have is a **generic advisory** — "update to the latest version," a CVSS score, an affected-product name, with **no** specific indicators or behavior — **do not generate rules.** A broad rule on a generic advisory is noise, not a detection. Instead, record one line in the summary's `## Detection Rules` section:

```markdown
**No production-ready detection.** The source describes the issue but provides no concrete, distinctive artifacts (generic advisory). Generating a rule here would be broad and false-positive-prone. Re-run if a PoC or IOC list is published.
```

Then stop. (The `critic` applies a stricter version of this gate after generation; this cheap upstream check saves the generation tokens.)

---

## Step 1: Determine Applicable Rule Types

Read the topic summary and decide which rule types to generate:

| Rule Type | When to Generate | Indicators to Look For |
|-----------|-----------------|----------------------|
| **Sigma** | Almost always — any host/behavioral indicators | Process creation, registry, scheduled tasks, network connections, DNS, auth events, file events, cloud audit logs, web logs |
| **Snort** | Network indicators present | IPs, domains, URLs, HTTP request patterns, DNS patterns, TLS anomalies, C2 patterns |
| **Suricata** | Network indicators present (esp. TLS/JA3/cert IOCs) | Same as Snort, plus JA3/JA4 fingerprints, TLS cert fingerprints, dataset bulk-IOC matching, SSH/SMTP/QUIC |
| **YARA** | File-level indicators only | Malware samples, string patterns, byte sequences, PE anomalies, embedded configs |
| **None** | Generic intel with no technical indicators | Caught by Step 0 — say so, don't invent rules |

**Portability principle:** **Sigma is the portable lingua franca** — it converts to Splunk and CrowdStrike, so it is the preferred format for host/log detections. Prefer Sigma; add Snort/Suricata when network indicators are present (generate both — many orgs run one or the other); use YARA only for file-level cues.

---

## Step 2: Load Reference Docs and Generate Rules (altitude-driven)

For each applicable type, load the reference doc alongside the summary:

- **Sigma:** `${CLAUDE_PLUGIN_ROOT}/skills/rule-gen/refs/sigma-spec.md`
- **YARA:** `${CLAUDE_PLUGIN_ROOT}/skills/rule-gen/refs/yara-ref.md`
- **Snort:** `${CLAUDE_PLUGIN_ROOT}/skills/rule-gen/refs/snort-ref.md`
- **Suricata:** `${CLAUDE_PLUGIN_ROOT}/skills/rule-gen/refs/suricata-ref.md`

**Always also load `${CLAUDE_PLUGIN_ROOT}/skills/rule-gen/refs/logsource-encoding.md`** and write detection **values** in the representation the target log source actually emits — e.g. auditd syscall args/families are **hex** (`AF_ALG` is `a0=26`, not `38`), and rules use **real** values (never defanged; defanging is for the report prose only). Compile/convert will not catch a wrong value encoding — this is a generation-time correctness step.

Generate according to **altitude**:

- **`specific` (default — PoC/advisory-specific):** key on the artifact's distinctive, concrete features — exact strings, hashes, command-line fragments, specific paths, specific network indicators — taken from the PoC when one exists, otherwise from the advisory's specific indicators. High precision, low false-positive rate, immediate coverage.
- **`ttp` (opt-in — behavioral):** key on adversary behavior (process chains, persistence mechanisms, C2 protocol patterns). Higher recall and more durable, but inherently broader — efficacy can't be proven without telemetry, so confidence maxes at *medium* (usually *low*).
- **`both`:** produce a `specific` layer **and** a separate, clearly labeled `ttp` layer.

Apply **leniency**: `strict` (default) matches tightly at the chosen altitude; `loose` broadens matching — use only when the caller asks, and reflect the higher false-positive risk in the confidence label.

**Write for portability (every rule):** use standard, normalized field names from the reference docs; keep detection logic crisp and self-contained; avoid backend-specific hacks. A reviewer should be able to hand-port the rule to Splunk SPL or CrowdStrike with minimal edits.

### Required Fields per Rule Type

**Sigma:** `title`; `id` (valid UUID v4); `status: experimental`; `description`; `references` (URLs from the summary's Sources); `author: Actioner`; `date` (YYYY/MM/DD); `tags` (MITRE ATT&CK **technique/sub-technique only** — `attack.t1059`, `attack.t1059.001`; **never tactic tags** like `attack.execution` — they add no detection value and several trip the pySigma `InvalidATTACKTagIssue` validator); `logsource` (`category`/`product`, optional `service`); `detection` (`selection`, optional `filter`, `condition`); `level` (informational|low|medium|high|critical).

**YARA:** `meta` (`description`, `author = "Actioner"`, `date`, `reference`, `hash` if available); `strings` (with modifiers — `ascii`, `wide`, `nocase`, `fullword`); `condition` (logical combination, optional `filesize`/PE checks).

**Snort:** `alert` action; protocol (`tcp`/`udp`/`http`/`dns`/`tls`); vars (`$HOME_NET`, `$EXTERNAL_NET`, `$HTTP_PORTS`, `$DNS_PORTS`); `msg`; `content` with modifiers/sticky buffers; `flow` (e.g. `established,to_server`); `sid` in 2100000+; `rev:1`; `classtype`; `reference`.

**Suricata:** `alert` action; protocol (`tcp`/`udp`/`http`/`dns`/`tls`/`ssh`/`smtp`); vars as above; `msg` prefixed `"Actioner - "`; `content` with **dot-notation** sticky buffers (`http.uri`, NOT `http_uri`); `flow`; `sid` in 2200000+; `rev:1`; `classtype`; `reference`; `metadata: author Actioner, created_at YYYY-MM-DD`; for TLS/JA3 use `ja3.hash`/`ja3s.hash`/`tls.cert_fingerprint`/`tls.sni`; for bulk IOCs consider `dataset`.

---

## Step 3: Validate Each Rule (compile + portability)

**Write each rule to a temp file with the Write tool — not a shell heredoc.** This is deliberate: the only shell commands the pipeline runs are the four validators themselves, so a tight, legible permission allowlist (`Bash(sigma:*)`, `Bash(yarac:*)`, `Bash(snort:*)`, `Bash(suricata:*)`) covers everything — no blanket `Bash`. Compilation is the hard oracle; for Sigma, conversion to Splunk and CrowdStrike is the portability oracle.

**All four formats are compile-checked with equal rigor** — Snort and Suricata via their own compilers, exactly like Sigma and YARA; none is "optional" or structural-only by default. `/actioner:setup` installs all four.

Write each rule to `/tmp/actioner/<slug>.<ext>` (Write tool), then run only its validator:

### Sigma — compile, prove portability, and (where possible) schema-map
```bash
sigma check /tmp/actioner/<slug>.yml                              # syntax / schema

# (1) Portability / syntactic validity — BOTH must exit 0. NOTE: --without-pipeline passes field
#     names through UNMAPPED, so this proves the rule is VALID, not that fields match a real schema.
#     CrowdStrike's target id is `log_scale` (run `sigma list targets`: expect `splunk`, `log_scale`).
sigma convert --without-pipeline -t splunk    /tmp/actioner/<slug>.yml
sigma convert --without-pipeline -t log_scale /tmp/actioner/<slug>.yml

# (2) Schema mapping (best-effort) — where a pipeline fits the rule's product, convert WITH it:
#     it maps field names to the backend and FAILS on unknown fields, catching name errors (1) can't.
#     `sigma list pipelines` shows options (e.g. -p sysmon). No fitting pipeline → skip (2).
sigma convert -p <pipeline> -t splunk /tmp/actioner/<slug>.yml    # e.g. -p sysmon, when applicable
```
(1) must exit 0 for both targets (else not portable — fix, or keep and note the failing target, lowering confidence). (2) is best-effort: a clean pipeline conversion upgrades the claim from *syntactically valid* to *schema-mapped*; no fitting pipeline is fine — just don't overclaim.

**Encoding lint (consult `refs/logsource-encoding.md`).** Neither (1) nor (2) checks field **values**. Before finalizing, verify values use the source's representation — e.g. **auditd numeric args/families are hex** (`AF_ALG` → `a0=26`, never `38`), capture (`auditctl`, decimal) is intentionally ≠ detection (hex), and values are real, not defanged. This value-encoding class has **no runtime oracle here**, so it is a generation-time check; the critic re-checks it.

### YARA — compile, then sample-test (the one real efficacy oracle)
```bash
yarac /tmp/actioner/<slug>.yar /dev/null      # exit 0 = compiles
```
YARA is the only type with a cheap, real efficacy oracle — `yara` actually matches files. When the source gives a distinctive **string** artifact (kill-switch strings, build-script strings — common at PoC/advisory altitude), ground a positive and test fire/quiet:
```bash
# pos: a file carrying the source's exact PUBLISHED string(s); neg: a benign counterpart (both via Write tool)
yara /tmp/actioner/<slug>.yar /tmp/actioner/pos.txt    # must MATCH (prints the rule name)
yara /tmp/actioner/<slug>.yar /tmp/actioner/neg.txt    # must NOT match (no output)
```
Fired-on-positive **and** quiet-on-negative → mark the rule **sample: fired ✓**. The positive must come from the source's **published** signature, never invented to match your own rule (that proves nothing). Notes: string/ascii signatures test cleanly with the Write tool + `yara`; pure **byte**-signature rules need a byte writer (`printf`/`xxd`, not in the default allowlist) to build `pos.bin` — either add `Bash(printf:*)` for the test or leave the rule **compile-only** and rely on the published signature's provenance.

### Snort — forced compile check
Find the snort config with **Glob/Read** (no shell discovery): check `/etc/snort/snort.lua` and `/opt/homebrew/**/snort.lua`; use the first that exists as `<snort.lua>`.
```bash
# Use -R to LOAD the rules file. NOTE: --rule-path only sets an include search path and
# will NOT validate the file (it exits 0 even on a broken rule) — always use -R.
snort -c <snort.lua> -R /tmp/actioner/<slug>.rules -T   # exit 0 = valid; non-zero = rule error
```

### Suricata — forced compile check
```bash
suricata -T -S /tmp/actioner/<slug>.rules -l /tmp/actioner   # exit 0 = valid
```

**Toolchain absent (setup not completed):** a single, *uniform* fallback across all four formats — do a structural sanity check, produce the rule, label it `⚠️ uncompiled (structural check only)`, and tell the caller `/actioner:setup` installs the full toolchain (sigma-cli + Splunk/CrowdStrike backends + yara + snort + suricata). **There is no per-format opt-out:** whenever a format's compiler is present, its compile check is mandatory — Snort and Suricata included.

---

## Step 4: Retry on Validation Failure

If a rule fails to compile or convert: capture the full error, feed it back with the original rule, fix the specific issue, re-validate. **Max 3 attempts total** (1 generation + 2 retries). On each retry include the error, the offending field/line, and the relevant reference-doc section.

---

## Step 5: Status — two axes (compile-status × confidence)

Label **every** rule on both axes.

- **compile-status:**
  - ✅ **compiles** — the tool exited 0 (and, for Sigma, converted to both Splunk and CrowdStrike).
  - ⚠️ **uncompiled** — failed after 3 attempts, or the toolchain was absent (structural check only). **Keep the rule**; include the last error as an HTML comment. Never silently drop.
- **confidence** — your self-assessed estimate of precision / production-readiness. **It is an estimate, not a tested result** (we don't assume the user has the sample + Splunk/EDR telemetry to fire it):
  - **high** — keys on highly distinctive artifacts unlikely to appear in benign activity (unique strings/hashes, specific command-line combinations); strict matching; minimal false-positive risk.
  - **medium** — specific but with some benign-overlap risk, or advisory-only with no sample to corroborate.
  - **low** — behavioral/TTP cues or broad matching; recall-oriented; needs environment tuning before production. **Every TTP rule is at most medium (usually low) — never high.**

Both axes appear on each rule (see format below). A `specific` rule can reach *compiles + high*; a `ttp` rule maxes at *compiles + medium*.

**Efficacy tag (short).** Optional third tag, only for YARA that was sample-tested (Step 3): `sample: fired ✓` (real grounded positive) · `sample: constructed` (PoC-style input, not a confirmed upstream sample). Omit it for everything else (no tag = generation-validated only, not run against data — never imply it "fired"). The reason/provenance goes in the rule's `<!-- audit: … -->` comment, **not** the status line.

---

## Step 6: Assemble and Persist

**Always** append rules to the summary's `## Detection Rules` section (replace the placeholder `<!-- PLACEHOLDER: ... -->`). **Additionally, when an output sink/path is configured**, write standalone files so the repo is pipeline-consumable:

- `rules/sigma/<slug>.yml`
- `rules/yara/<slug>.yar`
- `rules/snort/<slug>.rules`
- `rules/suricata/<slug>.rules`

where `<slug>` is the report slug (`YYYY-MM-DD-<topic-slug>`); if there are multiple rules of one type, suffix `-1`, `-2`, or a short descriptor. **No sink configured → summary only** (do not scatter files in the working tree).

### Rule format in the summary — keep it READABLE

**Length discipline (hard requirement).** A detection report is read by busy responders. Per rule: **one sentence** of what-it-detects (two only if truly needed), the status line, the rule. **At most one** short caveat line — and only if it's load-bearing for safe use ("hunt-only; pair with the anchor", "scope to source trees, not your doc store"). **Everything else — validation exits, encoding fixes, revision rationale, provenance, FP/evasion analysis — goes in a single `<!-- audit: … -->` comment**: it keeps the rigor for anyone reading raw markdown but stays out of the rendered report. No multi-paragraph caveats, no numbered "Caveat 1/2/3" essays.

```markdown
### [RuleType]: [short title]
[One sentence: what it detects + the distinctive cue.] [≤1 short caveat, only if load-bearing.]
**Status:** compile ✅ compiles · confidence: medium[ · sample: fired ✓]
<!-- audit: sigma check 0; splunk/log_scale 0. saddr hex → matched 61656164/61757468656e6365736e (aead/authencesn). capture a0=38 decimal ≠ detect a0=26 hex (intentional). <terse provenance / FP / evasion detail here> -->
```[language]
<rule content>
```​
```
`[language]`: `yaml` (Sigma), `yara`, `snort`, `suricata`. **Uncompiled rule:** same shape with `compile ⚠️ uncompiled`, validator error inside the `<!-- audit: … -->` comment. **Not applicable:** `### [RuleType]: N/A` + one line why.

**Ordering:** Sigma first, then Snort, Suricata, YARA. If the `## Detection Rules` section opens with a summary, keep it to **2–3 sentences** (what the rules cover + the one caveat that matters, e.g. "compiles ≠ fires — verify in your pipeline"), not a paragraph.

> These labels are the rule generator's self-assessment; the `critic` reviews them — and also flags any rule whose prose has bloated into a wall of text (it belongs in the audit comment).

---

## Example Output

```markdown
## Detection Rules

These detections target certutil-based download activity from the campaign. PoC/advisory-specific (default altitude); the Sigma rule converts cleanly to Splunk and CrowdStrike.

### Sigma: Suspicious certutil Download Activity
Detects certutil.exe abuse for downloading files from external URLs (living-off-the-land).
**Status:** compile ✅ compiles · confidence: high
```yaml
title: Suspicious certutil Download Activity
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
status: experimental
description: Detects certutil.exe abuse for file download consistent with the observed campaign
references:
    - https://blog.talosintelligence.com/example-report
author: Actioner
date: 2026/05/29
tags:
    - attack.t1105
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\certutil.exe'
        CommandLine|contains|all:
            - 'urlcache'
            - '-split'
    condition: selection
falsepositives:
    - Legitimate certificate management operations
level: high
```​

### Snort: HTTP C2 Beacon with Custom User-Agent
Detects outbound HTTP with the campaign's known malicious User-Agent.
**Status:** compile ✅ compiles · confidence: high
```snort
alert http $HOME_NET any -> $EXTERNAL_NET $HTTP_PORTS (
    msg:"CAMPAIGN C2 Beacon - Custom User-Agent";
    flow:established,to_server;
    content:"Mozilla/5.0 (Compatible; MSIE 9.0; Update Service)"; http_header; fast_pattern;
    sid:2100001; rev:1;
    classtype:trojan-activity;
    reference:url,blog.talosintelligence.com/example-report;
)
```​

### Suricata: TLS C2 Beacon with JA3 Fingerprint
Detects TLS connections matching a known malicious JA3 hash and suspicious SNI.
**Status:** compile ✅ compiles · confidence: medium
```suricata
alert tls $HOME_NET any -> $EXTERNAL_NET any (
    msg:"Actioner - TLS C2 Beacon with Known JA3 Hash";
    flow:established,to_server;
    ja3.hash; content:"e7d705a3286e19ea42f587b344ee6865";
    tls.sni; content:".top"; endswith;
    classtype:trojan-activity;
    reference:url,blog.talosintelligence.com/example-report;
    metadata:author Actioner, created_at 2026-05-29;
    sid:2200001; rev:1;
)
```​

### YARA: N/A
No file-level indicators suitable for YARA detection in this topic.
```
