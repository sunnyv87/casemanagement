# Configuration Guide

## TechD SOC Case Management Platform

Comprehensive configuration reference for environment variables, SIEM/SOAR integrations, RBAC, SLA policies, and platform settings.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [SIEM/SOAR Integration Setup](#siemsoar-integration-setup)
3. [Authentication & Security](#authentication--security)
4. [RBAC Configuration](#rbac-configuration)
5. [SLA Policy Configuration](#sla-policy-configuration)
6. [Email & Notifications](#email--notifications)
7. [Database Configuration](#database-configuration)
8. [Redis Configuration](#redis-configuration)
9. [RabbitMQ Configuration](#rabbitmq-configuration)
10. [Frontend Configuration](#frontend-configuration)

---

## Environment Variables

All backend configuration is managed through environment variables. Copy the template and customize:

```bash
cd backend
cp .env.example .env
```

### Complete Variable Reference

#### Server Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend API server port |
| `NODE_ENV` | `development` | Environment: `development`, `production`, `test` |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend origin for CORS |

#### Database (PostgreSQL)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://soc_user:soc_password@localhost:5432/soc_platform` | Full PostgreSQL connection URI |
| `DB_POOL_MIN` | `2` | Minimum connection pool size |
| `DB_POOL_MAX` | `10` | Maximum connection pool size |

> **Production Tip:** Set `DB_POOL_MAX` to roughly 2x your CPU cores. Enable SSL with `?sslmode=require` in the URL.

#### Cache (Redis)

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URI |

#### Authentication (JWT)

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `your-jwt-secret-key-change-in-production` | Secret key for signing JWTs |
| `JWT_EXPIRY` | `15m` | Access token expiration (e.g., `15m`, `1h`) |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token expiration (e.g., `7d`, `30d`) |

> **CRITICAL:** Always change `JWT_SECRET` in production. Use `openssl rand -base64 32` to generate.

#### Message Queue (RabbitMQ)

| Variable | Default | Description |
|----------|---------|-------------|
| `RABBITMQ_URL` | `amqp://localhost:5672` | RabbitMQ AMQP connection URI |

#### Email (SMTP)

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | `smtp.example.com` | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_USER` | `notifications@techd.com` | SMTP authentication username |
| `SMTP_PASS` | `your-smtp-password` | SMTP authentication password |
| `SMTP_FROM` | `SOC Platform <notifications@techd.com>` | Default sender address |

#### Security

| Variable | Default | Description |
|----------|---------|-------------|
| `ENCRYPTION_KEY` | `your-256-bit-encryption-key-change-in-production` | AES-256 key for encrypting sensitive data (SIEM credentials) |

> **CRITICAL:** Always change `ENCRYPTION_KEY` in production. Use `openssl rand -hex 32` to generate a 256-bit key.

#### File Upload

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_FILE_SIZE` | `26214400` | Maximum upload size in bytes (25 MB) |
| `UPLOAD_DIR` | `./uploads` | File upload storage directory |

> **Screenshot Reference:** See [Environment Configuration](screenshots/02-env-config.png)

---

## SIEM/SOAR Integration Setup

The platform supports four SIEM/SOAR platforms. Integrations are configured per-customer through the Admin UI or API.

> **Screenshot Reference:** See [Integrations Page](screenshots/08-integrations-page.png)

### Securonix SNYPR

```
Platform:      securonix
Auth Type:     bearer_token
Ingestion:     pull (polling)
```

**Configuration Steps:**

1. Navigate to **Integrations** > **Add Integration**
2. Select platform: **Securonix SNYPR**
3. Enter the base URL: `https://<tenant>.securonix.net/Snypr`
4. Auth type: **Bearer Token**
5. Enter API token from Securonix admin console
6. Set polling interval (minimum 60 seconds recommended)

**Required Securonix Permissions:**
- `incidents.read` - Read incidents/violations
- `incidents.write` - Update incident status (for bidirectional sync)
- `lookup.read` - Read lookup tables for enrichment

### Seceon aiSIEM/OT

```
Platform:      seceon
Auth Type:     api_key
Ingestion:     pull (polling)
```

**Configuration Steps:**

1. Navigate to **Integrations** > **Add Integration**
2. Select platform: **Seceon aiSIEM**
3. Enter the base URL: `https://<instance>.seceon.com/api`
4. Auth type: **API Key**
5. Enter the API key from Seceon portal
6. Set polling interval (minimum 60 seconds recommended)

**Required Seceon Permissions:**
- Read access to alerts and threats
- Access to asset inventory for enrichment

### Splunk Enterprise Security

```
Platform:      splunk
Auth Type:     bearer_token
Ingestion:     pull + push (webhook via HEC)
```

**Configuration Steps:**

1. Navigate to **Integrations** > **Add Integration**
2. Select platform: **Splunk Enterprise Security**
3. Enter the base URL: `https://<splunk-host>:8089`
4. Auth type: **Bearer Token** (Splunk auth token)
5. Mode: **Both** (pull + push)
6. Configure Splunk HEC to send alerts to: `POST /api/v1/webhooks/splunk`

**Splunk HEC Webhook Setup:**

In Splunk, create an alert action that sends events to:
```
URL: https://<soc-platform>/api/v1/webhooks/splunk
Method: POST
Content-Type: application/json
Authorization: Bearer <webhook-token>
```

### FortiSOAR

```
Platform:      fortisoar
Auth Type:     basic / bearer_token
Ingestion:     pull + push (bidirectional)
Bidirectional: Yes (status & notes sync back)
```

**Configuration Steps:**

1. Navigate to **Integrations** > **Add Integration**
2. Select platform: **FortiSOAR**
3. Enter the base URL: `https://<fortisoar-host>/api/3`
4. Auth type: **Basic Auth** or **Bearer Token**
5. Mode: **Both** (pull + push)
6. Enable **Bidirectional Sync** toggle
7. Configure FortiSOAR webhook to: `POST /api/v1/webhooks/fortisoar`

**FortiSOAR Bidirectional Sync:**

When enabled, the following actions sync back to FortiSOAR:
- Case status changes (e.g., In Progress, Resolved, Closed)
- Analyst notes and comments
- Severity/priority updates
- Closure details and resolution notes

**FortiSOAR Webhook Setup:**

Create a FortiSOAR playbook that sends events to:
```
URL: https://<soc-platform>/api/v1/webhooks/fortisoar
Method: POST
Content-Type: application/json
```

### Testing Connectivity

After creating an integration, click the **Test** button on the integration card to verify connectivity.

> **Screenshot Reference:** See [Integration Test](screenshots/09-integration-test.png)

---

## Authentication & Security

### JWT Token Flow

```
1. User submits credentials → POST /api/v1/auth/login
2. Server validates credentials and returns:
   - access_token (short-lived, 15min default)
   - refresh_token (long-lived, 7 days default)
3. Client includes access_token in Authorization header:
   Authorization: Bearer <access_token>
4. On token expiry → POST /api/v1/auth/refresh with refresh_token
5. Server issues new token pair
```

### Multi-Factor Authentication (MFA)

MFA uses TOTP (Time-based One-Time Password) compatible with:
- Google Authenticator
- Microsoft Authenticator
- Authy
- Any TOTP-compatible app

**Enabling MFA:**
1. Log in to the platform
2. Navigate to Profile settings
3. Click **Enable MFA**
4. Scan QR code with authenticator app
5. Enter verification code to confirm

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /api/v1/auth/login` | 5 requests per 15 minutes |
| All API endpoints | 100 requests per 15 minutes |
| Webhook endpoints | 500 requests per minute |

### Security Headers

The platform uses Helmet.js for security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (in production)
- `Content-Security-Policy` (configured for SPA)

---

## RBAC Configuration

### Role Permissions Matrix

| Feature | Customer | Analyst | Manager | Admin |
|---------|----------|---------|---------|-------|
| **Dashboard** | Customer Portal | Analyst Workbench | Manager Overview | Admin Console |
| **Alert Queue** | - | View, Assign, Update | View, Assign, Update | Full Access |
| **Cases** | View Own | Create, Update, Resolve | Full + Escalate | Full Access |
| **Customers** | - | - | View Assigned | Full CRUD |
| **Users** | - | - | - | Full CRUD |
| **Integrations** | - | - | - | Full CRUD |
| **Reports** | View Own | - | View Assigned | View All |
| **Audit Logs** | - | - | View | View All |

> **Screenshot Reference:** See [Role-Adaptive Dashboard](screenshots/06-dashboard.png)

### Navigation Visibility by Role

| Navigation Item | Customer | Analyst | Manager | Admin |
|----------------|----------|---------|---------|-------|
| Dashboard | Yes | Yes | Yes | Yes |
| Alert Queue | - | Yes | Yes | Yes |
| Cases | Yes | Yes | Yes | Yes |
| Customers | - | - | Yes | Yes |
| Users | - | - | - | Yes |
| Integrations | - | - | - | Yes |
| Reports | Yes | - | Yes | Yes |
| Audit Logs | - | - | Yes | Yes |

### Multi-Tenant Data Isolation

- **Row-Level Security (RLS)** in PostgreSQL ensures customers only see their own data
- Analysts and Managers see data for their assigned customers only
- Admins have platform-wide access
- All data queries are automatically filtered by the user's customer assignments

---

## SLA Policy Configuration

SLA policies are configured per-customer and define response and resolution time targets by severity.

### Default SLA Targets

| Severity | Response Time | Resolution Time |
|----------|--------------|-----------------|
| Critical (P1) | 15 minutes | 4 hours |
| High (P2) | 30 minutes | 8 hours |
| Medium (P3) | 2 hours | 24 hours |
| Low (P4) | 8 hours | 72 hours |

### Creating SLA Policies

Via the API:
```bash
POST /api/v1/customers/:customerId/sla-policies
Content-Type: application/json

{
  "severity": "critical",
  "response_time_minutes": 15,
  "resolution_time_minutes": 240,
  "business_hours_only": false,
  "notification_escalation_minutes": [10, 30, 60]
}
```

### SLA Breach Handling

When an SLA is breached:
1. Case is flagged with `sla_response_breached` or `sla_resolution_breached`
2. Notification sent to assigned analyst
3. Escalation notification sent to manager
4. Breach appears in Dashboard and Reports

> **Screenshot Reference:** See [SLA Indicators in Cases](screenshots/07-cases-page.png)

---

## Email & Notifications

### SMTP Configuration

For **Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

For **Microsoft 365:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASS=your-password
```

For **Amazon SES:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIA...
SMTP_PASS=your-ses-smtp-password
```

### Notification Events

| Event | Recipients | Channel |
|-------|-----------|---------|
| New alert ingested | Assigned analysts | In-app + Email |
| Case assigned | Assigned analyst | In-app + Email |
| Case escalated | Manager | In-app + Email |
| SLA breach warning | Analyst + Manager | In-app + Email |
| SLA breached | Analyst + Manager + Admin | In-app + Email |
| Case resolved | Customer contact | Email |
| Case closed | Customer contact | Email |

---

## Database Configuration

### Connection Pool Tuning

```env
# Development
DB_POOL_MIN=2
DB_POOL_MAX=10

# Production (adjust based on server capacity)
DB_POOL_MIN=5
DB_POOL_MAX=25
```

### PostgreSQL Performance Tuning

For production PostgreSQL, add these to `postgresql.conf`:

```ini
# Memory
shared_buffers = 2GB              # 25% of RAM
effective_cache_size = 6GB        # 75% of RAM
work_mem = 64MB

# WAL
wal_level = replica
max_wal_size = 2GB

# Query Planning
random_page_cost = 1.1            # For SSD storage
effective_io_concurrency = 200    # For SSD storage

# Logging
log_min_duration_statement = 1000  # Log queries > 1s
```

### Backup Strategy

```bash
# Daily automated backup
pg_dump -U soc_user -h localhost soc_platform | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore from backup
gunzip -c backup_20240115.sql.gz | psql -U soc_user -h localhost soc_platform
```

---

## Redis Configuration

### Cache Settings

Redis is used for:
- **Session tokens** - Refresh token storage and blacklisting
- **API response caching** - Dashboard data, customer lists
- **Rate limit counters** - Per-IP and per-user rate limiting

### Redis Security (Production)

```env
# With authentication
REDIS_URL=redis://:your-redis-password@redis-host:6379/0

# With TLS
REDIS_URL=rediss://:your-redis-password@redis-host:6380/0
```

---

## RabbitMQ Configuration

### Queue Architecture

| Queue | Purpose | Consumers |
|-------|---------|-----------|
| `alert.ingest` | New alerts from SIEM polling | Alert processing service |
| `notification.send` | Outbound email notifications | Email service |
| `integration.sync` | Bidirectional sync operations | Connector manager |

### RabbitMQ Management

- **Management UI:** http://localhost:15672
- **Default credentials:** guest / guest
- **Production:** Create dedicated user with limited permissions

```bash
# Create production user
rabbitmqctl add_user soc_app secure_password
rabbitmqctl set_permissions -p / soc_app "^soc\." "^soc\." "^soc\."
```

```env
RABBITMQ_URL=amqp://soc_app:secure_password@rabbitmq-host:5672
```

---

## Frontend Configuration

### Vite Configuration

The frontend is configured via `frontend/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'  // Proxy API calls to backend
    }
  }
});
```

### TailwindCSS Theme

The platform uses a custom color scheme defined in `frontend/tailwind.config.js`:

- **Primary color:** Blue (#3b82f6 family) - Used for navigation, buttons, links
- **Severity colors:** Red (critical), Orange (high), Yellow (medium), Green (low)
- **Status colors:** Color-coded by case lifecycle stage

### API Client Configuration

The Axios client in `frontend/src/lib/api.ts` handles:
- Base URL configuration
- JWT token injection via interceptors
- Automatic token refresh on 401 responses
- Request/response error handling

---

**Next:** See [User Guide](USER_GUIDE.md) for feature walkthroughs with screenshots.
