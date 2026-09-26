import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSessionCleanupIndexes1790140000000 implements MigrationInterface {
  name = 'AddAuthSessionCleanupIndexes1790140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX \`IDX_auth_session_refresh_expiry\`
      ON \`auth_sessions\` (\`refresh_expires_at\`)
    `);
    await queryRunner.query(`
      CREATE INDEX \`IDX_auth_session_revoked_at\`
      ON \`auth_sessions\` (\`revoked_at\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX \`IDX_auth_session_revoked_at\` ON \`auth_sessions\`
    `);
    await queryRunner.query(`
      DROP INDEX \`IDX_auth_session_refresh_expiry\` ON \`auth_sessions\`
    `);
  }
}
