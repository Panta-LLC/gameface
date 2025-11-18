# GitHub Actions — Setup Guide (ECR push & Terraform)

This document describes the minimal steps to configure GitHub Actions to build and push Docker images to ECR and run Terraform from the workflow included in `.github/workflows/deploy.yml`.

High-level steps
- Create an AWS IAM role for GitHub OIDC (recommended) or an IAM user with access keys.
- Attach a permissions policy that allows ECR push and Terraform to provision the intended infra.
- Add repository secrets in GitHub: `AWS_ROLE_ARN` (or access keys), `AWS_REGION`, `APP_NAME`.
- Trigger the workflow from the Actions tab or push to `main`.

1) Recommended: Use GitHub OIDC (no long-lived AWS keys)

- Create an IAM role that trusts GitHub's OIDC provider `token.actions.githubusercontent.com`.
- Use a trust policy similar to this (replace `ACCOUNT_ID`, `OWNER`, `REPO` and branch `refs/heads/main` as needed):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Notes:
- The `sub` condition ensures only the `main` branch of `OWNER/REPO` can assume the role. To allow all branches or workflows adjust accordingly (for PRs you might also include `refs/pull/*/merge`).

2) Minimal permissions (example)

For an initial, working setup you can attach broad privileges; but you should tighten them later. Two options:

- Quick (broad): attach `AdministratorAccess` to the role (fast but wide).
- Minimal (recommended to tighten later): create and attach a policy that includes at least:

  - ECR: `CreateRepository`, `DescribeRepositories`, `GetAuthorizationToken`, `BatchCheckLayerAvailability`, `InitiateLayerUpload`, `UploadLayerPart`, `CompleteLayerUpload`, `PutImage`, `BatchGetImage`.
  - ECS: `CreateCluster`, `RegisterTaskDefinition`, `CreateService`, `UpdateService`, `Describe*`, `List*`.
  - IAM: `PassRole` (for ECS Task roles) — limit to specific roles when possible.
  - CloudWatch/Logs: `CreateLogGroup`, `CreateLogStream`, `PutLogEvents`.
  - EC2/VPC: any actions Terraform needs if you plan to manage networking (or run Terraform from a more-privileged account).

Attach whichever policy fits your security model. For early testing you can use `AdministratorAccess` and then create a scoped policy later.

3) Add repository secrets in GitHub

- In the repository, go to `Settings` → `Secrets and variables` → `Actions` → `New repository secret`.
- Add the following secrets used by the workflow:
  - `AWS_ROLE_ARN` — ARN of the IAM role you created for GitHub Actions (if using OIDC). If you used access keys instead, add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` instead of `AWS_ROLE_ARN`.
  - `AWS_REGION` — e.g. `us-east-1`.
  - `APP_NAME` — used by the Terraform variables and ECR repo naming (default `gameface`).

If you prefer using AWS access keys (less recommended):
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`

4) Validate locally (optional)

- Before running the workflow, you can test the `scripts/push-to-ecr.sh` locally (requires AWS CLI configured):

```bash
chmod +x ./scripts/push-to-ecr.sh
./scripts/push-to-ecr.sh us-east-1 gameface
```

This will create ECR repos if missing and attempt to push any local images named `gameface-api`, `gameface-signaling`, `gameface-web`.

5) Triggering the workflow

- Once secrets are set, go to the repository's Actions tab and run the `Build and Deploy to ECR + Terraform` workflow manually (Workflow dispatch) or push to `main`.
- Monitor the run logs in Actions; errors will show which permissions are missing (e.g., `AccessDenied` for ECR create/push).

6) Troubleshooting hints

- If ECR push fails with `AccessDenied`, ensure `ecr:CreateRepository` and `ecr:PutImage` are allowed by the role.
- If Terraform fails, the role may not have enough permissions to create VPC/EC2/ECS resources — consider splitting Terraform runs into a separate workflow with a more privileged role.

7) Cleanup and security

- After you validate the pipeline, replace wide permissions with least-privilege IAM policies and restrict the role `Condition` to the branches/workflows/PRs required.

If you want, I can:
- Produce a minimal IAM policy JSON you can paste into the AWS console, or
- Create a Terraform module to provision the IAM role and attach the policy (so your infra is declarative).

---
End of guide — tell me if you want the IAM policy JSON or the Terraform role module and I will add it.
