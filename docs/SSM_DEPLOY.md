# Deploying via AWS SSM (Run Command)

This document explains how to use the `deploy-ssm.yml` GitHub Actions workflow that builds/pushes the `apps/api` Docker image and deploys it to an EC2 instance using AWS Systems Manager (SSM) Run Command.

## Why use SSM

- No public SSH port required.
- Works without an Elastic IP (no public IP needed if SSM connectivity is available).
- More auditable and secure than storing private keys in CI.

## Prerequisites

1. The target EC2 instance must have the SSM Agent installed and be registered with Systems Manager.
   - Amazon Linux / Ubuntu AMIs commonly include SSM Agent by default.
2. The instance must have an IAM instance profile (EC2 role) with the `AmazonSSMManagedInstanceCore` policy.
3. The repository must have these secrets configured:
   - `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (for pulling the image on the instance).
   - AWS credentials for the workflow: either `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (with permissions to call SSM) or configure `AWS_ROLE_ARN` to assume.

## How the workflow works

- `build-and-push` job: builds the Docker image from the repository root, pushes it to Docker Hub, and sets an output `image` with tag `repo/image:sha`.
- `deploy-via-ssm` job: uses `aws ssm send-command` with `AWS-RunShellScript` to execute a small sequence of commands on the instance: `docker login`, `docker pull`, stop/remove existing `gameface` container, and run the new container.

## Running the workflow (example)

From your machine (with `gh` CLI):

```bash
# Replace instance id and region
gh workflow run deploy-ssm.yml --ref main -f instance-id=i-06f1cab60f67ee02a -f aws-region=us-east-2
```

Or dispatch from the Actions UI and provide the `instance-id` and optional `aws-region`.

## Troubleshooting

- If the SSM command fails, verify the instance appears as a managed instance in the Systems Manager console.
- Confirm the instance's IAM role allows `ssm:SendCommand`, `ssm:GetCommandInvocation`, etc., and that your workflow credentials have permission to call SSM.
- You can view command output in the SSM console or with `aws ssm get-command-invocation --command-id <id> --instance-id <id>`.

## Optional: stable address

- The instance currently uses an ephemeral public IP. If you need a stable public IP for other purposes, allocate and associate an Elastic IP in the same region and attach it to the instance.

## Next steps I can do

- Add the workflow dispatch command to README or CI docs.
- Add an alternate workflow that looks up the instance by tag (if you prefer specifying a tag instead of instance-id).

If you'd like me to dispatch a test now (I won't run without your confirmation), say so and provide the instance-id to use.
