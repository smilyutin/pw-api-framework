# Performance Metrics System

## Overview
Automated evaluation of schema validation performance over time with metrics tracking, trend analysis, and SLA monitoring.

## Features

### 1. Automatic Metrics Collection
Every schema validation is tracked with:
- Timestamp
- Endpoint and schema name
- Success/failure status
- Execution duration
- Error type (if failed)
- Schema version

### 2. Daily Summaries
Automatically generated for each day:
```json
{
  "date": "2025-12-01",
  "totalValidations": 24,
  "successfulValidations": 23,
  "failedValidations": 1,
  "accuracy": 95.83,
  "avgDuration": 920,
  "errorTypes": {
    "type": 1
  },
  "affectedEndpoints": ["/articles"]
}
```

### 3. Trend Analysis
Tracks performance over 30 days:
- Average accuracy (last 7 days)
- Average duration (last 7 days)
- Accuracy trend (↑/↓)
- Duration trend (↑/↓)
- Overall health status

### 4. SLA Monitoring
Automatic alerts when thresholds are breached:

**Accuracy:**
- Target: 100%
- Warning: < 98%
- Critical: < 95%

**Duration:**
- Target: < 1000ms
- Warning: > 2000ms
- Critical: > 5000ms

## Usage

### View Performance Report
Metrics are automatically saved and reported after test runs:

```bash
npx playwright test
```

Output includes:
```
PERFORMANCE METRICS REPORT
================================================================================
Period: 30 days
Last Updated: 12/1/2025, 4:30:00 PM

Recent Performance (Last 7 Days):
  Average Accuracy: 98.50%
  Average Duration: 920ms
  Accuracy Trend: ↑ 1.20%
  Duration Trend: ↓ 80ms

Overall Status: Excellent
================================================================================
```

### Metrics Storage

```
metrics/
  daily/
    2025-12-01.json           # Raw validation data
    2025-12-01-summary.json   # Daily summary
    2025-12-02.json
    2025-12-02-summary.json
  trends.json                 # 30-day trend analysis
  alerts.log                  # SLA violation history
```

### Manual Analysis

View raw metrics:
```bash
cat metrics/daily/2025-12-01.json
```

View trend analysis:
```bash
cat metrics/trends.json
```

Check alerts:
```bash
cat metrics/alerts.log
```

## Health Status

- **Excellent**: 100% accuracy, < 1000ms avg duration
- **Good**: ≥ 98% accuracy, < 2000ms avg duration
- **Fair**: ≥ 95% accuracy, < 5000ms avg duration
- **Needs Attention**: < 95% accuracy or > 5000ms avg duration

## Alert Example

When SLA thresholds are breached:

```
================================================================================
PERFORMANCE ALERTS:
WARNING: Accuracy at 97.50% (threshold: 98%)
CRITICAL: Avg duration 5200ms (threshold: 5000ms)
================================================================================
```

Alerts are also logged to `metrics/alerts.log` for historical tracking.

## Benefits

1. **Early Detection**: Catch performance degradation before it impacts production
2. **Trend Visibility**: Understand long-term performance patterns
3. **Root Cause Analysis**: Identify which endpoints/schemas are problematic
4. **Continuous Improvement**: Data-driven decisions for optimization
5. **SLA Compliance**: Automatic monitoring of performance targets

## Integration

The metrics system is automatically integrated into:
- `utils/schema-validator.ts` - Tracks every validation
- `utils/fixtures.ts` - Saves and reports after test runs

No manual configuration required.
