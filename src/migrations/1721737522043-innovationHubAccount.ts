import { MigrationInterface, QueryRunner } from 'typeorm';

export class InnovationHubAccount1721737522043 implements MigrationInterface {
  name = 'InnovationHubAccount1721737522043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD \`listedInStore\` tinyint NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD \`searchVisibility\` varchar(36) NOT NULL DEFAULT 'account'`
    );

    // All existing innovation hubs to default to be public + listed
    const innovationHubs: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM \`innovation_hub\``);
    for (const innovationHub of innovationHubs) {
      await queryRunner.query(
        `UPDATE innovation_hub SET listedInStore = '1' WHERE id = '${innovationHub.id}'`
      );
      await queryRunner.query(
        `UPDATE innovation_hub SET searchVisibility = 'public' WHERE id = '${innovationHub.id}'`
      );
    }

    // TODO: set all innovation hubs to be in the account for the Alkemio BV organization if found, otherwise pick the first org
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
