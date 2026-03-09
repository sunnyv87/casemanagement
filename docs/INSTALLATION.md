# Installation Guide

## TechD SOC Case Management Platform

Complete installation guide from system requirements through production deployment.

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Start (Development)](#quick-start-development)
3. [Manual Installation](#manual-installation)
4. [Docker Compose Setup](#docker-compose-setup)
5. [Database Setup](#database-setup)
6. [Starting the Application](#starting-the-application)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Hardware

| Component | Development | Production |
|-----------|------------|------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk | 10 GB | 50+ GB |
| Network | Any | Dedicated NIC |

### Software Prerequisites

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | >= 18.0.0 | JavaScript runtime |
| **npm** | >= 9.0.0 | Package manager (ships with Node.js) |
| **PostgreSQL** | 15+ | Primary database |
| **Redis** | 7+ | Caching & session store |
| **RabbitMQ** | 3.x | Async message queue (optional) |
| **Docker** | 24+ | Container runtime (recommended) |
| **Docker Compose** | v2+ | Multi-container orchestration |
| **Git** | 2.x | Version control |

### Supported Operating Systems

- Ubuntu 20.04+ / Debian 11+
- CentOS 8+ / RHEL 8+
- macOS 12+ (Monterey)
- Windows 10+ with WSL2

---

## Quick Start (Development)

The fastest way to get the platform running locally.

### Step 1: Clone the Repository

```bash
git clone <repository-url> soc-platform
cd soc-platform
```

### Step 2: Start Infrastructure Services

```bash
docker-compose up -d
```

This starts PostgreSQL 15, Redis 7, and RabbitMQ 3 with management UI.

> **Screenshot Reference:** See [Docker Services Running](screenshots/01-docker-services.png)

### Step 3: Install Dependencies

```bash
# Install root workspace dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
cd ..
```

### Step 4: Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your settings. For local development, the defaults work with Docker Compose.

> **Screenshot Reference:** See [Environment Configuration](screenshots/02-env-config.png)

### Step 5: Initialize Database

```bash
# Run schema migrations
npm run db:migrate

# Seed sample data (includes demo users)
npm run db:seed
```

> **Screenshot Reference:** See [Database Migration Output](screenshots/03-db-migration.png)

### Step 6: Start Development Servers

```bash
# From project root - starts both backend and frontend concurrently
npm run dev
```

This starts:
- **Backend API** at `http://localhost:3001`
- **Frontend SPA** at `http://localhost:5173` (Vite dev server)

> **Screenshot Reference:** See [Dev Servers Running](screenshots/04-dev-servers.png)

### Step 7: Access the Platform

Open `http://localhost:5173` in your browser and log in with the default credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@techd.com | SecureP@ss123 |
| Manager | manager@techd.com | SecureP@ss123 |
| Analyst | analyst1@techd.com | SecureP@ss123 |
| Customer | john@acmefinancial.com | SecureP@ss123 |

> **Screenshot Reference:** See [Login Page](screenshots/05-login-page.png)

---

## Manual Installation

### Installing Node.js

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should show v20.x.x
```

**macOS (Homebrew):**
```bash
brew install node@20
node --version
```

**Windows (WSL2):**
Follow Ubuntu/Debian instructions inside WSL2.

### Installing PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-15
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER soc_user WITH PASSWORD 'soc_password';
CREATE DATABASE soc_platform OWNER soc_user;
GRANT ALL PRIVILEGES ON DATABASE soc_platform TO soc_user;
EOF
```

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
createuser -s soc_user
createdb -O soc_user soc_platform
```

### Installing Redis

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
redis-cli ping  # Should return PONG
```

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

### Installing RabbitMQ (Optional)

**Ubuntu/Debian:**
```bash
sudo apt-get install rabbitmq-server
sudo systemctl start rabbitmq-server
sudo rabbitmq-plugins enable rabbitmq_management
# Management UI: http://localhost:15672 (guest/guest)
```

**macOS (Homebrew):**
```bash
brew install rabbitmq
brew services start rabbitmq
```

---

## Docker Compose Setup

The included `docker-compose.yml` provides all infrastructure services:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: soc_platform
      POSTGRES_USER: soc_user
      POSTGRES_PASSWORD: soc_password
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - '5672:5672'      # AMQP protocol
      - '15672:15672'    # Management UI
volumes:
  pgdata:
```

### Docker Commands

```bash
# Start all services in background
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f rabbitmq

# Stop all services
docker-compose down

# Stop and remove data volumes (DESTRUCTIVE)
docker-compose down -v
```

### Verify Services

```bash
# PostgreSQL
docker-compose exec postgres pg_isready
# Output: /var/run/postgresql:5432 - accepting connections

# Redis
docker-compose exec redis redis-cli ping
# Output: PONG

# RabbitMQ Management UI
# Open http://localhost:15672 (guest/guest)
```

---

## Database Setup

### Running Migrations

Migrations create the full database schema including tables for users, customers, alerts, cases, integrations, SLA policies, audit logs, and notifications.

```bash
# From project root
npm run db:migrate

# Or from backend directory
cd backend && npm run db:migrate
```

The migration creates these core tables:

| Table | Purpose |
|-------|---------|
| `customers` | Multi-tenant customer organizations |
| `users` | Platform users with RBAC roles |
| `user_customer_assignments` | Many-to-many user-customer mapping |
| `siem_integrations` | SIEM/SOAR connector configurations |
| `alerts` | Normalized alerts from all platforms |
| `cases` | Case lifecycle records |
| `case_comments` | Case discussion thread |
| `case_attachments` | File attachments |
| `sla_policies` | Per-customer SLA configurations |
| `audit_logs` | Immutable audit trail |
| `notifications` | User notification queue |

### Seeding Sample Data

```bash
npm run db:seed
```

This creates:
- 4 demo users (Admin, Manager, Analyst, Customer)
- 3 customer organizations (Acme Financial, GlobalTech Manufacturing, CityPower Utilities)
- Sample SLA policies per customer
- Sample SIEM integration configurations

### Resetting the Database

```bash
# Drop and recreate (development only)
docker-compose exec postgres psql -U soc_user -d soc_platform -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-run migrations and seed
npm run db:migrate
npm run db:seed
```

---

## Starting the Application

### Development Mode

```bash
# Start everything (recommended)
npm run dev

# Or start individually:
npm run dev:backend    # Backend on :3001
npm run dev:frontend   # Frontend on :5173
```

### Production Build

```bash
# Build both backend and frontend
npm run build

# Build individually
npm run build:backend    # Compiles TypeScript to dist/
npm run build:frontend   # Builds static assets to dist/

# Start production backend
cd backend && npm start  # Runs node dist/server.js
```

### Running Tests

```bash
# Run all tests
npm test

# Run individually
npm run test:backend     # Jest tests
npm run test:frontend    # Vitest tests
```

### Linting

```bash
npm run lint              # Lint both
npm run lint:backend      # ESLint backend
npm run lint:frontend     # ESLint frontend
```

---

## Production Deployment

### Environment Hardening

1. **Generate secure secrets:**
```bash
# JWT Secret (256-bit)
openssl rand -base64 32

# Encryption Key (256-bit)
openssl rand -hex 32
```

2. **Set production environment variables:**
```bash
NODE_ENV=production
JWT_SECRET=<generated-secret>
ENCRYPTION_KEY=<generated-key>
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

3. **Database security:**
```bash
# Use a strong password for PostgreSQL
# Enable SSL connections
DATABASE_URL=postgresql://soc_user:<strong-password>@db-host:5432/soc_platform?sslmode=require
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name soc.techd.com;

    ssl_certificate /etc/ssl/certs/soc.techd.com.crt;
    ssl_certificate_key /etc/ssl/private/soc.techd.com.key;

    # Frontend (static files)
    location / {
        root /var/www/soc-platform/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Process Manager (PM2)

```bash
npm install -g pm2

# Start backend with PM2
cd backend
pm2 start dist/server.js --name soc-api --instances max

# Save and enable startup
pm2 save
pm2 startup
```

### Health Checks

```bash
# Backend health
curl http://localhost:3001/api/v1/health

# Database connectivity
curl http://localhost:3001/api/v1/health/db

# Redis connectivity
curl http://localhost:3001/api/v1/health/redis
```

---

## Troubleshooting

### Common Issues

#### Port already in use
```bash
# Find process using port 3001
lsof -i :3001
# Kill it
kill -9 <PID>
```

#### PostgreSQL connection refused
```bash
# Check if PostgreSQL is running
docker-compose ps postgres
# Check logs
docker-compose logs postgres
# Verify connection
docker-compose exec postgres pg_isready -U soc_user
```

#### Redis connection error
```bash
docker-compose ps redis
docker-compose exec redis redis-cli ping
```

#### Migration errors
```bash
# Check database exists
docker-compose exec postgres psql -U soc_user -d soc_platform -c "\dt"

# Check migration status
cd backend && npx knex migrate:status
```

#### Frontend build errors
```bash
# Clear node_modules and reinstall
rm -rf frontend/node_modules
cd frontend && npm install

# Clear Vite cache
rm -rf frontend/node_modules/.vite
```

#### Permission denied on uploads
```bash
mkdir -p backend/uploads
chmod 755 backend/uploads
```

### Logs

```bash
# Backend logs (development)
# Logs appear in terminal output via Winston logger

# Docker service logs
docker-compose logs -f --tail=100 postgres
docker-compose logs -f --tail=100 redis
docker-compose logs -f --tail=100 rabbitmq
```

---

**Next:** See [Configuration Guide](CONFIGURATION.md) for detailed environment variable reference and SIEM integration setup.
