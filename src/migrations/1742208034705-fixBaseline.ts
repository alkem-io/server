import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBaseline1742208034705 implements MigrationInterface {
  name = 'FixBaseline1742208034705';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`classification\` DROP FOREIGN KEY \`FK_391d124a58a845b85a047acc9d3\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_858fd06a671b804765d91251e6\` ON \`innovation_flow\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_0674c137336c2417df036053b6\` ON \`callouts_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_1d39dac2c6d2f17286d90c306b\` ON \`innovation_hub\``
    );
    await queryRunner.query(
      `ALTER TABLE \`classification\` DROP COLUMN \`classificationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callouts_set\` DROP COLUMN \`classificationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_0674c137336c2417df036053b65\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_0674c137336c2417df036053b6\` (\`classificationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_0674c137336c2417df036053b6\` ON \`callout\` (\`classificationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` ADD CONSTRAINT \`FK_391d124a58a845b85a047acc9d3\` FOREIGN KEY (\`classificationId\`) REFERENCES \`classification\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_0674c137336c2417df036053b65\` FOREIGN KEY (\`classificationId\`) REFERENCES \`classification\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'DROP INDEX `IDX_0674c137336c2417df036053b6` ON `callout`'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_0674c137336c2417df036053b65\``
    );
    await queryRunner.query(
      `ALTER TABLE \`tagset\` DROP FOREIGN KEY \`FK_391d124a58a845b85a047acc9d3\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_0674c137336c2417df036053b6\` ON \`callout\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_0674c137336c2417df036053b6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_0674c137336c2417df036053b65\` FOREIGN KEY (\`classificationId\`) REFERENCES \`classification\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callouts_set\` ADD \`classificationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`classification\` ADD \`classificationId\` char(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_1d39dac2c6d2f17286d90c306b\` ON \`innovation_hub\` (\`nameID\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_0674c137336c2417df036053b6\` ON \`callouts_set\` (\`classificationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_858fd06a671b804765d91251e6\` ON \`innovation_flow\` (\`flowStatesTagsetTemplateId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`classification\` ADD CONSTRAINT \`FK_391d124a58a845b85a047acc9d3\` FOREIGN KEY (\`classificationId\`) REFERENCES \`classification\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_0674c137336c2417df036053b6` ON `callout` (`classificationId`)'
    );
  }
}
