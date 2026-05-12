# Deployment

GameFace deploys as three Docker containers (api, signaling, web) plus a Caddy
reverse proxy on a single AWS EC2 host. Continuous deployment is wired through
[`.github/workflows/deploy-to-ec2.yml`](../.github/workflows/deploy-to-ec2.yml).

The previously documented ECS Fargate plan is deferred — see
[`terraform_deferred/README.md`](../terraform_deferred/README.md) for revival
criteria. Public-beta target stack and phased roadmap live in the project plan.

## Topology

```
                   Cloudflare (Phase 1+)
                           |
                           v
                  EC2 EIP, ports 80/443
                           |
                           v
                  +----------------+
                  | Caddy (proxy)  |
                  +----------------+
                   /     |       \
            /api/*    /signaling   /
              v          v          v
            api      signaling     web
           :3000     :3001       :80 (nginx)

  Phase 2+:
    api / signaling / identity-service -> MongoDB Atlas + Upstash Redis
```

Three containers run on the host, plus Caddy. Mongo and Redis are **not** on
the host — they're managed (Atlas + Upstash) starting in Phase 2. Identity
service joins the topology in Phase 3.

## Repository layout

| Path                                                                            | Purpose                                        |
| ------------------------------------------------------------------------------- | ---------------------------------------------- |
| [`infra/ec2/main.tf`](../infra/ec2/main.tf)                                     | Provisions the EC2 instance + security group   |
| [`infra/ec2/Caddyfile`](../infra/ec2/Caddyfile)                                 | Reverse proxy + (Phase 1) automatic TLS        |
| [`infra/ec2/docker-compose.prod.yml`](../infra/ec2/docker-compose.prod.yml)     | Production compose: api, signaling, web, caddy |
| [`apps/{api,signaling,web}/Dockerfile`](../apps)                                | Per-app multi-stage builds                     |
| [`.github/workflows/deploy-to-ec2.yml`](../.github/workflows/deploy-to-ec2.yml) | Build + push + deploy on push to `main`        |
| [`.github/workflows/deploy-ssm.yml`](../.github/workflows/deploy-ssm.yml)       | Alternative SSM-based deploy (manual dispatch) |
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)               | Deferred ECS path — guard-only stub            |

## CI/CD pipeline

`deploy-to-ec2.yml` runs on every push to `main`:

1. **Build (matrix)** — builds three Docker images (`gameface-api`,
   `gameface-signaling`, `gameface-web`) in parallel and pushes them to Docker
   Hub, tagged with both `:${github.sha}` and `:latest`.
2. **Deploy** — SSHes to the EC2 host, copies `docker-compose.prod.yml` and
   `Caddyfile`, then runs `docker compose pull && docker compose up -d`.
3. **Smoke test** — `curl /healthz` (Caddy) and `/api/health` (api).

### Required GitHub secrets

| Secret                | Purpose                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `DOMAIN`              | Hostname for TLS, e.g. `gameface.example.com` (Phase 1+)                 |
| `LETSENCRYPT_EMAIL`   | _Optional._ Account email for LE expiry notifications                    |
| `DOCKERHUB_USERNAME`  | Owner of the `gameface-*` Docker Hub repos                               |
| `DOCKERHUB_TOKEN`     | Push access                                                              |
| `EC2_HOST`            | Public IP / DNS of the EC2 host (set to the EIP from `terraform output`) |
| `EC2_USER`            | SSH user (`ubuntu` for the AMI in `infra/ec2/`)                          |
| `EC2_SSH_PRIVATE_KEY` | Private key whose public counterpart is in `var.public_key`              |

## Initial provisioning

```sh
cd infra/ec2
terraform init
terraform apply \
  -var "subnet_id=subnet-xxxxxxxx" \
  -var "public_key=$(cat ~/.ssh/id_rsa.pub)"
```

Then set the GitHub secrets above using the outputs:

```sh
gh secret set EC2_HOST            --body "$(terraform output -raw public_ip)"
gh secret set EC2_USER            --body "$(terraform output -raw ec2_ssh_user)"
gh secret set EC2_SSH_PRIVATE_KEY < ~/.ssh/id_rsa
gh secret set DOMAIN              --body "your-domain.example.com"
gh secret set LETSENCRYPT_EMAIL   --body "you@example.com"   # optional
```

Point your DNS A-record at the `EC2_HOST` value (the Elastic IP, stable
across instance replacement). See [`PHASE1_TLS.md`](./PHASE1_TLS.md) for the
full Cloudflare setup. A push to `main` then deploys automatically.

## Local dev

The repo's top-level [`docker-compose.yml`](../docker-compose.yml) brings up
api + signaling + web + Mongo + Redis for local integration testing:

```sh
docker compose up --build
# api:        http://localhost:3000
# signaling:  ws://localhost:3001
# web:        http://localhost:8080
```

For day-to-day dev without containers:

```sh
npm install
npm run dev          # concurrently runs all three apps
npm run verify:dev   # smoke-tests health + signaling echo + Vite
```

## Phase status

The current deploy reaches **Phase 1** — all three apps deploy on push to
`main` behind Caddy with automatic TLS via Let's Encrypt. See
[`PHASE1_TLS.md`](./PHASE1_TLS.md) for the Cloudflare DNS + SSL runbook.

Roadmap phases beyond TLS — managed Mongo/Redis, secrets via SSM, identity
service, observability, beta hardening — are tracked in the project plan.

## Rollback

Each deploy tags images by commit SHA. To roll back to a previous deploy:

```sh
ssh ubuntu@<EC2_HOST>
sudo docker pull <user>/gameface-api:<previous-sha>
sudo docker pull <user>/gameface-signaling:<previous-sha>
sudo docker pull <user>/gameface-web:<previous-sha>
IMAGE_TAG=<previous-sha> DOCKERHUB_USERNAME=<user> \
  sudo --preserve-env=IMAGE_TAG,DOCKERHUB_USERNAME \
  docker compose -f docker-compose.prod.yml up -d
```

A real runbook lands in Phase 6.
