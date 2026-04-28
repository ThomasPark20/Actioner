# Snort 3 Rule Reference

> Concise reference for generating valid Snort 3 detection rules. Loaded into the Rule Generator Agent's context alongside topic summaries.

## Rule Format

Every Snort 3 rule is a single line (or logically continued with `\`) with this structure:

```
action protocol source_ip source_port direction dest_ip dest_port (options;)
```

Example skeleton:

```
alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"Example rule"; content:"badstring"; sid:1000001; rev:1;)
```

## Header Fields

### Actions

| Action | Description |
|---|---|
| `alert` | Generate an alert and log the packet. **Default for detection rules.** |
| `log` | Log the packet without alerting |
| `pass` | Ignore the packet (whitelist) |
| `drop` | Block and log the packet (inline/IPS mode) |
| `reject` | Block, log, and send TCP RST or ICMP unreachable |

### Protocols

| Protocol | Use when |
|---|---|
| `tcp` | Generic TCP traffic without application-layer inspection |
| `udp` | UDP traffic (DNS, DHCP, etc.) |
| `ip` | Any IP traffic |
| `icmp` | ICMP traffic |
| `http` | HTTP traffic — enables HTTP sticky buffers |
| `dns` | DNS traffic — enables `dns.query` buffer |
| `tls` | TLS traffic — enables `tls.` sticky buffers |
| `file` | File inspection across protocols |

### Network Variables

Use predefined variables instead of hardcoded addresses:

| Variable | Meaning |
|---|---|
| `$HOME_NET` | Protected network(s) |
| `$EXTERNAL_NET` | External network(s) |
| `$HTTP_PORTS` | HTTP service ports |
| `$DNS_PORTS` | DNS service ports (typically 53) |
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
| `msg` | Alert message text (required) | `msg:"Cobalt Strike C2 Beacon";` |
| `sid` | Unique rule identifier (required) | `sid:2100001;` |
| `rev` | Rule revision number (required) | `rev:1;` |
| `classtype` | Attack classification | `classtype:trojan-activity;` |
| `reference` | External reference | `reference:url,example.com/report;` |
| `priority` | Override default classtype priority (1–10) | `priority:1;` |
| `metadata` | Key-value metadata | `metadata:author Actioner, created 2026-04-01;` |

### Flow Options

The `flow` keyword restricts rule matching to specific connection states:

| Value | Meaning |
|---|---|
| `established` | Match only on established TCP sessions |
| `to_server` | Match traffic going to the server (client request) |
| `to_client` | Match traffic going to the client (server response) |
| `stateless` | Match regardless of session state |

Combine with commas: `flow:established, to_server;`

### Content Match Options

`content` is the primary payload inspection keyword:

```
content:"match this string";
content:"|DE AD BE EF|";           # Hex byte match
content:!"exclude this";           # Negated match
```

Content modifiers (apply to the preceding `content`):

| Modifier | Description | Example |
|---|---|---|
| `nocase` | Case-insensitive match | `content:"GET"; nocase;` |
| `offset` | Start searching N bytes into the buffer | `offset:0;` |
| `depth` | Search only the first N bytes from offset | `depth:4;` |
| `distance` | Start N bytes after previous match | `distance:1;` |
| `within` | Match must be within N bytes of previous match | `within:50;` |
| `fast_pattern` | Designate this content for fast pattern matching | `fast_pattern;` |

### Sticky Buffers

Sticky buffers focus inspection on specific protocol fields. Once set, all following `content` keywords apply to that buffer until a new buffer is set.

**HTTP buffers** (use with `http` protocol):

| Buffer | Inspects |
|---|---|
| `http_uri` | Normalized request URI path + query |
| `http_raw_uri` | Raw (unnormalized) request URI |
| `http_header` | Request or response headers |
| `http_client_body` | Request body (POST data) |
| `http_method` | HTTP method (GET, POST, etc.) |
| `http_stat_code` | Response status code |
| `http_stat_msg` | Response status message |
| `http_cookie` | Cookie header value |
| `http_host` | Host header value |

**DNS buffers** (use with `dns` protocol):

| Buffer | Inspects |
|---|---|
| `dns.query` | DNS query name |

**TLS buffers** (use with `tls` protocol):

| Buffer | Inspects |
|---|---|
| `tls.cert_subject` | Certificate subject CN |
| `tls.cert_issuer` | Certificate issuer |
| `tls.sni` | Server Name Indication value |

**File buffers**:

| Buffer | Inspects |
|---|---|
| `file_data` | File content (normalized, decompressed) |
| `js_data` | Normalized JavaScript content |

### PCRE

Use `pcre` for regex matching when `content` is insufficient:

```
pcre:"/\/[a-f0-9]{8}\/beacon/i";
```

Flags: `i` (case-insensitive), `s` (dotall), `m` (multiline), `U` (ungreedy).

### Byte Operations

| Keyword | Description |
|---|---|
| `byte_test` | Test byte value at offset against a value |
| `byte_jump` | Jump forward by value at offset |
| `dsize` | Match payload size (e.g. `dsize:>500;`) |

### Threshold / Rate Limiting

```
detection_filter:track by_src, count 10, seconds 60;
```

Fires only after 10 matches from the same source within 60 seconds — useful for beacon detection.

## Example Rules

### Example 1: HTTP C2 Beacon Check-in

```
alert http $HOME_NET any -> $EXTERNAL_NET any (
    msg:"Actioner - HTTP C2 Beacon Check-in to /api/update Endpoint";
    flow:established, to_server;
    http_method;
    content:"POST";
    http_uri;
    content:"/api/update"; fast_pattern;
    content:"session="; distance:0;
    http_header;
    content:"Mozilla/5.0";
    content:"Accept: application/octet-stream";
    detection_filter:track by_src, count 5, seconds 300;
    classtype:trojan-activity;
    reference:url,example.com/c2-beacon-analysis;
    metadata:author Actioner, created 2026-04-01;
    sid:2100001;
    rev:1;
)
```

### Example 2: DNS Query for Known Malicious Domain

```
alert dns $HOME_NET any -> any $DNS_PORTS (
    msg:"Actioner - DNS Query to Known C2 Domain evil-update[.]xyz";
    flow:to_server;
    dns.query;
    content:"evil-update.xyz"; nocase; fast_pattern;
    classtype:trojan-activity;
    reference:url,example.com/threat-report;
    metadata:author Actioner, created 2026-04-01;
    sid:2100002;
    rev:1;
)
```

### Example 3: TLS Connection with Suspicious Certificate

```
alert tls $HOME_NET any -> $EXTERNAL_NET any (
    msg:"Actioner - TLS Connection to Self-Signed C2 with Anomalous CN";
    flow:established, to_server;
    tls.sni;
    content:"cdn-static"; fast_pattern;
    content:".top";
    tls.cert_subject;
    content:"CN=cdn-static";
    tls.cert_issuer;
    content:"CN=cdn-static";
    classtype:trojan-activity;
    reference:url,example.com/tls-anomaly-report;
    metadata:author Actioner, created 2026-04-01;
    sid:2100003;
    rev:1;
)
```

## Validation

Generated Snort 3 rules must pass this check:

```bash
# Syntax and configuration validation
snort -T -c snort.lua --rule-path rule.rules
```

Exit code 0 = valid. If validation fails, review the error message, fix the rule, and retry (max 3 attempts total).

## Common Mistakes to Avoid

- **Missing semicolons**: Every option must end with `;` — including the last one before `)`
- **Wrong protocol**: Use `http` (not `tcp`) when using HTTP sticky buffers; use `dns` for `dns.query`
- **SID conflicts**: Each rule must have a unique `sid` — use range 2100000+ for custom rules
- **Missing flow**: Always include `flow` for TCP-based rules to avoid matching on retransmits
- **Snort 2 syntax**: Do not use `http_inspect` preprocessor directives or `uricontent` — these are Snort 2 only
