output "public_ip" {
  description = "Stable Elastic IP — point your DNS A-record at this."
  value       = aws_eip.gameface.public_ip
}

output "instance_public_dns" {
  description = "Per-instance DNS name (changes if the instance is replaced; prefer public_ip)."
  value       = aws_instance.gameface.public_dns
}

output "ec2_ssh_user" {
  value = "ubuntu"
}
