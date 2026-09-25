import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandUserRoles1790141000000 implements MigrationInterface {
  name = 'ExpandUserRoles1790141000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guest checkout belongs to an order, never to an authenticated user row.
    await queryRunner.query(`
      UPDATE \`user\` SET \`role\` = 'user' WHERE \`role\` = 'guest'
    `);
    await queryRunner.query(`
      ALTER TABLE \`user\`
      MODIFY \`role\` enum ('superadmin', 'admin', 'editor', 'sales', 'user')
      NOT NULL DEFAULT 'user'
    `);
    await queryRunner.query(`
      CREATE INDEX \`IDX_user_directory\`
      ON \`user\` (\`role\`, \`status\`, \`deleted_at\`, \`id\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX \`IDX_user_directory\` ON \`user\`
    `);
    await queryRunner.query(`
      UPDATE \`user\` SET \`role\` = 'admin'
      WHERE \`role\` IN ('editor', 'sales')
    `);
    await queryRunner.query(`
      ALTER TABLE \`user\`
      MODIFY \`role\` enum ('superadmin', 'admin', 'user', 'guest')
      NOT NULL DEFAULT 'user'
    `);
  }
}
