# TechD SOC Case Management Platform

Multi-SIEM Alert Aggregation & Multi-Tenant Case Lifecycle Management

## Overview

The TechD SOC Case Management Platform is a centralized, multi-tenant hub that aggregates alerts and cases from multiple SIEM and SOAR platforms and provides a unified case lifecycle management experience for SOC teams managing multiple enterprise customers.

### Supported SIEM/SOAR Platforms

- **Securonix SNYPR** - REST API integration with JWT authentication
- **Seceon aiSIEM/OT** - REST API integration with API Key authentication
- **Splunk Enterprise Security** - REST API + Webhook (HEC) integration
- **FortiSOAR** - Bidirectional REST API integration with full CRUD support

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React SPA (Frontend)                │
│         Role-adaptive UI with TailwindCSS            │
├─────────────────────────────────────────────────────┤
│              API Gateway (Express.js)                │
│        JWT Auth | Rate Limiting | RBAC               │
├──────────┬──────────┬──────────┬────────────────────┤
│Securonix │ Seceon   │ Splunk   │ FortiSOAR          │
│Connector │Connector │Connector │Connector (BiDir)   │
├──────────┴──────────┴──────────┴────────────────────┤
│              Case Engine (Core Logic)                │
│    State Machine | SLA Engine | Notifications        │
├─────────────────────────────────────────────────────┤
│         PostgreSQL (RLS) | Redis | RabbitMQ          │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js + Express + TypeScript |
| Frontend | React 18 + TypeScript + Vite |
| Database | PostgreSQL 15+ with Row-Level Security |
| Cache | Redis |
| Queue | RabbitMQ |
| Auth | JWT + bcrypt + MFA (TOTP) |
| Styling | TailwindCSS |

## Quick Start

### Prerequisites

- Node.js >= 18
- PostgreSQL 15+
- Redis
- RabbitMQ (optional, for async processing)

### Using Docker Compose

```bash
# Start infrastructure services
docker-compose up -d

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Configure environment
cd backend && cp .env.example .env
# Edit .env with your settings

# Run database migrations
npm run db:migrate

# Seed sample data
npm run db:seed

# Start development servers
npm run dev
```

### Default Credentials (Seed Data)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@techd.com | SecureP@ss123 |
| Manager | manager@techd.com | SecureP@ss123 |
| Analyst | analyst1@techd.com | SecureP@ss123 |
| Customer | john@acmefinancial.com | SecureP@ss123 |

## RBAC Roles

| Role | Description |
|------|-------------|
| **Customer** | Read-only case access for their organization. Can add queries and approve closure. |
| **Analyst** | Operational role for assigned customers. Create, update, resolve cases. |
| **Manager** | Supervisory access across assigned customers. SLA config, escalation, reporting. |
| **Admin** | Full platform access. Customer onboarding, integrations, user management. |

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Current user profile

### Alerts
- `GET /api/v1/alerts` - List alerts with filtering
- `GET /api/v1/alerts/:id` - Alert detail
- `POST /api/v1/alerts` - Create manual alert
- `PATCH /api/v1/alerts/:id/assign` - Assign alert
- `PATCH /api/v1/alerts/:id/status` - Update status

### Cases
- `GET /api/v1/cases` - List cases
- `POST /api/v1/cases` - Create case
- `GET /api/v1/cases/:id` - Case detail with timeline
- `PATCH /api/v1/cases/:id` - Update case
- `POST /api/v1/cases/:id/comments` - Add comment
- `POST /api/v1/cases/:id/escalate` - Escalate case
- `POST /api/v1/cases/:id/close` - Close case

### Customers
- `GET /api/v1/customers` - List customers
- `POST /api/v1/customers` - Create customer (Admin)
- `GET /api/v1/customers/:id/sla-policies` - SLA policies

### Webhooks (SIEM Push)
- `POST /api/v1/webhooks/splunk` - Splunk HEC webhook
- `POST /api/v1/webhooks/fortisoar` - FortiSOAR webhook

### Dashboard
- `GET /api/v1/dashboard/analyst` - Analyst workbench
- `GET /api/v1/dashboard/manager` - Manager overview
- `GET /api/v1/dashboard/admin` - Admin console
- `GET /api/v1/dashboard/customer` - Customer portal

## Key Features

- **Unified Alert Queue**: Normalized alerts from 4 SIEM/SOAR platforms
- **Case Lifecycle**: Full state machine (New -> Assigned -> In Progress -> Resolved -> Closed)
- **SLA Engine**: Configurable per-customer SLA policies with breach detection
- **Multi-Tenant**: Strict data isolation with Row-Level Security
- **Bidirectional Sync**: FortiSOAR changes sync back automatically
- **Audit Trail**: Immutable append-only audit log for all state changes
- **Role-Adaptive UI**: Dashboard and permissions adapt to user role
- **MITRE ATT&CK**: Technique tagging for alerts and cases

## License

Proprietary - TechD Cybersecurity Limited
