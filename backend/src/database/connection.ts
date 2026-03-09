import knex, { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://soc_user:soc_password@localhost:5432/soc_platform',
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '10'),
  },
};

const db = knex(config);

export default db;
