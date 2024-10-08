import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

const localhostDocumentUriPrefix =
  'http://localhost:3000/api/private/rest/storage/document';
const productionDocumentUriPrefix =
  'https://alkem.io/api/private/rest/storage/document';
export class AddMissingStorageBuckets1711017129997
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const linkProfiles: {
      id: string;
    }[] = await queryRunner.query(
      `SELECT id FROM profile WHERE storageBucketId IS NULL AND type = 'contribution-link'`
    );

    for (const linkProfile of linkProfiles) {
      const storageAggregatorID = await this.getStorageAggregatorID(
        queryRunner,
        linkProfile.id
      );

      if (storageAggregatorID === null) {
        console.log(
          `Parent Callout of link with profileId ${linkProfile.id} has no storageAggregatorId.`
        );
        continue;
      }

      const storageBucketID = randomUUID();
      const storageBucketAuthID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                ('${storageBucketAuthID}',
                1, '', '', 0, '')`
      );

      await queryRunner.query(
        `INSERT INTO storage_bucket (id, version, storageAggregatorId, authorizationId) VALUES
                ('${storageBucketID}',
                1,
                '${storageAggregatorID}',
                '${storageBucketAuthID}')`
      );

      await queryRunner.query(
        `UPDATE profile SET storageBucketId = '${storageBucketID}' WHERE id = '${linkProfile.id}'`
      );
      // We are not sure if someone has pasted an alkemio url of a document or directly uploaded on this link. Commenting out until we are sure.
      // Update document storageBucketId
      const [link] = await queryRunner.query(
        `SELECT id, uri FROM link WHERE profileId = '${linkProfile.id}'`
      );
      const isAlkemioDocumentUri = this.isAlkemioDocumentUri(link.uri);
      if (isAlkemioDocumentUri) {
        const links: {
          id: string;
          uri: string;
          createdDate: string;
        }[] = await queryRunner.query(
          `SELECT id, uri, createdDate FROM link WHERE uri = '${link.uri}'`
        );
        if (links.length > 1) {
          const dates = links.map(link => new Date(link.createdDate));
          const oldestDate = Math.min(...dates.map(date => date.getTime()));
          const oldestLink = links.find(
            link => new Date(link.createdDate).getTime() === oldestDate
          );
          console.log(
            `Multiple links with same uri found. Skipping storage bucket update. Oldest link id: ${oldestLink?.id}`
          );
          continue;
        }
        const documentId = this.getDocumentId(link.uri);
        console.log(
          `Updating document storageBucketId for document with id: ${documentId}`
        );
        await queryRunner.query(
          `UPDATE document SET storageBucketId = '${storageBucketID}' WHERE id = '${documentId}'`
        );
      }
    }

    const spaces: {
      id: string;
      collaborationId: string;
      storageAggregatorId: string;
    }[] = await queryRunner.query(
      `SELECT id, collaborationId, storageAggregatorId FROM space`
    );

    for (const space of spaces) {
      const storageBucketID = randomUUID();
      const storageBucketAuthID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                      ('${storageBucketAuthID}',
                      1, '', '', 0, '')`
      );

      await queryRunner.query(
        `INSERT INTO storage_bucket (id, version, storageAggregatorId, authorizationId) VALUES
                      ('${storageBucketID}',
                      1,
                      '${space.storageAggregatorId}',
                      '${storageBucketAuthID}')`
      );

      const [collaboration]: {
        id: string;
        innovationFlowId: string;
      }[] = await queryRunner.query(
        `SELECT id, innovationFlowId FROM collaboration WHERE id = '${space.collaborationId}'`
      );

      const [innovationFlow]: {
        id: string;
        profileId: string;
      }[] = await queryRunner.query(
        `SELECT id, profileId FROM innovation_flow WHERE id = '${collaboration.innovationFlowId}'`
      );

      const [innovationFlowProfile]: {
        id: string;
      }[] = await queryRunner.query(
        `SELECT id FROM profile WHERE id = '${innovationFlow.profileId}'`
      );

      await queryRunner.query(
        `UPDATE profile SET storageBucketId = '${storageBucketID}' WHERE id = '${innovationFlowProfile.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async getStorageAggregatorID(
    queryRunner: QueryRunner,
    linkProfileId: string
  ) {
    const [link]: {
      id: string;
    }[] = await queryRunner.query(
      `SELECT id FROM link WHERE profileId = '${linkProfileId}'`
    );

    const [contribution]: {
      id: string;
      calloutId: string;
    }[] = await queryRunner.query(
      `SELECT id, calloutId FROM callout_contribution WHERE linkId = '${link.id}'`
    );

    const [callout]: {
      id: string;
      framingId: string;
    }[] = await queryRunner.query(
      `SELECT id, framingId FROM callout WHERE id = '${contribution.calloutId}'`
    );

    const [framing]: {
      id: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId FROM callout_framing WHERE id = '${callout.framingId}'`
    );

    const [profile]: {
      id: string;
      storageBucketId: string;
    }[] = await queryRunner.query(
      `SELECT id, storageBucketId FROM profile WHERE id = '${framing.profileId}'`
    );

    const [storageBucket]: {
      id: string;
      storageAggregatorId: string;
    }[] = await queryRunner.query(
      `SELECT id, storageAggregatorId FROM storage_bucket WHERE id = '${profile.storageBucketId}'`
    );
    return storageBucket.storageAggregatorId;
  }

  private isAlkemioDocumentUri(uri: string) {
    const lastSlashIndex = uri.lastIndexOf('/');
    const prefix = uri.slice(0, lastSlashIndex);
    // we can maybe use condition: if (prefix === productionDocumentUriPrefix || prefix === localhostDocumentUriPrefix)
    if (prefix === productionDocumentUriPrefix) {
      return true;
    }
    return false;
  }

  private getDocumentId(uri: string) {
    const lastSlashIndex = uri.lastIndexOf('/');
    return uri.slice(lastSlashIndex + 1);
  }
}
