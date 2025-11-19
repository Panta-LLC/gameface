# Deployment & Architecture Overview

This document describes the proposed deployment architecture for the Gameface MVP, how services map to infra components, local-dev options, CI/CD, and next steps for production readiness. It complements the diagram at `docs/diagrams/deployment.drawio` (edit in diagrams.net).

## Quick summary

- Recommended initial target: AWS (S3/CloudFront for static assets or ECS Fargate for containerized web; ECS Fargate for `api` and `signaling`).
- Key runtime services:
  - `@gameface/web` — frontend UI (static SPA build)
  - `@gameface/api` — REST/GraphQL API and backend logic
  - `@gameface/signaling` — WebSocket signaling server for WebRTC
  - Redis (ElastiCache) — ephemeral session and Pub/Sub for signaling scale
  - MongoDB (Atlas) — persistent app data
  - TURN (coturn) — optional but recommended for production NAT traversal
- CI/CD: GitHub Actions to run tests and push images to GHCR; optional automated deploy to ECS.
- Local dev: monorepo `npm run dev` (Vite + local Node services). Provide `docker-compose.yml` (dev) to run containers locally.

## Diagram

The diagram file is at:

- `docs/diagrams/deployment.drawio` (open with diagrams.net / draw.io)

It shows: Users -> CloudFront/CDN (static assets) -> ALB -> ECS cluster hosting `web` (if containerized), `api`, `signaling` + Redis, Mongo, TURN; GitHub Actions -> GHCR -> ECS; Observability components (CloudWatch/OpenTelemetry).

## Services, responsibilities, and deployment targets

- `@gameface/web`
  - Role: Single Page App (React + Vite) delivering UI and WebRTC logic.
  - Production options:
    - Preferred: Build static assets and serve from S3 + CloudFront (best latency and caching). Use CloudFront to terminate TLS and forward WebSocket handshakes to ALB for `signaling` if needed.
    - Alternative: Containerize (nginx serving built static files) and run as an ECS service behind ALB.
  - Notes: Ensure appropriate cache headers and invalidation; build process should produce an immutable artifact for CI.

- `@gameface/api`
  - Role: REST/GraphQL API, auth, user/profile management, DB access.
  - Deploy as ECS Fargate service behind an internal ALB (or same ALB with path-based routing), with autoscaling rules.
  - Connects to MongoDB (Atlas recommended) and Redis (ElastiCache) for session/cache.

- `@gameface/signaling`
  - Role: WebSocket signaling relay for WebRTC offer/answer/candidates plus room membership.
  - Stateful-ish: Should be horizontally scalable; store ephemeral room membership in Redis so other signaling replicas can coordinate.
  - Deploy as ECS Fargate service with sticky connections disabled; use ALB WebSocket support or a dedicated NLB if preferred.
  - Externally reachable on wss://

- Redis (ElastiCache)
  - Role: Pub/Sub for signaling across replicas, ephemeral session storage, locks
  - Use a managed cluster in the same VPC.

- MongoDB
  - Role: Persistent app data for users, metadata, analytics
  - Atlas is easiest for initial deployment; ensure secure network access (VPC peering) or username/password + IP allowlists.

- TURN (coturn)
  - Role: Relay media when direct P2P fails (NATs, restrictive networks)
  - Recommended for production—can be run as an ECS service or use a managed TURN provider. Coturn requires secure credential rotation and TURN credentials distribution via signaling.

- Observability
  - Minimal: CloudWatch logs + metrics for ECS tasks; centralize logs and setup alerting for high error rates or resource exhaustion.
  - Recommended: Add OpenTelemetry for traces and metrics; collect WebRTC getStats metrics from clients (sampled) and surface them in dashboards.

## Networking & TLS

- TLS: Terminate TLS at CloudFront or ALB. Serve the SPA over HTTPS. Signaling uses WSS (WebSocket over TLS).
- WebSocket routing: ALB supports WebSockets; configure appropriate idle timeouts for WebSocket connections.
- Security groups: lock down service-to-service ports in the VPC; only allow public access to ALB/CloudFront.

## CI/CD (recommended GitHub Actions flow)

1. Pull request triggers unit tests (Vitest) for changed packages. Use a monorepo-aware matrix job that runs `npm run -w @gameface/web test` etc.
2. On merge to `main` (or `release`): build Docker images for `api` and `signaling` and a static web build artifact.
3. Run integration smoke tests (optional). Publish images to GHCR with tags: `ghcr.io/<org>/gameface-api:sha-<short>` and `...-signaling:sha-<short>`.
4. Optionally, deploy to staging ECS via `aws ecs update-service` (use iam role + secrets). Promote to production after verification.

Secrets required (GH Actions):

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (for ECS deploy)
- `GHCR_PAT` (if pushing to GHCR is restricted)
- DB/TURN credentials for runtime (store in AWS Secrets Manager and reference from ECS task definitions)

## Local dev & docker-compose (recommended quick run)

