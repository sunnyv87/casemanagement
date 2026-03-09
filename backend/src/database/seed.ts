import knex from 'knex';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://soc_user:soc_password@localhost:5432/soc_platform',
});

async function seed() {
  console.log('Seeding database...');

  // Create customers
  const customer1Id = uuidv4();
  const customer2Id = uuidv4();
  const customer3Id = uuidv4();

  await db('customers').insert([
    { id: customer1Id, name: 'Acme Financial Services', code: 'ACME001', industry: 'BFSI', contact_name: 'John Smith', contact_email: 'john@acmefinancial.com', status: 'active' },
    { id: customer2Id, name: 'GlobalMfg Industries', code: 'GLMF001', industry: 'Manufacturing', contact_name: 'Sarah Johnson', contact_email: 'sarah@globalmfg.com', status: 'active' },
    { id: customer3Id, name: 'CritInfra Power Corp', code: 'CIPC001', industry: 'Critical Infrastructure', contact_name: 'Robert Chen', contact_email: 'robert@critinfra.com', status: 'active' },
  ]);

  // Create users
  const passwordHash = await bcrypt.hash('SecureP@ss123', 12);
  const adminId = uuidv4();
  const manager1Id = uuidv4();
  const analyst1Id = uuidv4();
  const analyst2Id = uuidv4();
  const cust1UserId = uuidv4();

  await db('users').insert([
    { id: adminId, email: 'admin@techd.com', password_hash: passwordHash, first_name: 'Platform', last_name: 'Admin', role: 'admin', mfa_enabled: true, status: 'active' },
    { id: manager1Id, email: 'manager@techd.com', password_hash: passwordHash, first_name: 'SOC', last_name: 'Manager', role: 'manager', mfa_enabled: true, status: 'active' },
    { id: analyst1Id, email: 'analyst1@techd.com', password_hash: passwordHash, first_name: 'Ravi', last_name: 'Kumar', role: 'analyst', status: 'active' },
    { id: analyst2Id, email: 'analyst2@techd.com', password_hash: passwordHash, first_name: 'Priya', last_name: 'Sharma', role: 'analyst', status: 'active' },
    { id: cust1UserId, email: 'john@acmefinancial.com', password_hash: passwordHash, first_name: 'John', last_name: 'Smith', role: 'customer', status: 'active' },
  ]);

  // Assign users to customers
  await db('user_customers').insert([
    { user_id: adminId, customer_id: customer1Id },
    { user_id: adminId, customer_id: customer2Id },
    { user_id: adminId, customer_id: customer3Id },
    { user_id: manager1Id, customer_id: customer1Id },
    { user_id: manager1Id, customer_id: customer2Id },
    { user_id: manager1Id, customer_id: customer3Id },
    { user_id: analyst1Id, customer_id: customer1Id },
    { user_id: analyst1Id, customer_id: customer2Id },
    { user_id: analyst2Id, customer_id: customer2Id },
    { user_id: analyst2Id, customer_id: customer3Id },
    { user_id: cust1UserId, customer_id: customer1Id },
  ]);

  // Create SLA policies
  const sla1Id = uuidv4();
  const sla2Id = uuidv4();

  await db('sla_policies').insert([
    { id: sla1Id, customer_id: customer1Id, name: 'BFSI Premium SLA', critical_response_minutes: 15, critical_resolution_minutes: 120, high_response_minutes: 30, high_resolution_minutes: 360, medium_response_minutes: 60, medium_resolution_minutes: 1440, low_response_minutes: 240, low_resolution_minutes: 4320, is_default: true },
    { id: sla2Id, customer_id: customer2Id, name: 'Standard SLA', critical_response_minutes: 30, critical_resolution_minutes: 240, high_response_minutes: 60, high_resolution_minutes: 480, medium_response_minutes: 120, medium_resolution_minutes: 2880, low_response_minutes: 480, low_resolution_minutes: 5760, is_default: true },
  ]);

  // Create case templates
  await db('case_templates').insert([
    { name: 'Ransomware Incident', description: 'Response workflow for ransomware detection and containment', incident_type: 'ransomware', default_severity: 'critical', default_priority: 'P1', workflow_steps: JSON.stringify(['Isolate affected systems', 'Identify ransomware variant', 'Check backup integrity', 'Contain lateral movement', 'Eradicate malware', 'Restore from backups', 'Post-incident review']), default_tags: ['ransomware', 'malware', 'encryption'], default_mitre_techniques: ['T1486', 'T1490'], created_by: adminId },
    { name: 'Phishing Campaign', description: 'Response workflow for phishing email campaigns', incident_type: 'phishing', default_severity: 'high', default_priority: 'P2', workflow_steps: JSON.stringify(['Identify affected users', 'Block sender domain', 'Remove emails from mailboxes', 'Check for credential compromise', 'Reset affected passwords', 'User awareness notification']), default_tags: ['phishing', 'social-engineering'], default_mitre_techniques: ['T1566', 'T1598'], created_by: adminId },
    { name: 'Unauthorized Access', description: 'Response workflow for unauthorized access attempts', incident_type: 'unauthorized_access', default_severity: 'high', default_priority: 'P2', workflow_steps: JSON.stringify(['Identify access vector', 'Disable compromised accounts', 'Review access logs', 'Assess data exposure', 'Implement additional controls', 'Report to management']), default_tags: ['unauthorized-access', 'credential-theft'], default_mitre_techniques: ['T1078', 'T1110'], created_by: adminId },
    { name: 'Data Exfiltration', description: 'Response workflow for data exfiltration incidents', incident_type: 'data_exfiltration', default_severity: 'critical', default_priority: 'P1', workflow_steps: JSON.stringify(['Block exfiltration channel', 'Identify scope of data loss', 'Preserve forensic evidence', 'Assess regulatory impact', 'Notify legal/compliance', 'Implement DLP controls']), default_tags: ['data-exfiltration', 'data-loss'], default_mitre_techniques: ['T1041', 'T1567'], created_by: adminId },
    { name: 'DDoS Attack', description: 'Response workflow for DDoS attacks', incident_type: 'ddos', default_severity: 'high', default_priority: 'P1', workflow_steps: JSON.stringify(['Activate DDoS mitigation', 'Identify attack vectors', 'Engage ISP/CDN support', 'Monitor service availability', 'Post-attack analysis']), default_tags: ['ddos', 'availability'], default_mitre_techniques: ['T1498', 'T1499'], created_by: adminId },
  ]);

  console.log('Seed data inserted successfully!');
  await db.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
