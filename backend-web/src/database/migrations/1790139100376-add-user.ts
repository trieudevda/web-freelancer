import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUser1790139100376 implements MigrationInterface {
  name = 'AddUser1790139100376';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE \`user\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`first_name\` varchar(255) NOT NULL,
                \`last_name\` varchar(255) NOT NULL,
                \`phone\` varchar(30) NOT NULL,
                \`email\` varchar(255) NOT NULL,
                \`address\` varchar(500) NOT NULL,
                \`password\` varchar(255) NOT NULL,
                \`auth_version\` int UNSIGNED NOT NULL DEFAULT '1',
                \`version\` int NOT NULL,
                \`role\` enum ('superadmin', 'admin', 'user', 'guest') NOT NULL DEFAULT 'user',
                \`status\` enum (
                    'active',
                    'inactive',
                    'suspended',
                    'banned',
                    'pending'
                ) NOT NULL DEFAULT 'active',
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deleted_at\` datetime(6) NULL,
                UNIQUE INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` (\`email\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`auth_sessions\` (
                \`id\` char(36) NOT NULL,
                \`user_id\` int NOT NULL,
                \`auth_version\` int UNSIGNED NOT NULL,
                \`device_id\` varchar(100) NOT NULL,
                \`device_name\` varchar(255) NULL,
                \`user_agent\` varchar(1000) NULL,
                \`ip_address\` varchar(45) NULL,
                \`access_token_hash\` char(64) NOT NULL,
                \`refresh_token_hash\` char(64) NOT NULL,
                \`access_expires_at\` datetime(3) NOT NULL,
                \`refresh_expires_at\` datetime(3) NOT NULL,
                \`last_used_at\` datetime(3) NOT NULL,
                \`revoked_at\` datetime(3) NULL,
                \`revoked_reason\` varchar(100) NULL,
                \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                INDEX \`IDX_auth_session_user_device\` (\`user_id\`, \`device_id\`),
                INDEX \`IDX_auth_session_user_revoked\` (\`user_id\`, \`revoked_at\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            CREATE TABLE \`media\` (
                \`id\` varchar(36) NOT NULL,
                \`originalName\` varchar(255) NOT NULL,
                \`fileName\` varchar(255) NOT NULL,
                \`relativePath\` varchar(500) NOT NULL,
                \`mimeType\` varchar(100) NOT NULL,
                \`mediaType\` varchar(20) NOT NULL,
                \`size\` bigint UNSIGNED NOT NULL,
                \`title\` varchar(255) NULL,
                \`altText\` varchar(500) NULL,
                \`status\` varchar(30) NOT NULL DEFAULT 'active',
                \`deletedAt\` datetime(3) NULL,
                \`deleteAfter\` datetime(3) NULL,
                \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                INDEX \`IDX_media_cleanup\` (\`status\`, \`deleteAfter\`),
                UNIQUE INDEX \`IDX_2474776cd413a67445bf443a6d\` (\`relativePath\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    await queryRunner.query(`
            ALTER TABLE \`auth_sessions\`
            ADD CONSTRAINT \`FK_50ccaa6440288a06f0ba693ccc6\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`auth_sessions\` DROP FOREIGN KEY \`FK_50ccaa6440288a06f0ba693ccc6\`
        `);
    await queryRunner.query(`
            DROP INDEX \`IDX_2474776cd413a67445bf443a6d\` ON \`media\`
        `);
    await queryRunner.query(`
            DROP INDEX \`IDX_media_cleanup\` ON \`media\`
        `);
    await queryRunner.query(`
            DROP TABLE \`media\`
        `);
    await queryRunner.query(`
            DROP INDEX \`IDX_auth_session_user_revoked\` ON \`auth_sessions\`
        `);
    await queryRunner.query(`
            DROP INDEX \`IDX_auth_session_user_device\` ON \`auth_sessions\`
        `);
    await queryRunner.query(`
            DROP TABLE \`auth_sessions\`
        `);
    await queryRunner.query(`
            DROP INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` ON \`user\`
        `);
    await queryRunner.query(`
            DROP TABLE \`user\`
        `);
  }
}
