# Implementation Prompt – Observability (Metrics, Logs, Traces)

## Context

Instrument services to expose actionable metrics, structured logs, and traces for troubleshooting and SLO tracking.

## Objectives

- OpenTelemetry for traces/metrics; structured JSON logs.
- Dashboards for key flows (join call, start game) and system health.
- Alerts tied to SLOs with paging thresholds.

## Metrics

- RED/USE metrics for services; app-specific KPIs (call_setup_time_ms, reconnect_attempts, game_latency_ms).
- Export via OTLP to collector → backend (e.g., Prometheus/Grafana, Tempo, Loki).

## Logs

- JSON logs with correlation IDs; sensitive fields redacted.
- Standard fields: ts, level, svc, trace_id/span_id, user_hash, route, err.code.

## Traces

- Span around API handlers/signaling events; link front-end and back-end via tracecontext.
- Sampling configured to balance cost and visibility; tail-based sampling for errors.

## Dashboards & Alerts

- Dashboards for latency, error rates, resource usage, and KPIs.
- Alerts on p95 latency breaches, error spikes, reconnect failure rate.

## Acceptance Criteria

- Telemetry flows from all services to backend; dashboards populated.
- Correlated traces across frontend ↔ backend for join-call path.
- Alerts route to on-call with runbooks linked.

## Test Plan

- Local collector with example telemetry; verify export.
- Stage smoke tests trigger expected metrics/logs/traces.
- Simulate failure to validate alert firing and runbook.
