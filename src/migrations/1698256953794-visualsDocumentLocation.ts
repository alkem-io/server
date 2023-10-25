import { MigrationInterface, QueryRunner } from 'typeorm';

export class visualsDocumentLocation1698256953794
  implements MigrationInterface
{
  name = 'visualsDocumentLocation1698256953794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Loop over all spaces
    await this.updateVisualsOnJourney(queryRunner, 'space');
    await this.updateVisualsOnJourney(queryRunner, 'challenge');
    await this.updateVisualsOnJourney(queryRunner, 'opportunity');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Nothing to be done');
  }

  private async updateVisualsOnJourney(
    queryRunner: QueryRunner,
    journeyType: string
  ) {
    const journeys: {
      id: string;
      profileId: string;
      storageAggregatorId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId, storageAggregatorId FROM ${journeyType}`
    );
    for (const journey of journeys) {
      const [directStorage]: {
        id: string;
        directStorageId: string;
      }[] = await queryRunner.query(
        `SELECT id, directStorageId FROM storage_aggregator WHERE (id = '${journey.storageAggregatorId}')`
      );

      const [profile]: {
        id: string;
        storageBucketId: string;
      }[] = await queryRunner.query(
        `SELECT id, storageBucketId FROM profile WHERE (id = '${journey.profileId}')`
      );

      const visuals: {
        id: string;
        uri: string;
      }[] = await queryRunner.query(
        `SELECT id, uri FROM visual WHERE (profileId = '${journey.profileId}')`
      );
      for (const visual of visuals) {
        // Define the expected prefix
        const prefix = 'https://alkem.io/api/private/rest/storage/document/';

        // Check if the URL starts with the expected prefix
        if (visual.uri.startsWith(prefix)) {
          // If it does, extract the last part of the URL
          const uriDocumentId = visual.uri.substring(prefix.length);
          // Get the matching document
          const [document]: {
            id: string;
            storageBucketId: string;
          }[] = await queryRunner.query(
            `SELECT id, storageBucketId FROM document WHERE (id = '${uriDocumentId}')`
          );
          if (document && document.id === directStorage.id) {
            // Document is in the wrong storagebucket! Move to Profile storage bucket
            await queryRunner.query(
              `UPDATE \`document\` SET storageBucketId = '${profile.storageBucketId}' WHERE (id = '${document.id}')`
            );
          }
        }
      }
    }
  }
}
