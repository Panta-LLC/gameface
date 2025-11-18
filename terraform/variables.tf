variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name prefix for resources"
  type        = string
  default     = "gameface"
}

variable "services" {
  description = "List of service names to create ECR repos for"
  type        = list(string)
  default     = ["api", "signaling", "web"]
}
