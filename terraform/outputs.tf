output "ecr_repository_urls" {
  description = "Map of service -> ECR repository URLs"
  value = { for k, r in aws_ecr_repository.services : k => r.repository_url }
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}
