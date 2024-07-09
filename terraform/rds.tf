# Instantiates simple RDS postgres instance using the default VPC
# This RDS will be publicly accessible to be used by Vercel without secure compute

## Variables

variable "db_password" {
  type        = string
  description = "The password for the database"
  sensitive   = true
}

variable "my_ip" {
  type        = string
  description = "Your IP address"
}

variable "secure_compute_ip_1" {
  type        = string
  description = "The IP address of the first Vercel secure compute instance"
}

variable "secure_compute_ip_2" {
  type        = string
  description = "The IP address of the second Vercel secure compute instance"
}

variable "bastion_key_pair" {
  type        = string
  description = "The key pair to use for the bastion instance"
}

locals {
  private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnet_cidrs  = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]
}

## Resources

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.50.0"
    }
  }

  backend "s3" {
    bucket = "terraform-state-vercel"
    key    = "rds/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

data "aws_availability_zones" "available" {}

### Networking + Security
### Set up VPC, subnets, security groups, and IAM roles

module "vpc" {
  source               = "terraform-aws-modules/vpc/aws"
  version              = "5.8.1"
  name                 = "vercel"
  cidr                 = "10.0.0.0/16"
  azs                  = data.aws_availability_zones.available.names
  private_subnets      = local.private_subnet_cidrs
  public_subnets       = local.public_subnet_cidrs
  enable_dns_hostnames = true
  enable_dns_support   = true
}

resource "aws_db_subnet_group" "vercel" {
  name       = "vercel"
  subnet_ids = module.vpc.private_subnets
  tags = {
    Name = "vercel_rds"
  }
}

resource "aws_security_group" "rds" {
  name   = "vercel_rds"
  vpc_id = module.vpc.vpc_id

  # Allows SSH connections from my IP
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["${var.my_ip}/32"]
  }

  # Allows my IP to connect to the RDS instance
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["${var.my_ip}/32"]
  }

  # Allows the secure compute instances to connect to the RDS instances
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["${var.secure_compute_ip_1}/32", "${var.secure_compute_ip_2}/32"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "vercel_rds"
  }
}

resource "aws_iam_role" "vercel_rds_role" {
  name = "vercel_rds_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3",
        Effect = "Allow",
        Action = "sts:AssumeRole",
        Principal = {
          Service = "s3.amazonaws.com"
        }
      },
      {
        Sid    = "AllowRDS",
        Effect = "Allow",
        Action = "sts:AssumeRole",
        Principal = {
          Service = "rds.amazonaws.com"
        }
      },
      {
        Sid    = "AllowSecretsManager",
        Effect = "Allow",
        Action = "sts:AssumeRole",
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
      },
      {
        Sid    = "AllowLambda",
        Effect = "Allow",
        Action = "sts:AssumeRole",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
      {
        Sid    = "AllowAPIGateway",
        Effect = "Allow",
        Action = "sts:AssumeRole",
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "vercel_rds"
  }
}

# Ensures the RDS Proxy has access to Secrets Manager for the DB credentials
resource "aws_iam_role_policy_attachment" "vercel_rds_proxy_policy_attachment" {
  role       = aws_iam_role.vercel_rds_role.name
  policy_arn = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
}

resource "aws_secretsmanager_secret" "vercel_rds_db_creds" {
  name = "vercel_rds_db_creds"
}

resource "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = aws_secretsmanager_secret.vercel_rds_db_creds.id
  secret_string = jsonencode({
    "username"             = "vercel"
    "password"             = var.db_password
    "engine"               = "postgres"
    "host"                 = aws_db_instance.vercel.address
    "port"                 = 5432
    "dbInstanceIdentifier" = "vercel"
  })
}

### RDS DB

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
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.vercel.name
  publicly_accessible    = false
  skip_final_snapshot    = true
}

### RDS Proxy
### Used to manage serverless connections to the RDS instance
### Vercel application will securely connect to the RDS instance through the proxy

resource "aws_db_proxy" "vercel_rds_proxy" {
  name                   = "vercel-rds-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.vercel_rds_role.arn
  vpc_security_group_ids = [aws_security_group.rds.id]
  vpc_subnet_ids         = module.vpc.public_subnets

  auth {
    auth_scheme = "SECRETS"
    description = "example"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.vercel_rds_db_creds.arn
  }

  tags = {
    Name = "vercel_rds"
  }
}

resource "aws_db_proxy_target" "vercel_rds_proxy_target" {
  db_instance_identifier = aws_db_instance.vercel.identifier
  db_proxy_name          = aws_db_proxy.vercel_rds_proxy.name
  target_group_name      = "default"
}

### S3
### Store the terraform state in S3

resource "aws_s3_bucket" "terraform_state" {
  bucket = "terraform-state-vercel"
}

resource "aws_s3_bucket_versioning" "terraform_state_versioning" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

### EC2
### Bastion instance to connect to the RDS instance

resource "aws_instance" "bastion" {
  ami                         = "ami-0bb84b8ffd87024d8"
  instance_type               = "t2.micro"
  subnet_id                   = module.vpc.public_subnets[0]
  vpc_security_group_ids      = [aws_security_group.rds.id]
  key_name                    = var.bastion_key_pair
  associate_public_ip_address = true

  tags = {
    Name = "vercel_bastion"
  }
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

output "bastion_ip" {
  description = "Bastion IP address"
  value       = aws_instance.bastion.public_ip
}

output "rds_username" {
  description = "RDS instance root username"
  value       = aws_db_instance.vercel.username
  sensitive   = true
}

output "rds_proxy_endpoint" {
  description = "RDS Proxy endpoint"
  value       = aws_db_proxy.vercel_rds_proxy.endpoint
}
