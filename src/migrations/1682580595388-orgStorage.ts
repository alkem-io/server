import { MigrationInterface, QueryRunner } from "typeorm"
import { createStorageBucketAndLink, allowedTypes, maxAllowedFileSize } from "./utils/storage/storage-bucket-utils";

export class orgStorage1682580595388 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      const organizations: { id: string }[] = await queryRunner.query(
        `SELECT id FROM organization`
      );
      for (const org of organizations) {
        await createStorageBucketAndLink(
          queryRunner,
          'organization',
          org.id,
          allowedTypes,
          maxAllowedFileSize,
          ''
        );
      }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      //no need to do anything here, original migration down should take care of the column
    }

}
