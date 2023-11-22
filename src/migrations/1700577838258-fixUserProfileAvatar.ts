import { MigrationInterface, QueryRunner } from 'typeorm';

export class fixUserProfileAvatar1700577838258 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const documents: { id: string }[] = await queryRunner.query(
      `SELECT document.id FROM document LEFT JOIN storage_bucket ON
        document.storageBucketId = storage_bucket.id
        WHERE storageBucketId is null;`
    );

    for (const document of documents) {
      const profile: { storageBucketId: string }[] = await queryRunner.query(
        `SELECT profile.storageBucketId  FROM reference LEFT JOIN profile ON reference.profileId = profile.id
        WHERE uri like '%${document.id}%';`
      );

      if (profile && profile[0]) {
        await queryRunner.query(
          `UPDATE document SET storageBucketId = '${profile[0].storageBucketId}' WHERE id = '${document.id}';`
        );
      } else {
        const profile: { storageBucketId: string }[] = await queryRunner.query(
          `SELECT profile.storageBucketId  FROM visual LEFT JOIN profile ON visual.profileId = profile.id
          WHERE uri like '%${document.id}%';`
        );
        if (profile && profile[0]) {
          await queryRunner.query(
            `UPDATE document SET  storageBucketId = '${profile[0].storageBucketId}' WHERE id = '${document.id}';`
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
