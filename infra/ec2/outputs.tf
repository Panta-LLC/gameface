output "public_ip" {
  value = aws_instance.gameface.public_ip
}

output "public_dns" {
  value = aws_instance.gameface.public_dns
}

output "ec2_ssh_user" {
  value = "ubuntu"
}
