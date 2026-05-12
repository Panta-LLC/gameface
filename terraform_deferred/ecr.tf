// Create ECR repositories for each service
resource "aws_ecr_repository" "services" {
  for_each = toset(var.services)

  name                 = "${var.app_name}-${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
