# EC2 instance for Gameface (Terraform)

This folder contains a minimal Terraform scaffold to provision an Ubuntu EC2 instance prepared for deploying the Gameface Docker image.

Overview
- Creates an SSH key pair from a public key you provide.
- Creates a security group allowing SSH (22) and HTTP (80).
- Launches an Ubuntu instance with user-data that installs Docker and prepares the `ubuntu` user's `authorized_keys`.

Usage

1. Install Terraform and configure AWS credentials (environment or `~/.aws/credentials`).

2. Generate an SSH keypair locally (if you don't have one):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/gameface_deploy -C "gameface-deploy"
```

3. From `infra/ec2` run:

```bash
terraform init
terraform apply -var 'public_key=$(cat ~/.ssh/gameface_deploy.pub)' -auto-approve

Note: This Terraform scaffold now requires `subnet_id` to be provided. This ensures the instance is launched into the exact VPC/subnet you intend and prevents security-group/VPC mismatches. Example:

```bash
terraform init
terraform apply \
	-var "public_key=$(cat ~/.ssh/gameface_deploy.pub)" \
	-var "existing_sg_id=sg-0123456789abcdef0" \
	-var "subnet_id=subnet-0abc1234..." \
	-auto-approve
```

Notes about key provisioning and IAM permissions

- If your IAM user cannot call `ec2:ImportKeyPair` (permission error), this scaffold supports two alternate flows:

	1) Use an existing EC2 key pair name (created in the Console):

		 - Create/import a key pair in the EC2 Console (or ask your admin).
		 - Run Terraform passing `existing_key_name`:

			 ```bash
			 terraform apply -var 'public_key=$(cat ~/.ssh/gameface_deploy.pub)' -var 'existing_sg_id=sg-0123...' -var 'existing_key_name=my-existing-key' -auto-approve
			 ```

	2) Do not rely on `ImportKeyPair` at all — this scaffold also writes your provided public key into `/home/ubuntu/.ssh/authorized_keys` via instance `user_data`. That means you can omit `existing_key_name` and Terraform will inject your `public_key` into the instance at launch time (no `ec2:ImportKeyPair` required). Note: `user_data` is visible to anyone with Describe/console access to the instance, so treat this as less secure than a managed key pair.

Choose the option that matches your org's policies. If you want me to instead generate a key pair and provide manual steps to add its public key in the Console, I can produce that flow as well.
```

4. Outputs include `public_ip`, `public_dns`, and `ec2_ssh_user` (default `ubuntu`).

5. Add GitHub secrets (recommended):

```bash
gh secret set EC2_HOST --body "$(terraform output -raw public_dns)" --repo Panta-LLC/gameface
gh secret set EC2_USER --body "ubuntu" --repo Panta-LLC/gameface
gh secret set EC2_SSH_PRIVATE_KEY --body "$(cat ~/.ssh/gameface_deploy)" --repo Panta-LLC/gameface

If your IAM user is not allowed to create security groups (error: "not authorized to perform: ec2:CreateSecurityGroup"), create a security group manually in the AWS Console and pass its ID into Terraform instead of letting Terraform create one:

1. Create a security group in the AWS Console (EC2 → Security Groups) that allows SSH (22) and HTTP (80) from the IP ranges you need.
2. Run Terraform with the `existing_sg_id` variable:

```bash
terraform init
terraform apply -var 'public_key=$(cat ~/.ssh/gameface_deploy.pub)' -var 'existing_sg_id=sg-0123456789abcdef0' -auto-approve
```

This avoids the need for `ec2:CreateSecurityGroup` permission.

Ensure instance is launched in the same VPC

If Terraform still attempts to create the instance in a different VPC, provide a `subnet_id` that belongs to your VPC so the instance is launched into the correct VPC/subnet. Example:

1. Find a subnet in your VPC (`vpc-04f31c1b8e73c5e1d`) via the Console or CLI. CLI example (requires `ec2:DescribeSubnets` permission):

```bash
aws ec2 describe-subnets --filters Name=vpc-id,Values=vpc-04f31c1b8e73c5e1d \
	--query 'Subnets[*].{Id:SubnetId,AZ:AvailabilityZone,Cidr:CidrBlock}' --output table
```

2. Pick a subnet id (for example `subnet-0abc1234...`) and run Terraform:

```bash
cd infra/ec2
terraform init
terraform apply \
	-var "public_key=$(cat ~/.ssh/gameface_deploy.pub)" \
	-var "existing_sg_id=sg-0123456789abcdef0" \
	-var "subnet_id=subnet-0abc1234..." \
	-auto-approve
```

This ensures the instance launches into the subnet (and VPC) you selected, preventing the `InvalidGroup.NotFound` error caused by a security group living in a different VPC.
```

Notes
- This is a minimal example for quick staging. For production, use VPC, private subnets, IAM roles, instance profiles, and more secure secret handling (ECR + instance role or SSM).
