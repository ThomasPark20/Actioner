# Suricata Rule Reference

> Concise reference for generating valid Suricata detection rules. Loaded into the Rule Generator Agent's context alongside topic summaries.

## Rule Format

Suricata rules follow the same general structure as Snort rules — a single logical line with header and options:

```
action protocol source_ip source_port direction dest_ip dest_port (options;)
```

Example skeleton:

```
alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"Example rule"; content:"badstring"; sid:1000001; rev:1;)
```

> **Suricata vs Snort 3:** Suricata shares most keywords with Snort 3 but uses **dot-notation** sticky buffers (`http.uri` instead of `http_uri`), supports additional protocols (`tls`, `ssh`, `smtp`, `dnp3`, `modbus`, `nfs`, `krb5`, `mqtt`, `rfb`, `quic`), and has unique keywords like `ja3.hash`, `ja3s.hash`, `ja4.hash`, `tls.cert_fingerprint`, and `dataset`.

## Header Fields

### Actions

| Action | Description |
|---|---|
| `alert` | Generate an alert and log. **Default for detection rules.** |
| `pass` | Stop further inspection (whitelist) |
| `drop` | Drop packet and generate alert (IPS mode) |
| `reject` | Send RST/ICMP unreachable, drop, and alert |

### Protocols

| Protocol | Use when |
|---|---|
| `tcp` | Generic TCP without app-layer inspection |
| `udp` | UDP traffic |
| `ip` | Any IP traffic |
| `icmp` | ICMP traffic |
| `http` | HTTP traffic — enables HTTP sticky buffers |
| `dns` | DNS traffic — enables `dns.query` buffer |
| `tls` | TLS traffic — enables `tls.*` sticky buffers |
| `ssh` | SSH traffic |
| `smtp` | Email traffic |
| `ftp` | FTP traffic |
| `quic` | QUIC/HTTP3 traffic |
| `pkthdr` | Raw packet header inspection |

### Network Variables

| Variable | Meaning |
|---|---|
| `$HOME_NET` | Protected network(s) |
| `$EXTERNAL_NET` | External network(s) |
| `$HTTP_PORTS` | HTTP service ports |
| `$DNS_PORTS` | DNS service ports |
| `any` | Any address or port |

### Direction

| Operator | Meaning |
|---|---|
| `->` | Source to destination (unidirectional) |
| `<>` | Bidirectional |

## Rule Options

Options appear inside parentheses, separated by semicolons.

### General Options

| Option | Description | Example |
|---|---|---|
| `msg` | Alert message (required) | `msg:"AEGIS - Cobalt Strike C2 Beacon";` |
| `sid` | Unique rule ID (required) | `sid:2100001;` |
| `rev` | Rule revision (required) | `rev:1;` |
| `classtype` | Attack classification | `classtype:trojan-activity;` |
| `reference` | External reference | `reference:url,example.com/report;` |
| `priority` | Override priority (1–4) | `priority:1;` |
| `metadata` | Key-value metadata | `metadata:author AEGIS, created_at 2026-04-01;` |
| `target` | Log target side (`src_ip` or `dest_ip`) | `target:dest_ip;` |

### Flow Options

| Value | Meaning |
|---|---|
| `established` | Established TCP sessions only |
| `to_server` | Client-to-server direction |
| `to_client` | Server-to-client direction |
| `stateless` | Match regardless of session state |

Combine with commas: `flow:established,to_server;`

### Content Match Options

`content` is the primary payload inspection keyword:

```
content:"match this string";
content:"|DE AD BE EF|";           # Hex byte match
content:!"exclude this";           # Negated match
```

Content modifiers:

| Modifier | Description |
|---|---|
| `nocase` | Case-insensitive match |
| `offset` | Start searching N bytes into buffer |
| `depth` | Search only first N bytes from offset |
| `distance` | Start N bytes after previous match |
| `within` | Match within N bytes of previous match |
| `fast_pattern` | Designate for fast pattern matching |
| `startswith` | Content must appear at start of buffer |
| `endswith` | Content must appear at end of buffer |
| `bsize` | Buffer size comparison (e.g. `bsize:>100;`) |

### Sticky Buffers (Dot Notation)