- Continue using the monorepo dev command:

```bash
# from repo root
npm run dev
```

- Create a `docker-compose.yml` (dev) that composes:
  - `web` (built from `@gameface/web` but can be served by Vite in dev)
  - `api` (container from `@gameface/api` with NODE_ENV=development)
  - `signaling` (container from `@gameface/signaling`)
  - `redis` (official image)
  - `mongo` (official image)

- Environment notes: Use `.env.dev` for credentials and mount into compose. For WebRTC local testing, consider running clients in different browsers or use separate profiles.

Local docker-compose quickstart

The repository includes a `docker-compose.yml` that builds the `api`, `signaling`, and `web` images and starts local `redis` and `mongo` containers. This is useful for integration testing and developer QA.

Run locally:

```bash
# build images and start services
docker compose up --build

# rebuild a single service (example: api)
docker compose build api && docker compose up -d api

# stop and remove
docker compose down
```

Service endpoints (local):

- `http://localhost:3000` — API (default)
- `ws://localhost:3001` — Signaling (WebSocket)
- `http://localhost:8080` — Web UI (served by nginx)

Set runtime env vars via `.env` or in the compose file for more advanced scenarios (TURN credentials, DB connection strings, etc.).

## Production checklist (short-term)

- [ ] Configure TURN server (coturn) and secure credentials distribution from the signaling service.
- [ ] Add Redis (ElastiCache) and configure signaling to use it for Pub/Sub.
- [ ] Move DB to managed Atlas and secure credentials via Secrets Manager.
- [ ] Create ECS task definitions and cluster; configure autoscaling.
- [ ] Create GitHub Actions workflows for build-test-publish-deploy.
- [ ] Add health checks and readiness checks for `api` and `signaling`.
- [ ] Add logging configuration (structured JSON) and integrate with CloudWatch or ELK.

## Performance & scaling notes

- Signaling is CPU/light but must handle many concurrent WebSocket connections; scale ECS tasks horizontally.
- Media traffic (WebRTC) is P2P where possible; TURN relays are costly—monitor TURN usage and scale TURN accordingly.
- Use autoscaling policies for ECS tasks based on CPU and memory; for signaling, also consider connection count-based scaling.

## Observability & debugging

- Instrument `signaling` and `api` with OpenTelemetry libs (Node) exporting traces and metrics.
- Client-side: periodically sample WebRTC getStats and ship a subset (e.g., latency, packetLoss, jitter) to the API for aggregation.
- Add request/response logging, correlation IDs, and attach trace IDs to signaling messages.

## Files created / relevant

- `docs/diagrams/deployment.drawio` — draw.io diagram (created).
- `docs/DEPLOYMENT.md` — this document.
- Pending: `docker-compose.yml`, Dockerfiles for `@gameface/web`, `@gameface/api`, `@gameface/signaling`, and GitHub Actions workflow files.

## Next steps I can implement for you

Pick one and I'll do it next:

- Create Dockerfiles for the three services + `docker-compose.yml` for local dev (I can produce multi-stage Dockerfiles pinned to Node LTS and lightweight final images).
- Create GitHub Actions workflows to test, build, and publish images to GHCR (requires minimal secrets setup by you).
- Create ECS task definition templates and a sample Terraform staging setup.

If you'd like me to start with Dockerfiles, confirm and I will add:

- `apps/web/Dockerfile`
- `apps/api/Dockerfile`
- `apps/signaling/Dockerfile`
- Top-level `docker-compose.yml` for local/dev orchestration

---

If you'd like changes to this document (more diagrams, more deployment options, or environment-specific runbooks), tell me the target and I'll update it.

## AWS Deployment (ECS Fargate) — Step-by-step

This section provides a concise, copy-paste friendly guide to deploy the monorepo services to AWS using Docker images, Amazon ECR, ECS Fargate, an Application Load Balancer, and optional Terraform + GitHub Actions for automation. It assumes you prefer the recommended Option A: containerize services and run on ECS Fargate with an ALB.

### 0) Prerequisites

- AWS account with permissions for ECR, ECS, IAM, VPC, ALB, Route53, ACM, Secrets Manager.
- `aws` CLI configured (`aws configure`) and region set.
- `docker` installed and running locally.
- `npm` installed (repo uses npm).
- `terraform` installed if you plan to manage infra as code.

Quick checks:

```bash
aws sts get-caller-identity
aws configure get region
docker --version
npm --version
```

### 1) Inventory services to deploy

- `apps/api` — backend API
- `signaling` — WebSocket signaling server
- `web` — frontend (recommended to deploy as S3 + CloudFront, but containerizing is supported)
- Confirm whether `server.ts` at repo root is an extra runtime to deploy or a local helper.

Decisions you'll make:

- MongoDB: `MongoDB Atlas` (recommended) or AWS DocumentDB / self-managed
- Frontend: `S3+CloudFront` (recommended) vs `ECS` (if SSR or server-side features needed)

### 2) Dockerfiles (example templates)

