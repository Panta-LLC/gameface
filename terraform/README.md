Terraform scaffold for deploying `gameface` services to AWS.

How to use (local):

1. Install Terraform and AWS CLI, and configure AWS credentials:

   - `aws configure`

2. Initialize Terraform and create plan:

   ```sh
   cd terraform
   terraform init
   terraform plan -var="aws_region=us-west-2"
   ```

3. Apply (this will create ECR repos and an ECS cluster):

   ```sh
   terraform apply -var="aws_region=us-west-2" -auto-approve
   ```

Notes and next steps:

- This is a starting scaffold. You'll likely want to add a VPC module, ALB, task definitions, IAM roles, Secrets Manager resources, and Autoscaling.
- The `ecr.tf` creates repo names `${var.app_name}-api`, `${var.app_name}-signaling`, `${var.app_name}-web` which the push script uses.
