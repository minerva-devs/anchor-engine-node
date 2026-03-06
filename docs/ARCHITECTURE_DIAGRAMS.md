## Performance Benchmarks

Note: GitHub does not currently render Mermaid xychart-beta blocks; tables are used for compatibility.

### Search Latency by Strategy
| Strategy | Latency (ms) |
|---|---:|
| Standard | 300 |
| Max-Recall | 50000 |

### Context Retrieval Volume
| Strategy | Characters (k) |
|---|---:|
| Standard | 32 |
| Max-Recall | 618 |

### Deduplication Effectiveness
| Version | Dedup Rate (%) |
|---|---:|
| Before v4.1.2 | 30 |
| After v4.1.2 | 45 |