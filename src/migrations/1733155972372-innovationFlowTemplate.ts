import { of } from 'rxjs';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InnovationFlowTemplate1733155972372 implements MigrationInterface {
  name = 'InnovationFlowTemplate1733155972372';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `template` DROP FOREIGN KEY `FK_45cf273f30c1fa509456b6b0ddf`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_45cf273f30c1fa509456b6b0dd` ON `template`'
    );

    // delete the data from the template table
    const innovationFlowTemplates: {
      id: string;
      innovationFlowId: string;
      profileId: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, innovationFlowId, profileId, authorizationId FROM template WHERE innovationFlowId IS NOT NULL;`
    );
    for (const template of innovationFlowTemplates) {
      // delete the innovation flow
      await this.deleteInnovationFlow(queryRunner, template.innovationFlowId);
      // delete the profile
      await this.deleteProfile(queryRunner, template.profileId);
      // delete the template
      await queryRunner.query(`DELETE FROM template WHERE id = ?`, [
        template.id,
      ]);
    }

    await queryRunner.query(
      'ALTER TABLE `template` DROP COLUMN `innovationFlowId`'
    );
  }

  private async deleteInnovationFlow(
    queryRunner: QueryRunner,
    innovationFlowId: string
  ) {
    const [innovationFlow]: {
      id: string;
      profileId: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, authoizationId, profileId FROM innovation_flow WHERE id = ?`,
      [innovationFlowId]
    );
    if (innovationFlow) {
      // delete the innovation flow
      await queryRunner.query(`DELETE FROM innovation_flow WHERE id = ?`, [
        innovationFlowId,
      ]);
      // delete the authorization policy
      await queryRunner.query(`DELETE FROM authorization_policy WHERE id = ?`, [
        innovationFlow.authorizationId,
      ]);
      // delete the profile
      await this.deleteProfile(queryRunner, innovationFlow.profileId);
    }
  }

  private async deleteProfile(queryRunner: QueryRunner, profileId: string) {
    const [profile]: {
      id: string;
      authorizationId: string;
      locationId: string;
      storageBucketId: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId, locationId, storageBucketId FROM profile WHERE id = ?`,
      [profileId]
    );
    if (profile) {
      await queryRunner.query(`DELETE FROM profile WHERE id = ?`, [profileId]);
      // delete the authorization policy
      await queryRunner.query(`DELETE FROM authorization_policy WHERE id = ?`, [
        profile.authorizationId,
      ]);
      // Delete location
      await queryRunner.query(`DELETE FROM location WHERE id = ?`, [
        profile.locationId,
      ]);
      // Delete storage bucket
      await this.deleteStorageBucket(queryRunner, profile.storageBucketId);
    }
  }

  private async deleteStorageBucket(
    queryRunner: QueryRunner,
    storageBucketId: string
  ) {
    const [storageBucket]: {
      id: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId FROM storage_bucket WHERE id = ?`,
      [storageBucketId]
    );
    if (storageBucket) {
      await queryRunner.query(`DELETE FROM storage_bucket WHERE id = ?`, [
        storageBucketId,
      ]);
      // delete the authorization policy
      await queryRunner.query(`DELETE FROM authorization_policy WHERE id = ?`, [
        storageBucket.authorizationId,
      ]);
      // Delete documents
      const documents: {
        id: string;
        authorizationId: string;
        tagsetId: string;
      }[] = await queryRunner.query(
        `SELECT id, authorizationId, tagsetId FROM document where storageBucketId = ${storageBucketId};`
      );
      for (const document of documents) {
        // delete the tagset
        await queryRunner.query(`DELETE FROM tagset WHERE id = ?`, [
          document.tagsetId,
        ]);
        // delete the authorization policy
        await queryRunner.query(
          `DELETE FROM authorization_policy WHERE id = ?`,
          [document.authorizationId]
        );
        // delete the document
        await queryRunner.query(`DELETE FROM document WHERE id = ?`, [
          document.id,
        ]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `template` ADD `innovationFlowId` char(36) NULL'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_45cf273f30c1fa509456b6b0dd` ON `template` (`innovationFlowId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `template` ADD CONSTRAINT `FK_45cf273f30c1fa509456b6b0ddf` FOREIGN KEY (`innovationFlowId`) REFERENCES `innovation_flow`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }
}
