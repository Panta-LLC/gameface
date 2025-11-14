# Implementation Prompt – Containerization & Deployment

## Context
Containerize services with secure, efficient images and deploy via IaC with environment-specific configs.

## Objectives
- Multi-stage Dockerfiles with minimal runtime images.
- Health checks, non-root users, read-only FS where possible.
- IaC for infra provisioning (e.g., Terraform), env separation, and secrets wiring.

## Docker
- Use .dockerignore; layer caching; pin base images and verify digests.
- Add HEALTHCHECK; drop capabilities; use USER nonroot.
- Export SBOM (syft) and sign images (cosign).

## Deployment
- Choose orchestrator (ECS/EKS/AKS) or simple VM/container service for MVP.
- Rolling deploys and blue/green strategy for backend/signaling.
- Configure autoscaling based on CPU/memory/RPS.

## Config & Secrets
- 12-factor env vars; mount secrets from secret manager.
- Separate configs per env; feature flags for risky changes.

## Acceptance Criteria
- Reproducible images with SBOM and signatures stored in registry.
- Services deployable to staging/prod via pipeline using IaC.
- Rollback tested; health probes and autoscale verified.

## Test Plan
- Build images locally; run containers with health checks.
- Deploy to staging; run smoke tests; force a rollout and rollback.
- Verify autoscaling behavior under load.
