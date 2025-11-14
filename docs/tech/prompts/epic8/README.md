# Epic 8 – Deployment & Monitoring

Automate builds and releases with robust CI/CD, containerize services, deploy to cloud, and instrument with comprehensive observability.

Scope (MVP):
- CI/CD pipelines (lint, test, build, security scans, deploy).
- Containerization for frontend, backend, signaling; environment configs.
- Monitoring: metrics, logs, traces, dashboards, and alerts.

---
## Architecture Overview
- CI: GitHub Actions with environments (dev/stage/prod) and approvals.
- Containers: multi-stage Dockerfiles, small images, SBOMs.
- Infra: IaC (Terraform or CDK) for app + data services; secrets wiring.
- Observability: OpenTelemetry SDKs → collector → backend (e.g., Grafana/OTLP).

---
## Acceptance Criteria (Aggregate)
- Pipelines green-gate on tests and scans; deploy on tags with change approvals.
- Images reproducible and signed; envs configured via secrets manager.
- Dashboards for key SLOs; alerts wired to on-call channel.

---
## Prompts
- ci-cd-implementation-prompt.md
- containerization-deployment-implementation-prompt.md
- observability-implementation-prompt.md