Create a `Dockerfile` in each service folder. Minimal production multi-stage Node example for `apps/api`:

```
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

For the `web` (static build) you can use a static server or build to a `dist/` and upload to S3. Example lightweight nginx final stage if containerizing:

```
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Adjust `EXPOSE` and `CMD` values to your actual build outputs and entrypoints.

### 3) Build & test images locally

From repo root or service folder:

```bash
# build
docker build -t gameface-api:local ./apps/api

# run (provide a Mongo URI or envs)
docker run --rm -e MONGO_URI="mongodb://..." -p 3000:3000 gameface-api:local
```

Run unit tests first via monorepo scripts (example):

```bash
npm test
```

### 4) Create ECR repos & push images (example)

Replace `<AWS_ACCOUNT_ID>` and `<AWS_REGION>` with your values.

```bash
aws ecr create-repository --repository-name gameface-api --region <AWS_REGION>
aws ecr get-login-password --region <AWS_REGION> | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com
docker tag gameface-api:local <AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/gameface-api:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/gameface-api:latest
```

Repeat for `signaling` and `web` (if containerized). Prefer tagging by commit SHA for immutable deployments.

### 5) Infrastructure-as-Code (Terraform) — skeleton

Create an `infra/` folder and resources for:

- provider (AWS)
- VPC and public/private subnets
- ECR repositories (optional, you can create via CLI)
- ECS cluster (Fargate)
- Task definitions and ECS services
- Application Load Balancer (ALB) with target groups and listeners
- Secrets Manager (store MONGO_URI, TURN credentials)
- IAM roles for ECS task execution

Key Terraform workflow:

```bash
cd infra
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Task definition snippet (conceptual):

```
resource "aws_ecs_task_definition" "api" {
  family                   = "gameface-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  container_definitions    = jsonencode([
    {
      name      = "gameface-api"
      image     = "<AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/gameface-api:latest"
      portMappings = [{ containerPort = 3000, protocol = "tcp" }]
      secrets = [{ name = "MONGO_URI", valueFrom = aws_secretsmanager_secret.gameface_mongo.arn }]
    }
  ])
}
```

### 6) ALB, routing and security

- ALB in public subnets; target groups for each service.
- ALB security group: allow 80/443 inbound; ECS tasks security group: allow inbound from ALB SG only.
- Use path-based or host-based routing to separate `api` and `signaling`.

### 7) DNS & TLS

- Use Route53 hosted zone and ACM certificate (request cert and use DNS validation). For CloudFront, request ACM cert in `us-west-2`.

```bash
aws acm request-certificate --domain-name example.com --validation-method DNS --region us-west-2
```

Terraform can automate DNS validation and Route53 record creation.

### 8) CI/CD — GitHub Actions (high-level)

- Workflow tasks:
  - Run tests (Vitest)
  - Build Docker images
  - Login to ECR and push images (or GHCR)
  - Run `terraform plan` (optional) and `terraform apply` for staging/prod (protect with approvals)

Sample steps (snippets) for image build + push:

```
- name: Login to ECR
  uses: aws-actions/amazon-ecr-login@v2

- name: Build and push API image
  run: |
    docker build -t ${{ env.ECR_REGISTRY }}/gameface-api:${{ github.sha }} ./apps/api
    docker push ${{ env.ECR_REGISTRY }}/gameface-api:${{ github.sha }}
```

Store secrets in GitHub: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and any PATs needed.

### 9) Secrets & environment variables

- Store runtime secrets in `AWS Secrets Manager` and reference them in ECS task definitions with `secrets`.
- Keep non-sensitive config in environment variables passed to tasks or in SSM Parameter Store.

### 10) Deploy & verify

- After Terraform or manual ECS service creation, check ALB target group health and task status.

Useful CLI checks:

```bash
aws ecs list-clusters
aws ecs describe-services --cluster gameface-cluster --services gameface-api
aws ecs list-tasks --cluster gameface-cluster --service-name gameface-api
aws logs tail /aws/ecs/gameface-api --since 1h
```

Run smoke tests against the ALB endpoint or domain (health or `/ping` route).

### 11) Rollback plan

- Keep image tags per-commit (SHA) and use older task definition revision to rollback:

```bash
aws ecs update-service --cluster gameface-cluster --service gameface-api --task-definition gameface-api:<previous-revision>
```

### 12) Monitoring & alerts

- Send logs to CloudWatch (enable awslogs driver in task definitions).
- Create CloudWatch alarms on error rate, CPU, memory, and target group unhealthy hosts.

—

If you want, I can (pick one):

- scaffold `Dockerfile`s for `apps/api`, `signaling`, and `web` and a top-level `docker-compose.yml` for local dev,
- create a minimal `infra/` Terraform scaffold that provisions ECR + ECS cluster + ALB + a single service for staging,
- add a GitHub Actions workflow template to build/test/push images and run Terraform.

Tell me which of the above to implement and I will create the files and run local verifications.
