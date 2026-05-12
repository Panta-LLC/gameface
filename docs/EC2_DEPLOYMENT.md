# EC2 deployment

The canonical deployment guide is [`DEPLOYMENT.md`](./DEPLOYMENT.md). This file
exists only as a redirect for older bookmarks.

The active workflow (`.github/workflows/deploy-to-ec2.yml`) builds all three
app images in parallel, pushes them to Docker Hub, and deploys via
`docker compose` against `infra/ec2/docker-compose.prod.yml` on a single EC2
host fronted by Caddy. See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full
flow, required GitHub secrets, provisioning steps, and rollback procedure.

For an alternative SSH-less deploy path using AWS Systems Manager, see
[`SSM_DEPLOY.md`](./SSM_DEPLOY.md).
