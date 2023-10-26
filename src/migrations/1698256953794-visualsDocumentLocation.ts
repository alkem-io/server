import { MigrationInterface, QueryRunner } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

let documentEndpoint = 'https://alkem.io/api/private/rest/storage/document/';

export class visualsDocumentLocation1698256953794
  implements MigrationInterface
{
  name = 'visualsDocumentLocation1698256953794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (process.env.ENDPOINT_CLUSTER && process.env.PATH_API_PRIVATE_REST) {
      documentEndpoint = `${process.env.ENDPOINT_CLUSTER}${process.env.PATH_API_PRIVATE_REST}/storage/document/`;
    }
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
        `SELECT id, uri FROM visual WHERE (profileId = '${journey.profileId}' AND uri LIKE '%https://alkem.io/api/private/rest/storage/document/%')`
      );
      for (const visual of visuals) {
        // Define the expected prefix
        const prefix = 'https://alkem.io/api/private/rest/storage/document/';

        // Check if the URL starts with the expected prefix
        // If it does, extract the last part of the URL
        const uriDocumentId = visual.uri.substring(prefix.length);
        // Get the matching document
        const [document]: {
          id: string;
          storageBucketId: string;
        }[] = await queryRunner.query(
          `SELECT id, storageBucketId FROM document WHERE (id = '${uriDocumentId}')`
        );
        if (document) {
          await queryRunner.query(
            `UPDATE \`document\` SET storageBucketId = '${profile.storageBucketId}' WHERE (id = '${document.id}')`
          );
        }
      }
    }
  }
}
