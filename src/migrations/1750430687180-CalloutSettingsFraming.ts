import { CalloutFramingType } from "@common/enums/callout.framing.type";
import { CalloutType } from "@common/enums/callout.type";
import { randomUUID } from "crypto";
import { MigrationInterface, QueryRunner } from "typeorm";

export class calloutSettingsFraming1750430687180 implements MigrationInterface {
  name = 'calloutSettingsFraming1750430687180'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`callout_settings_framing\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`type\` varchar(128) NOT NULL DEFAULT 'none', \`commentsEnabled\` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`callout_settings\` ADD \`framingId\` char(36) NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX \`REL_66846c131186adf594647c3302\` ON \`callout_settings\` (\`framingId\`)`);
    await queryRunner.query(`ALTER TABLE \`callout_settings\` ADD CONSTRAINT \`FK_66846c131186adf594647c3302b\` FOREIGN KEY (\`framingId\`) REFERENCES \`callout_settings_framing\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);

    const callouts: {
      id: string;
      calloutSettingsId: string;
      type: string;
    }[] = await queryRunner.query(`SELECT \`id\`, \`type\`, \`settingsId\` FROM \`callout\`;`);
    for (const callout of callouts) {
      const framingSettingsId = randomUUID();
      const framingType = callout.type === CalloutType.WHITEBOARD ? CalloutFramingType.WHITEBOARD : CalloutFramingType.NONE;
      const commentsEnabled = callout.type === CalloutType.POST;

      await queryRunner.query(
        `INSERT INTO \`callout_settings_framing\` (\`id\`, \`createdDate\`, \`updatedDate\`, \`version\`, \`type\`, \`commentsEnabled\`)
                  VALUES (?, NOW(), NOW(), 1, ?, ?)`,
        [framingSettingsId, framingType, commentsEnabled]
      );
      await queryRunner.query(
        `UPDATE \`callout_settings\` SET \`framingId\` = ? WHERE \`id\` = ?`,
        [framingSettingsId, callout.calloutSettingsId]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`callout_settings\` DROP FOREIGN KEY \`FK_66846c131186adf594647c3302b\``);
    await queryRunner.query(`DROP INDEX \`REL_66846c131186adf594647c3302\` ON \`callout_settings\``);
    await queryRunner.query(`ALTER TABLE \`callout_settings\` DROP COLUMN \`framingId\``);
    await queryRunner.query(`DROP TABLE \`callout_settings_framing\``);
  }

}
