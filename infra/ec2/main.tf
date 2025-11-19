terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.3.0"
}

provider "aws" {
  region = var.aws_region
}

# Lookup the latest Ubuntu 22.04 LTS (Jammy) AMI for the region
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "gameface_sg" {
  count       = var.existing_sg_id == "" ? 1 : 0
  name        = "gameface-sg"
  description = "Allow SSH and HTTP inbound"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

locals {
  sg_id = var.existing_sg_id != "" ? var.existing_sg_id : aws_security_group.gameface_sg[0].id
}

resource "aws_instance" "gameface" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  key_name                    = var.existing_key_name != "" ? var.existing_key_name : null
  subnet_id                   = var.subnet_id != "" ? var.subnet_id : null
  vpc_security_group_ids      = [local.sg_id]
  associate_public_ip_address = true

  user_data = <<-EOF
              #!/bin/bash
              set -e
              apt-get update
              apt-get install -y docker.io
              systemctl enable --now docker
              mkdir -p /home/ubuntu/.ssh
              if [ -n "${var.public_key}" ]; then
                echo "${replace(var.public_key, "\n", "\n")}" >> /home/ubuntu/.ssh/authorized_keys
              fi
              chown -R ubuntu:ubuntu /home/ubuntu/.ssh
              chmod 700 /home/ubuntu/.ssh
              chmod 600 /home/ubuntu/.ssh/authorized_keys || true
              EOF

  tags = {
    Name = "gameface-deploy"
  }
}
