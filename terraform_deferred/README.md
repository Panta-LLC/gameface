# Deferred: ECS Fargate scaffold

**This module is intentionally not in use.** The active deployment path is
single-host EC2 + Docker Compose under [`infra/ec2/`](../infra/ec2/) and
[`.github/workflows/deploy-to-ec2.yml`](../.github/workflows/deploy-to-ec2.yml).

## Why this is deferred

The Terraform here only defines:

- ECR repos for the three app images (`ecr.tf`)
- An empty ECS cluster (`ecs.tf`)

The pieces required to actually run a service are **missing**: VPC + subnets,
ALB + target groups + listeners, IAM execution/task roles, task definitions,
ECS services, autoscaling, log groups, Secrets Manager wiring, ACM cert.

Filling that in is a Phase 7+ activity (see the project roadmap). It's parked
here rather than deleted so the ECR repo names and conventions are preserved
for the eventual migration.

## When to revisit

Trigger to revive this path:

- Single t3a.small CPU sustained > 70%, **or**
- Operational burden of single-host outweighs the simplicity benefit

## How to revive

1. `git mv terraform_deferred terraform`
2. Add the missing infra (VPC, ALB, IAM, task defs, services, ASG)
3. Restore the original [`deploy.yml`](../.github/workflows/deploy.yml)
   contents from git history (`git log --diff-filter=M -p .github/workflows/deploy.yml`)
4. Decommission `infra/ec2/` once the ECS path is verified
