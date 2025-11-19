variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3a.small"
}

variable "public_key" {
  description = "Public SSH key contents to provision for access"
  type        = string
}

variable "existing_sg_id" {
  description = "Use an existing security group ID instead of creating one (optional)"
  type        = string
  default     = ""
}

variable "existing_key_name" {
  description = "Use an existing EC2 key pair name instead of importing a public key (optional)"
  type        = string
  default     = ""
}

variable "subnet_id" {
  description = "Launch the instance into this subnet ID (ensures correct VPC). This variable is required."
  type        = string

  validation {
    condition     = length(trimspace(var.subnet_id)) > 0
    error_message = "The variable 'subnet_id' is required. Pass -var 'subnet_id=subnet-...' to terraform apply."
  }
}

variable "ami" {
  description = "AMI id to use (Ubuntu 22.04 LTS)"
  type        = string
  default     = "ami-0d5eff06f840b45e9" # public Ubuntu 22.04 in us-west-2 (may change)
}
