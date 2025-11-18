// Minimal ECS cluster scaffold. Tasks/services will be added later.
resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-cluster"
}

// Example placeholders for future resources (VPC, ALB, task defs)
// TODO: Add VPC module, ALB, IAM roles, task definitions, and service resources.
