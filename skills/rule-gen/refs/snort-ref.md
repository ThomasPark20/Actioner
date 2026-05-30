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

The rule-header protocol field accepts only the four real protocols Snort decodes at L3/L4:

| Protocol | Use when |
|---|---|
| `tcp` | Generic TCP traffic without application-layer inspection |
| `udp` | UDP traffic (DNS, DHCP, etc.) |
| `ip` | Any IP traffic |
| `icmp` | ICMP traffic |

### Services

Instead of a protocol you may place a **service name** in the protocol position. The rule then matches only traffic that Snort's service detection (wizard/binder/AppID) identifies as that service, regardless of port. This is what enables the application-layer sticky buffers — not the protocol field itself.

| Service | Use when |
|---|---|
| `http` | HTTP traffic — enables the `http_*` sticky buffers |
| `ssl` | TLS/SSL traffic — enables `ssl_state` / `ssl_version` |
| `dns` | DNS traffic (inspect the payload with `content`/`pcre`; Snort 3 has no DNS sticky buffer) |
| `ftp`, `smtp`, `ssh`, … | Other detected services |

> Snort 3 has no `file` protocol/service in the header. File inspection is reached through the `file_data` buffer (below) on the carrying service, or via file rules.

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
| `priority` | Override default classtype priority (positive integer, 1 = highest) | `priority:1;` |
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

Content modifiers are **comma-separated parameters of the `content` option** in Snort 3 (e.g. `content:"GET", nocase, fast_pattern;`). The legacy Snort 2 form (`content:"GET"; nocase;`) still parses, but prefer the comma form.

| Modifier | Description | Example |
|---|---|---|
| `nocase` | Case-insensitive match | `content:"GET", nocase;` |
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

To inspect a specific header (e.g. Host), use `http_header` with the `field` parameter: `http_header:field host;` then `content:...;`. Snort 3 has no `http_host` buffer.

**DNS (use with `dns` service):**

Snort 3 has **no DNS sticky buffer** (`dns.query` is Suricata-only). Match the query name with `content`/`pcre` against the packet payload (`pkt_data`, the default buffer) on `udp`/`tcp` port 53 or a `dns` service rule.

**TLS/SSL (use with `ssl` service):**

Snort 3 has no `tls.sni` / `tls.cert_subject` / `tls.cert_issuer` sticky buffers (those are Suricata-only). It exposes two SSL rule options instead:

| Option | Matches | Values |
|---|---|---|
| `ssl_state` | Handshake state | `client_hello`, `server_hello`, `client_keyx`, `server_keyx`, `unknown` (negate with `!`) |
| `ssl_version` | Negotiated version | `sslv2`, `sslv3`, `tls1.0`, `tls1.1`, `tls1.2` (negate with `!`) |

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

Flags: `i` (case-insensitive), `s` (dotall), `m` (multiline), `G` (ungreedy), `R` (relative to last match). The Snort 2 buffer-suffix flags (`U`, `B`, `H`, etc.) were removed in Snort 3 — use sticky buffers instead.

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
    content:"/api/update", fast_pattern;
    content:"session=", distance 0;
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

Snort 3 has no DNS query sticky buffer, so match the label-length-encoded name in the payload (the dotless form: `|0b|` = 11-byte label `evil-update`, `|03|` = 3-byte label `xyz`, `|00|` = root).

```
alert udp $HOME_NET any -> any 53 (
    msg:"Actioner - DNS Query to Known C2 Domain evil-update[.]xyz";
    flow:to_server;
    content:"|0b|evil-update|03|xyz|00|", nocase, fast_pattern;
    classtype:trojan-activity;
    reference:url,example.com/threat-report;
    metadata:author Actioner, created 2026-04-01;
    sid:2100002;
    rev:1;
)
```

### Example 3: TLS ClientHello to Suspicious SNI

Snort 3 cannot inspect the certificate subject/issuer via sticky buffers. The SNI, however, travels in cleartext inside the ClientHello, so gate on `ssl_state:client_hello` and content-match the SNI in the payload. (For cert-subject/issuer/SNI sticky buffers, use Suricata.)

```
alert ssl $HOME_NET any -> $EXTERNAL_NET any (
    msg:"Actioner - TLS ClientHello to Suspicious SNI cdn-static[.]top";
    flow:established, to_server;
    ssl_state:client_hello;
    content:"cdn-static", fast_pattern;
    content:".top", distance 0;
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
snort -c snort.lua -R rule.rules -T
```

Exit code 0 = valid. If validation fails, review the error message, fix the rule, and retry (max 3 attempts total).

## Common Mistakes to Avoid

- **Missing semicolons**: Every option must end with `;` — including the last one before `)`
- **Wrong service**: Use the `http` service (not `tcp`) when using `http_*` sticky buffers; use the `ssl` service for `ssl_state`/`ssl_version`
- **Suricata buffers in Snort**: `dns.query`, `tls.sni`, `tls.cert_subject`, `http.uri` (dot notation) are Suricata-only — they do not exist in Snort 3
- **SID conflicts**: Each rule must have a unique `sid` — use range 2100000+ for custom rules
- **Missing flow**: Always include `flow` for TCP-based rules to avoid matching on retransmits
- **Snort 2 syntax**: Do not use `http_inspect` preprocessor directives or `uricontent` — these are Snort 2 only
