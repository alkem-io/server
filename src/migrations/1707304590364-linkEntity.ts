import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import replaceSpecialCharacters from 'replace-special-characters';
import { escapeString } from './utils/escape-string';

export class linkEntity1707304590364 implements MigrationInterface {
  name = 'linkEntity1707304590364';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`link\` (\`id\` char(36) NOT NULL,
                                                    \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                    \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                    \`version\` int NOT NULL,
                                                    \`uri\` text NOT NULL,
                                                    \`authorizationId\` char(36) NULL,
                                                    \`profileId\` char(36) NULL,
                                                    UNIQUE INDEX \`REL_07f249ac87502495710a62c5c0\` (\`authorizationId\`),
                                                    UNIQUE INDEX \`REL_3bfc8c1aaec1395cc148268d3c\` (\`profileId\`),
                                                    PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`link\` ADD CONSTRAINT \`FK_07f249ac87502495710a62c5c01\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` ADD CONSTRAINT \`FK_3bfc8c1aaec1395cc148268d3cd\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY  \`FK_bdf2d0eced5c95968a85caaaaee\``
    );

    const contributions: {
      id: string;
      linkId: string;
      calloutId: string;
    }[] = await queryRunner.query(
      `SELECT id, linkId, calloutId FROM callout_contribution WHERE linkId IS NOT NULL`
    );
    for (const contribution of contributions) {
      // Get the relevant information
      const [reference]: {
        id: string;
        name: string;
        description: string;
        uri: string;
      }[] = await queryRunner.query(
        `SELECT id, name, description, uri FROM reference WHERE id = '${contribution.linkId}'`
      );

      const storageAggregatorID = await this.getStorageAggregatorID(
        queryRunner,
        contribution.calloutId
      );

      // Create and link the Profile
      const linkID = randomUUID();
      const linkAuthID = randomUUID();

      const profileID = randomUUID();
      const profileAuthID = randomUUID();

      const locationID = randomUUID();
      const storageBucketID = randomUUID();
      const storageBucketAuthID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                ('${linkAuthID}',
                1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                ('${profileAuthID}',
                1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                ('${storageBucketAuthID}',
                1, '', '', 0, '')`
      );

      await queryRunner.query(
        `INSERT INTO location VALUES
        ('${locationID}', DEFAULT, DEFAULT, 1, '', '', '' ,'', '', '')`
      );

      await queryRunner.query(
        `INSERT INTO storage_bucket (id, version, storageAggregatorId, authorizationId) VALUES
                ('${storageBucketID}',
                1,
                '${storageAggregatorID}',
                '${storageBucketAuthID}')`
      );

      await queryRunner.query(
        `INSERT INTO profile (id, version, displayName, description, type, authorizationId) VALUES
                ('${profileID}',
                1,
                '${escapeString(replaceSpecialCharacters(reference.name))}',
                '${escapeString(
                  replaceSpecialCharacters(reference.description)
                )}',
                'contribution-link',
                '${profileAuthID}')`
      );

      await queryRunner.query(
        `INSERT INTO link (id, version, uri, authorizationId, profileId) VALUES
                ('${linkID}',
                1, '${escapeString(
                  replaceSpecialCharacters(reference.uri)
                )}', '${linkAuthID}', '${profileID}')`
      );

      await queryRunner.query(
        `UPDATE callout_contribution SET linkId = '${linkID}' WHERE id = '${contribution.id}'`
      );

      // Delete the old reference table entry
      await queryRunner.query(
        `DELETE FROM reference WHERE id = '${contribution.linkId}'`
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_bdf2d0eced5c95968a85caaaaee\` FOREIGN KEY (\`linkId\`) REFERENCES \`link\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`link\` DROP FOREIGN KEY \`FK_3bfc8c1aaec1395cc148268d3cd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` DROP FOREIGN KEY \`FK_07f249ac87502495710a62c5c01\``
    );

    await queryRunner.query(
      `DROP INDEX \`REL_3bfc8c1aaec1395cc148268d3c\` ON \`link\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_07f249ac87502495710a62c5c0\` ON \`link\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY  \`FK_bdf2d0eced5c95968a85caaaaee\``
    );

    const contributions: {
      id: string;
      linkId: string;
      calloutId: string;
    }[] = await queryRunner.query(
      `SELECT id, linkId, calloutId FROM callout_contribution WHERE linkId IS NOT NULL`
    );
    for (const contribution of contributions) {
      // Get the relevant information
      const [link]: {
        id: string;
        uri: string;
        profileId: string;
      }[] = await queryRunner.query(
        `SELECT id, uri, profileId FROM link WHERE id = '${contribution.linkId}'`
      );

      const [linkProfile]: {
        id: string;
        displayName: string;
        description: string;
      }[] = await queryRunner.query(
        `SELECT id, displayName, description FROM profile WHERE id = '${link.profileId}'`
      );

      const referenceID = randomUUID();
      const referenceAuthID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                ('${referenceAuthID}',
                1, '', '', 0, '')`
      );

      await queryRunner.query(
        `INSERT INTO reference (id, version, name, uri, description, authorizationId) VALUES
                ('${referenceID}',
                1,
                '${escapeString(
                  replaceSpecialCharacters(linkProfile.displayName)
                )}',
                '${escapeString(replaceSpecialCharacters(link.uri))}',
                '${escapeString(
                  replaceSpecialCharacters(linkProfile.description)
                )}',
                '${referenceAuthID}')`
      );
      await queryRunner.query(
        `UPDATE callout_contribution SET linkId = '${referenceID}' WHERE id = '${contribution.id}'`
      );
      await queryRunner.query(
        `DELETE FROM profile WHERE id = '${link.profileId}'`
      );
    }
    await queryRunner.query(`DROP TABLE \`link\``);
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_bdf2d0eced5c95968a85caaaaee\` FOREIGN KEY (\`linkId\`) REFERENCES \`reference\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  private async getStorageAggregatorID(
    queryRunner: QueryRunner,
    calloutID: string
  ) {
    const [callout]: {
      id: string;
      framingId: string;
    }[] = await queryRunner.query(
      `SELECT id, framingId FROM callout WHERE id = '${calloutID}'`
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

  private async getCalloutFramingProfileID(
    queryRunner: QueryRunner,
    calloutID: string
  ) {
    const [callout]: {
      id: string;
      framingId: string;
    }[] = await queryRunner.query(
      `SELECT id, framingId FROM callout WHERE id = '${calloutID}'`
    );

    const [framing]: {
      id: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId FROM callout_framing WHERE id = '${callout.framingId}'`
    );

    return framing.profileId;
  }
}
