# Deploy to EC2 via GitHub Actions (Docker + SSH)

This document explains how to use the included GitHub Actions workflow to deploy a Dockerized service to an EC2 instance using Docker Hub as the image registry.

File: `.github/workflows/deploy-to-ec2.yml`

Summary of the flow

- Build a Docker image from a configurable context (default: `apps/api`).
- Push the image to Docker Hub as `<DOCKERHUB_USERNAME>/gameface:<sha>`.
- SSH to your EC2 host and run `docker pull` + `docker run` to start the container.

Required GitHub repository secrets (set these in the repository Settings → Secrets):

- `DOCKERHUB_USERNAME` — Docker Hub username that will own/push the image.
- `DOCKERHUB_TOKEN` — Docker Hub access token (or password) for the account above.
- `EC2_HOST` — Public DNS or IP of the target EC2 instance.
- `EC2_USER` — Username to SSH as (e.g. `ubuntu` or `ec2-user`).
- `EC2_SSH_PRIVATE_KEY` — The private key text for SSH (PEM). Keep this secret.

EC2 instance preparation checklist

- Install Docker and ensure the `docker` daemon is running (Ubuntu example):

```bash
sudo apt update && sudo apt install -y docker.io
sudo usermod -aG docker $USER
sudo systemctl enable --now docker
```

- Ensure the instance can reach Docker Hub (outbound internet access) and that your security group allows SSH (port 22).
- Optionally, restrict which public IP(s) may SSH; consider using a bastion host or GitHub Actions self-hosted runner for increased security.

How the workflow runs

- On merge to `main` or when triggered manually via `workflow_dispatch`, the action builds the image and pushes it to Docker Hub as `<DOCKERHUB_USERNAME>/gameface:<sha>`.
- The action then SSHs to `EC2_HOST`, logs into Docker Hub from the remote host using the provided credentials, pulls the tag, and restarts the container named `gameface`.

Triggering with a different build context

- Use the workflow dispatch input `context` to point the build to `apps/signaling` or `web` if you prefer to build/deploy a different service.

Security considerations

- Keep the `EC2_SSH_PRIVATE_KEY` secret and rotate keys periodically.
- For production, prefer using ECR + instance IAM role (avoid storing registry creds), or use an instance role that can pull from a private ECR repo.
- Consider running the container under a restricted user on the host and use firewall rules to limit exposure.

Next steps I can take for you

- Convert the workflow to use Amazon ECR and instance IAM role (no stored Docker Hub creds on remote).
- Add a `scripts/deploy.sh` helper to make deploys idempotent with configurable environment files and health checks.
- Create a small health-check endpoint and graceful restart process for zero-downtime deploys.

If you want me to make any of the above changes, tell me which and I'll implement them and update this guide.
