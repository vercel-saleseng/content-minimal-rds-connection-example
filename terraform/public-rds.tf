# Instantiates simple RDS postgres instance using the default VPC
# This RDS will be publicly accessible to be used by Vercel without secure compute

## Variables
variable "db_password" {
  type        = string
  description = "The password for the database"
  sensitive   = true
}


## Resources
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 3.20.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

data "aws_availability_zones" "available" {}

module "vpc" {
  source               = "terraform-aws-modules/vpc/aws"
  version              = "5.8.1"
  name                 = "vercel"
  cidr                 = "10.0.0.0/16"
  azs                  = data.aws_availability_zones.available.names
  public_subnets       = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]
  enable_dns_hostnames = true
  enable_dns_support   = true
}

resource "aws_db_subnet_group" "vercel" {
  name       = "vercel"
  subnet_ids = module.vpc.public_subnets
  tags = {
    Name = "Vercel"
  }
}

resource "aws_security_group" "public_rds" {
  name   = "vercel_rds"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "vercel_rds"
  }
}

resource "aws_db_parameter_group" "vercel" {
  name   = "vercel"
  family = "postgres16"

  parameter {
    name  = "log_connections"
    value = "1"
  }
}

resource "aws_db_instance" "vercel" {
  identifier             = "vercel"
  instance_class         = "db.t3.micro"
  allocated_storage      = 5
  engine                 = "postgres"
  engine_version         = "16.2"
  username               = "vercel"
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.vercel.name
  vpc_security_group_ids = [aws_security_group.public_rds.id]
  parameter_group_name   = aws_db_parameter_group.vercel.name
  publicly_accessible    = true
  skip_final_snapshot    = true
}

## Outputs

output "rds_hostname" {
  description = "RDS instance hostname"
  value       = aws_db_instance.vercel.address
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.vercel.port
  sensitive   = true
}

output "rds_username" {
  description = "RDS instance root username"
  value       = aws_db_instance.vercel.username
  sensitive   = true
}
