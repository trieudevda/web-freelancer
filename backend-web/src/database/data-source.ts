import 'dotenv/config';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/environment.js';
import { AuthSession } from '../modules/auth/entities/auth-session.entity.js';
import { Media } from '../modules/media/entities/media.entity.js';
import { User } from '../modules/user/entities/user.entity.js';

const environment = validateEnvironment(process.env);
const currentDirectory = fileURLToPath(new URL('.', import.meta.url));

export default new DataSource({
  type: 'mysql',
  host: environment.DB_HOST,
  port: environment.DB_PORT,
  username: environment.DB_USERNAME,
  password: environment.DB_PASSWORD,
  database: environment.DB_DATABASE,

  entities: [User, AuthSession, Media],
  migrations: [join(currentDirectory, 'migrations', '*.{ts,js}')],

  synchronize: false,
  migrationsRun: false,
  logging: ['error', 'warn'],
  maxQueryExecutionTime: environment.DB_SLOW_QUERY_THRESHOLD_MS,
  extra: {
    connectionLimit: environment.DB_POOL_CONNECTION_LIMIT,
    queueLimit: environment.DB_POOL_QUEUE_LIMIT,
    waitForConnections: true,
  },
});