Suricata uses **dot-notation** for sticky buffers. Once set, all following `content` keywords apply to that buffer.

**HTTP buffers** (use with `http` protocol):

| Buffer | Inspects |
|---|---|
| `http.uri` | Normalized request URI |
| `http.uri.raw` | Raw (unnormalized) URI |
| `http.method` | HTTP method (GET, POST, etc.) |
| `http.request_header` | Specific request header (use with `name` modifier) |
| `http.response_header` | Specific response header |
| `http.host` | Host header value |
| `http.host.raw` | Raw Host header |
| `http.cookie` | Cookie header value |
| `http.user_agent` | User-Agent header |
| `http.content_type` | Content-Type header |
| `http.request_body` | Request body (POST data) |
| `http.response_body` | Response body |
| `http.stat_code` | Response status code |
| `http.stat_msg` | Response status message |
| `http.request_line` | Full request line |
| `http.response_line` | Full response line |
| `http.header` | Generic header buffer (legacy, prefer specific buffers) |
| `http.header.raw` | Raw header buffer |
| `http.start` | Start of HTTP data |

**DNS buffers** (use with `dns` protocol):

| Buffer | Inspects |
|---|---|
| `dns.query` | DNS query name |
| `dns.opcode` | DNS opcode value |

**TLS buffers** (use with `tls` protocol):

| Buffer | Inspects |
|---|---|
| `tls.cert_subject` | Certificate subject |
| `tls.cert_issuer` | Certificate issuer |
| `tls.sni` | Server Name Indication |
| `tls.cert_serial` | Certificate serial number |
| `tls.cert_fingerprint` | Certificate SHA1 fingerprint |
| `tls.certs` | Raw certificate data |
| `tls.version` | TLS version (e.g. `content:"1.2";`) |

**JA3/JA4 fingerprinting** (unique to Suricata):

| Keyword | Description |
|---|---|
| `ja3.hash` | JA3 client fingerprint (MD5) |
| `ja3.string` | JA3 client fingerprint string |
| `ja3s.hash` | JA3S server fingerprint (MD5) |
| `ja3s.string` | JA3S server fingerprint string |
| `ja4.hash` | JA4 fingerprint |

**File buffers**:

| Buffer | Inspects |
|---|---|
| `file.data` | File content (reassembled) |
| `file.name` | Filename |
| `file.magic` | File magic bytes |

### PCRE

```
pcre:"/\/[a-f0-9]{8}\/beacon/i";
```

Flags: `i` (case-insensitive), `s` (dotall), `m` (multiline), `U` (ungreedy), `R` (relative to last match).

### Byte Operations

| Keyword | Description |
|---|---|
| `byte_test` | Test byte value at offset |
| `byte_jump` | Jump forward by value at offset |
| `byte_extract` | Extract value for use in other keywords |
| `byte_math` | Perform math on extracted values |
| `dsize` | Match payload size |

### Dataset Keyword

Suricata supports matching against external datasets — useful for bulk IOC matching:

```
alert dns any any -> any any (msg:"Known C2 domain"; dns.query; dataset:isset,c2-domains,type string,load /etc/suricata/rules/c2-domains.lst; sid:2100010; rev:1;)
```

### Threshold / Rate Limiting

```
threshold:type both, track by_src, count 10, seconds 60;
```

Types: `limit` (alert N times per interval), `threshold` (alert every Nth match), `both` (alert once per interval after N matches).

## Example Rules

### Example 1: HTTP C2 Beacon with JA3 Fingerprint

```
alert tls $HOME_NET any -> $EXTERNAL_NET any (
    msg:"AEGIS - TLS C2 Beacon with Known JA3 Hash";
    flow:established,to_server;
    ja3.hash;
    content:"e7d705a3286e19ea42f587b344ee6865";
    tls.sni;
    content:".top"; endswith;
    classtype:trojan-activity;
    reference:url,example.com/c2-analysis;
    metadata:author AEGIS, created_at 2026-04-01;
    sid:2100001;
    rev:1;
)
```

### Example 2: DNS Query for Known Malicious Domain

