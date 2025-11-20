#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/push-to-ecr.sh <aws-region> <app-name>
AWS_REGION=${1:-us-west-2}
APP_NAME=${2:-gameface}

echo "Using AWS region: $AWS_REGION, app name: $APP_NAME"

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI required. Install and configure credentials (aws configure)." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker required." >&2
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account: $ACCOUNT_ID"

services=(api signaling web)
echo "Ensuring ECR repositories exist..."
for svc in "${services[@]}"; do
  repo_name="${APP_NAME}-${svc}"
  echo "Creating repo: $repo_name (if not exists)"
  aws ecr describe-repositories --repository-names "$repo_name" --region "$AWS_REGION" >/dev/null 2>&1 || \
    aws ecr create-repository --repository-name "$repo_name" --region "$AWS_REGION" >/dev/null
done

echo "Logging into ECR"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

TAG=$(git rev-parse --short HEAD 2>/dev/null || echo latest)

echo "Building and pushing images with buildx (tag: ${TAG})"
for svc in "${services[@]}"; do
  # Use the repository root as the build context so root-level files
  # (e.g. tsconfig.base.json) are available inside the Docker build.
  context_dir="."
  dockerfile_path="./apps/$svc/Dockerfile"
  if [ ! -f "$dockerfile_path" ]; then
    echo "Warning: Dockerfile not found for service '$svc' at $dockerfile_path; skipping"
    continue
  fi

  remote_repo="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-${svc}:${TAG}"
  echo "Building $svc -> $remote_repo (context: $context_dir, dockerfile: $dockerfile_path)"

  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --file "$dockerfile_path" \
    --tag "$remote_repo" \
    --push "$context_dir"
done

echo "All images built and pushed."
