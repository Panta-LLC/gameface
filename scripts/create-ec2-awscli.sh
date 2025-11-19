#!/usr/bin/env bash
set -euo pipefail

# Simple helper to create an EC2 instance for Gameface using AWS CLI.
# Requirements: aws CLI configured, jq, gh (optional, for setting secrets).

KEY_PATH="$HOME/.ssh/gameface_deploy"
PUB_KEY_PATH="${KEY_PATH}.pub"
INSTANCE_TYPE="t3a.small"
AMI="ami-0d5eff06f840b45e9" # Ubuntu 22.04 in us-west-2
REGION="us-west-2"

usage(){
  echo "Usage: $0 [--no-gh]"
  echo "  --no-gh    don't try to set GitHub secrets"
  exit 1
}

NO_GH=0
while [[ ${#} -gt 0 ]]; do
  case "$1" in
    --no-gh) NO_GH=1; shift ;;
    -h|--help) usage ;;
    *) shift ;;
  esac
done

if [[ ! -f "${KEY_PATH}" ]]; then
  echo "Generating SSH key at ${KEY_PATH}"
  ssh-keygen -t ed25519 -f "${KEY_PATH}" -N '' -C "gameface-deploy"
fi

PUB_KEY=$(cat "${PUB_KEY_PATH}")

echo "Creating EC2 key-pair in AWS from public key"
aws ec2 import-key-pair --key-name gameface-deploy-key --public-key-material "${PUB_KEY}" --region ${REGION} || true

echo "Creating security group (allow SSH & HTTP)"
SG_ID=$(aws ec2 create-security-group --group-name gameface-sg --description "gameface sg" --region ${REGION} --query 'GroupId' --output text 2>/dev/null || true)
if [[ -z "$SG_ID" || "$SG_ID" == "null" ]]; then
  SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=gameface-sg" --region ${REGION} --query 'SecurityGroups[0].GroupId' --output text)
fi
aws ec2 authorize-security-group-ingress --group-id ${SG_ID} --protocol tcp --port 22 --cidr 0.0.0.0/0 --region ${REGION} || true
aws ec2 authorize-security-group-ingress --group-id ${SG_ID} --protocol tcp --port 80 --cidr 0.0.0.0/0 --region ${REGION} || true

echo "Launching instance"
INSTANCE_ID=$(aws ec2 run-instances --image-id ${AMI} --count 1 --instance-type ${INSTANCE_TYPE} --key-name gameface-deploy-key --security-group-ids ${SG_ID} --region ${REGION} --query 'Instances[0].InstanceId' --output text)

echo "Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids ${INSTANCE_ID} --region ${REGION}

PUBLIC_DNS=$(aws ec2 describe-instances --instance-ids ${INSTANCE_ID} --region ${REGION} --query 'Reservations[0].Instances[0].PublicDnsName' --output text)
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids ${INSTANCE_ID} --region ${REGION} --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "Instance is up: ${PUBLIC_DNS} (${PUBLIC_IP})"

echo "Waiting for SSH to be available..."
for i in {1..30}; do
  if ssh -o StrictHostKeyChecking=no -i "${KEY_PATH}" ubuntu@${PUBLIC_DNS} 'echo ok' 2>/dev/null; then
    echo "SSH reachable"
    break
  fi
  sleep 5
done

echo "Installing Docker on remote host"
ssh -o StrictHostKeyChecking=no -i "${KEY_PATH}" ubuntu@${PUBLIC_DNS} <<'EOF'
set -e
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
EOF

echo "Remote Docker installed. You can now SSH using:"
echo "  ssh -i ${KEY_PATH} ubuntu@${PUBLIC_DNS}"

if [[ $NO_GH -eq 0 && $(command -v gh || echo) != "" ]]; then
  echo "Setting GitHub repo secrets (EC2_HOST, EC2_USER, EC2_SSH_PRIVATE_KEY)"
  gh secret set EC2_HOST --body "${PUBLIC_DNS}" --repo Panta-LLC/gameface || true
  gh secret set EC2_USER --body "ubuntu" --repo Panta-LLC/gameface || true
  gh secret set EC2_SSH_PRIVATE_KEY --body "$(cat ${KEY_PATH})" --repo Panta-LLC/gameface || true
  echo "GitHub secrets updated (if gh auth has access)."
else
  echo "Skipping GitHub secret set (gh CLI not available or --no-gh provided)."
fi

echo "Done."