```
alert dns $HOME_NET any -> any any (
    msg:"AEGIS - DNS Query to Known C2 Domain";
    flow:to_server;
    dns.query;
    content:"evil-update.xyz"; nocase; fast_pattern;
    classtype:trojan-activity;
    reference:url,example.com/threat-report;
    metadata:author AEGIS, created_at 2026-04-01;
    sid:2100002;
    rev:1;
)
```

### Example 3: HTTP POST Exfiltration with User-Agent Anomaly

```
alert http $HOME_NET any -> $EXTERNAL_NET any (
    msg:"AEGIS - HTTP POST Exfiltration with Suspicious UA";
    flow:established,to_server;
    http.method;
    content:"POST";
    http.user_agent;
    content:"Mozilla/5.0 (Compatible; MSIE 9.0; Update Service)"; fast_pattern;
    http.request_body;
    bsize:>10000;
    classtype:trojan-activity;
    reference:url,example.com/exfil-analysis;
    metadata:author AEGIS, created_at 2026-04-01;
    sid:2100003;
    rev:1;
)
```

### Example 4: TLS Certificate Fingerprint Match

```
alert tls $HOME_NET any -> $EXTERNAL_NET any (
    msg:"AEGIS - TLS Connection to Known Malicious Certificate";
    flow:established,to_server;
    tls.cert_fingerprint;
    content:"b5:4e:39:a1:8c:0e:2f:7d:3b:99:41:c6:d5:e8:f0:12:34:56:78:9a";
    classtype:trojan-activity;
    reference:url,example.com/cert-ioc;
    metadata:author AEGIS, created_at 2026-04-01;
    sid:2100004;
    rev:1;
)
```

### Example 5: SSH Brute Force Detection

```
alert ssh any any -> $HOME_NET 22 (
    msg:"AEGIS - SSH Brute Force Attempt Detected";
    flow:to_server;
    app-layer-event:ssh.invalid_banner;
    threshold:type both, track by_src, count 5, seconds 120;
    classtype:attempted-admin;
    metadata:author AEGIS, created_at 2026-04-01;
    sid:2100005;
    rev:1;
)
```

## Validation

Generated Suricata rules must pass this check:

```bash
# Write rule to temp file
cat > /tmp/rule.rules << 'EOF'
<rule content>
EOF

# Syntax validation
suricata -T -S /tmp/rule.rules -l /tmp 2>&1
```

Exit code 0 = valid. The `-T` flag runs in test mode, `-S` specifies the rule file, `-l` sets the log directory.

> **Note:** If `suricata` is not installed, perform LLM-based structural validation as fallback: verify semicolons terminate all options, dot-notation sticky buffers are used (not underscore), protocol matches the buffers used, parentheses are balanced, and all required fields (`msg`, `sid`, `rev`) are present.

## Key Differences from Snort 3

| Feature | Snort 3 | Suricata |
|---|---|---|
| Sticky buffer syntax | `http_uri` (underscore) | `http.uri` (dot) |
| JA3/JA4 support | Limited | Native (`ja3.hash`, `ja4.hash`) |
| Certificate fingerprint | Not available | `tls.cert_fingerprint` |
| Dataset matching | Not available | `dataset` keyword for bulk IOCs |
| `startswith` / `endswith` | Not available | Native content modifiers |
| `bsize` | Not available | Buffer size comparison |
| Config test command | `snort -T -c snort.lua --rule-path` | `suricata -T -S rules.rules -l /tmp` |
| Logging format | Unified2 / JSON | EVE JSON (default) |
| Additional protocols | Limited | `ssh`, `smtp`, `ftp`, `quic`, `mqtt`, `modbus` |

## Common Mistakes to Avoid

- **Underscore buffers**: Use `http.uri` NOT `http_uri` — underscore syntax is Snort, not Suricata
- **Missing semicolons**: Every option must end with `;` — including the last one before `)`
- **Wrong protocol**: Use `http` for HTTP buffers, `dns` for `dns.query`, `tls` for JA3/TLS buffers
- **SID conflicts**: Each rule must have a unique `sid` — use range 2100000+ for custom rules
- **Missing flow**: Always include `flow` for TCP-based rules
- **JA3 without TLS**: JA3/JA4 keywords require `tls` protocol, not `tcp`
- **Deprecated keywords**: Avoid `uricontent`, `http_inspect` — these are Snort 2 legacy
