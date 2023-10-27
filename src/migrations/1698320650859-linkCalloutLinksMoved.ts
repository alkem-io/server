import { MigrationInterface, QueryRunner } from 'typeorm';
import { createAuthPolicy } from './utils/create-authorization-policy';

export class linkCalloutLinksMoved1698320650859 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const data: { refId: string; calloutId: string }[] =
      await queryRunner.query(`
            SELECT callout.id AS calloutId, reference.id AS refId FROM callout
            INNER JOIN callout_framing ON callout.framingId = callout_framing.id
            INNER JOIN profile ON profile.id = callout_framing.profileId
            INNER JOIN reference ON reference.profileId = profile.id
            WHERE callout.type = 'link-collection'
        `);
    // group refs by callouts to reduce amount of insert statements
    const map = new Map<string, string[]>();
    data.forEach(x => {
      const refIds = map.get(x.calloutId) ?? [];
      map.set(x.calloutId, refIds.concat(x.refId));
    });

    for (const calloutId of map.keys()) {
      const refIds = map.get(calloutId);
      if (!refIds) {
        continue;
      }

      const insertStatements = [];
      for (const ref of refIds) {
        insertStatements.push(
          `(UUID(), null, '${await createAuthPolicy(
            queryRunner
          )}', '${ref}', '${calloutId}')`
        );
      }

      // Ignoring issues as there are correctly created links + references
      await queryRunner.query(`
                INSERT IGNORE INTO callout_contribution (id, createdBy, authorizationId, linkId, calloutId)
                VALUES
                    ${insertStatements.join(',')}
            `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
