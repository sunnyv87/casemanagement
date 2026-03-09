import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://soc_user:soc_password@localhost:5432/soc_platform',
  pool: { min: 2, max: 10 },
});

async function migrate() {
  console.log('Running database migrations...');

  // Enable UUID extension
  await db.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await db.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Customers table
  if (!(await db.schema.hasTable('customers'))) {
    await db.schema.createTable('customers', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.string('code').unique().notNullable(); // e.g., CUST001
      table.string('industry');
      table.string('contact_name');
      table.string('contact_email');
      table.string('contact_phone');
      table.string('logo_url');
      table.string('primary_color').defaultTo('#2563eb');
      table.enum('status', ['active', 'suspended', 'inactive']).defaultTo('active');
      table.jsonb('settings').defaultTo('{}');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created customers table');
  }

  // Users table
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('phone');
      table.enum('role', ['customer', 'analyst', 'manager', 'admin']).notNullable();
      table.boolean('mfa_enabled').defaultTo(false);
      table.string('mfa_secret');
      table.enum('status', ['active', 'inactive', 'locked']).defaultTo('active');
      table.timestamp('last_login_at');
      table.integer('failed_login_attempts').defaultTo(0);
      table.timestamp('locked_until');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created users table');
  }

  // User-Customer assignments (multi-tenant)
  if (!(await db.schema.hasTable('user_customers'))) {
    await db.schema.createTable('user_customers', (table) => {
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('customer_id').references('id').inTable('customers').onDelete('CASCADE');
      table.primary(['user_id', 'customer_id']);
      table.timestamp('assigned_at').defaultTo(db.fn.now());
    });
    console.log('Created user_customers table');
  }

  // SIEM/SOAR Integrations
  if (!(await db.schema.hasTable('integrations'))) {
    await db.schema.createTable('integrations', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('customer_id').references('id').inTable('customers').onDelete('CASCADE');
      table.enum('platform', ['securonix', 'seceon', 'splunk', 'fortisoar']).notNullable();
      table.string('name').notNullable();
      table.string('base_url').notNullable();
      table.text('encrypted_credentials').notNullable(); // AES-256 encrypted
      table.enum('auth_type', ['bearer_token', 'api_key', 'basic', 'oauth2']).notNullable();
      table.enum('ingestion_mode', ['pull', 'push', 'both']).defaultTo('pull');
      table.integer('polling_interval_seconds').defaultTo(60);
      table.boolean('bidirectional_sync').defaultTo(false);
      table.enum('status', ['active', 'inactive', 'error']).defaultTo('active');
      table.string('last_error');
      table.timestamp('last_poll_at');
      table.string('last_poll_cursor');
      table.jsonb('config').defaultTo('{}');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created integrations table');
  }

  // Unified Alerts table
  if (!(await db.schema.hasTable('alerts'))) {
    await db.schema.createTable('alerts', (table) => {
      table.uuid('alert_id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.enum('source_platform', ['securonix', 'seceon', 'splunk', 'fortisoar', 'manual']).notNullable();
      table.string('source_alert_id').notNullable();
      table.uuid('customer_id').references('id').inTable('customers').onDelete('CASCADE').notNullable();
      table.string('alert_name').notNullable();
      table.string('alert_category');
      table.enum('severity', ['critical', 'high', 'medium', 'low', 'informational']).notNullable();
      table.enum('alert_status', ['new', 'in_progress', 'escalated', 'resolved', 'closed', 'false_positive']).defaultTo('new');
      table.string('source_ip');
      table.string('destination_ip');
      table.string('actor_entity');
      table.text('alert_description');
      table.integer('risk_score');
      table.timestamp('alert_created_at').notNullable();
      table.timestamp('ingested_at').defaultTo(db.fn.now());
      table.uuid('assigned_to').references('id').inTable('users');
      table.uuid('case_id');
      table.specificType('tags', 'text[]');
      table.specificType('mitre_techniques', 'text[]');
      table.jsonb('source_raw_json').notNullable();
      table.unique(['source_platform', 'source_alert_id', 'customer_id']);
      table.index(['customer_id']);
      table.index(['severity']);
      table.index(['alert_status']);
      table.index(['alert_created_at']);
      table.index(['assigned_to']);
    });
    console.log('Created alerts table');
  }

  // SLA Policies table
  if (!(await db.schema.hasTable('sla_policies'))) {
    await db.schema.createTable('sla_policies', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('customer_id').references('id').inTable('customers').onDelete('CASCADE');
      table.string('name').notNullable();
      table.integer('critical_response_minutes').notNullable().defaultTo(15);
      table.integer('critical_resolution_minutes').notNullable().defaultTo(240);
      table.integer('high_response_minutes').notNullable().defaultTo(30);
      table.integer('high_resolution_minutes').notNullable().defaultTo(480);
      table.integer('medium_response_minutes').notNullable().defaultTo(60);
      table.integer('medium_resolution_minutes').notNullable().defaultTo(1440);
      table.integer('low_response_minutes').notNullable().defaultTo(240);
      table.integer('low_resolution_minutes').notNullable().defaultTo(4320);
      table.boolean('pause_on_pending_customer').defaultTo(true);
      table.boolean('is_default').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created sla_policies table');
  }

  // Cases table
  if (!(await db.schema.hasTable('cases'))) {
    await db.schema.createTable('cases', (table) => {
      table.uuid('case_id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('case_number').unique().notNullable();
      table.uuid('customer_id').references('id').inTable('customers').onDelete('CASCADE').notNullable();
      table.string('title').notNullable();
      table.text('description');
      table.enum('case_type', ['incident', 'investigation', 'service_request', 'false_positive']).defaultTo('incident');
      table.enum('severity', ['critical', 'high', 'medium', 'low']).notNullable();
      table.enum('priority', ['P1', 'P2', 'P3', 'P4']).notNullable();
      table.enum('status', ['new', 'assigned', 'in_progress', 'pending_customer', 'escalated', 'resolved', 'closed']).defaultTo('new');
      table.specificType('source_alerts', 'uuid[]');
      table.specificType('source_platforms', 'text[]');
      table.uuid('assigned_analyst_id').references('id').inTable('users');
      table.uuid('escalated_to_id').references('id').inTable('users');
      table.uuid('sla_policy_id').references('id').inTable('sla_policies');
      table.timestamp('sla_response_due_at');
      table.timestamp('sla_resolution_due_at');
      table.boolean('sla_response_breached').defaultTo(false);
      table.boolean('sla_resolution_breached').defaultTo(false);
      table.timestamp('sla_paused_at');
      table.integer('sla_paused_duration_minutes').defaultTo(0);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
      table.timestamp('first_responded_at');
      table.timestamp('resolved_at');
      table.text('resolution_notes');
      table.text('root_cause');
      table.specificType('mitre_mapping', 'text[]');
      table.specificType('evidence', 'uuid[]');
      table.specificType('tags', 'text[]');
      table.index(['customer_id']);
      table.index(['status']);
      table.index(['severity']);
      table.index(['assigned_analyst_id']);
      table.index(['created_at']);
    });
    console.log('Created cases table');

    // Add foreign key from alerts to cases
    await db.schema.alterTable('alerts', (table) => {
      table.foreign('case_id').references('case_id').inTable('cases');
    });
  }

  // Case relationships (parent-child, peer)
  if (!(await db.schema.hasTable('case_relationships'))) {
    await db.schema.createTable('case_relationships', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('source_case_id').references('case_id').inTable('cases').onDelete('CASCADE');
      table.uuid('target_case_id').references('case_id').inTable('cases').onDelete('CASCADE');
      table.enum('relationship_type', ['parent_child', 'peer']).notNullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('Created case_relationships table');
  }

  // Case comments/activity timeline
  if (!(await db.schema.hasTable('case_comments'))) {
    await db.schema.createTable('case_comments', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('case_id').references('case_id').inTable('cases').onDelete('CASCADE').notNullable();
      table.uuid('user_id').references('id').inTable('users').notNullable();
      table.enum('comment_type', ['comment', 'status_change', 'assignment', 'escalation', 'system', 'customer_query']).defaultTo('comment');
      table.text('content').notNullable();
      table.boolean('is_internal').defaultTo(false); // Internal notes not visible to customer
      table.jsonb('metadata').defaultTo('{}');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.index(['case_id']);
    });
    console.log('Created case_comments table');
  }

  // Evidence/attachments
  if (!(await db.schema.hasTable('attachments'))) {
    await db.schema.createTable('attachments', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('case_id').references('case_id').inTable('cases').onDelete('CASCADE');
      table.uuid('uploaded_by').references('id').inTable('users');
      table.string('filename').notNullable();
      table.string('original_filename').notNullable();
      table.string('mime_type').notNullable();
      table.integer('file_size').notNullable();
      table.string('storage_path').notNullable();
      table.string('checksum'); // SHA-256
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('Created attachments table');
  }

  // Case templates
  if (!(await db.schema.hasTable('case_templates'))) {
    await db.schema.createTable('case_templates', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.text('description');
      table.enum('incident_type', ['ransomware', 'phishing', 'unauthorized_access', 'data_exfiltration', 'ddos', 'malware', 'insider_threat', 'other']).notNullable();
      table.enum('default_severity', ['critical', 'high', 'medium', 'low']).notNullable();
      table.enum('default_priority', ['P1', 'P2', 'P3', 'P4']).notNullable();
      table.jsonb('workflow_steps').defaultTo('[]');
      table.specificType('default_tags', 'text[]');
      table.specificType('default_mitre_techniques', 'text[]');
      table.uuid('created_by').references('id').inTable('users');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created case_templates table');
  }

  // Notification preferences
  if (!(await db.schema.hasTable('notification_preferences'))) {
    await db.schema.createTable('notification_preferences', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.boolean('email_enabled').defaultTo(true);
      table.boolean('in_app_enabled').defaultTo(true);
      table.boolean('sms_enabled').defaultTo(false);
      table.string('sms_phone');
      table.jsonb('event_preferences').defaultTo('{}');
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created notification_preferences table');
  }

  // Notifications
  if (!(await db.schema.hasTable('notifications'))) {
    await db.schema.createTable('notifications', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      table.string('title').notNullable();
      table.text('message').notNullable();
      table.enum('type', ['alert', 'case', 'sla', 'system', 'escalation']).notNullable();
      table.enum('severity', ['critical', 'high', 'medium', 'low', 'info']).defaultTo('info');
      table.string('link');
      table.boolean('read').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('read_at');
      table.index(['user_id', 'read']);
    });
    console.log('Created notifications table');
  }

  // Audit logs (immutable - append only)
  if (!(await db.schema.hasTable('audit_logs'))) {
    await db.schema.createTable('audit_logs', (table) => {
      table.uuid('audit_id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('event_type').notNullable();
      table.uuid('customer_id');
      table.uuid('actor_user_id');
      table.string('actor_role');
      table.string('target_entity_type');
      table.uuid('target_entity_id');
      table.jsonb('old_value');
      table.jsonb('new_value');
      table.string('ip_address');
      table.string('user_agent');
      table.timestamp('timestamp').defaultTo(db.fn.now());
      table.index(['customer_id']);
      table.index(['actor_user_id']);
      table.index(['event_type']);
      table.index(['timestamp']);
      table.index(['target_entity_type', 'target_entity_id']);
    });
    console.log('Created audit_logs table');
  }

  // Auto-case-creation rules
  if (!(await db.schema.hasTable('auto_case_rules'))) {
    await db.schema.createTable('auto_case_rules', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('customer_id').references('id').inTable('customers').onDelete('CASCADE');
      table.string('name').notNullable();
      table.jsonb('conditions').notNullable(); // e.g., {severity: "critical", lookback_hours: 4}
      table.boolean('enabled').defaultTo(true);
      table.uuid('assign_to_template_id').references('id').inTable('case_templates');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created auto_case_rules table');
  }

  // Refresh tokens
  if (!(await db.schema.hasTable('refresh_tokens'))) {
    await db.schema.createTable('refresh_tokens', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('token_hash').unique().notNullable();
      table.timestamp('expires_at').notNullable();
      table.boolean('revoked').defaultTo(false);
      table.string('ip_address');
      table.string('user_agent');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('Created refresh_tokens table');
  }

  // Create RLS policies (simulated via views/middleware since we use knex)
  // In production, these would be actual PostgreSQL RLS policies
  console.log('');
  console.log('All migrations completed successfully!');
  await db.destroy();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
