import { MigrationInterface, QueryRunner } from 'typeorm';
import { createCallout } from './utils/callouts/create-callout';

enum CalloutType {
  CARD = 'card',
  CANVAS = 'canvas',
  COMMENTS = 'comments',
  LINK_COLLECTION = 'link-collection',
}
enum CalloutState {
  OPEN = 'open',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}
enum CalloutVisibility {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export class recommendationsToLinkCollection1682490418949
  implements MigrationInterface
{
  name = 'recommendationsToLinkCollection1682490418949';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP COLUMN \`storageBucketId\``
    );

    const references: { contextRecommendationId: string }[] =
      await queryRunner.query(`
        SELECT contextRecommendationId FROM reference WHERE contextRecommendationId IS NOT NULL
      `);
    // we want to transfer all references(recommendations) from a context to a callout's profile
    const contextRecommendationIds = new Set<string>(
      references.map(reference => reference.contextRecommendationId)
    );

    for (const contextRecommendationId of contextRecommendationIds) {
      const [{ hubId, challengeId, opportunityId }]: {
        hubId?: string;
        challengeId?: string;
        opportunityId?: string;
      }[] = await queryRunner.query(`
          SELECT hub.id AS hubId, challenge.id AS challengeId, opportunity.id AS opportunityId FROM context
          LEFT JOIN hub ON hub.contextId = context.id
          LEFT JOIN challenge ON challenge.contextId = context.id
          LEFT JOIN opportunity ON opportunity.contextId = context.id
          WHERE context.id = '${contextRecommendationId}'
        `);

      if (!hubId && !challengeId && !opportunityId) {
        throw Error(
          `No Journey found for Context with id = '${contextRecommendationId}'`
        );
      }

      const journeyTable = hubId
        ? 'hub'
        : challengeId
        ? 'challenge'
        : 'opportunity';
      const journeyId = hubId ?? challengeId ?? opportunityId;

      const [{ collaborationId }]: { collaborationId: string }[] =
        await queryRunner.query(`
          SELECT collaborationId FROM ${journeyTable} where id = '${journeyId}'
        `);

      if (!collaborationId) {
        throw Error(
          `No Collaboration found for '${journeyTable}' with id = '${journeyId}'`
        );
      }

      const { profileId } = await createCallout(queryRunner, {
        collaborationId,
        type: CalloutType.LINK_COLLECTION,
        nameID: 'link-collection',
        state: CalloutState.CLOSED,
        visibility: CalloutVisibility.PUBLISHED,
        group: 'HOME_0',
      });

      await queryRunner.query(`
          UPDATE reference SET profileId = '${profileId}'
          WHERE contextRecommendationId = '${contextRecommendationId}'
        `);
    }

    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_299938434c7198a323ea6f475fb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP COLUMN \`contextRecommendationId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`storageBucketId\` char(36) NULL`
    );
    // WARNING
    // we cannot diff between what was a reference attached to a callout and a link attached to a link collection callout
    // all the old references attached to callouts and all the migrated recommendations will now be migrated to recommendations
    // if this is an unwanted side effect the migration code must be dropped
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD \`contextRecommendationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_299938434c7198a323ea6f475fb\` FOREIGN KEY (\`contextRecommendationId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    // migrate all the references with profiles related to a callout to recommendation on the same context level
    const references: { profileId: string }[] = await queryRunner.query(`
        SELECT profileId FROM reference WHERE profileId IS NOT NULL
      `);
    // we want to transfer all references(old recommendations) from a callout's profile to context in the same journey
    const profileIds = new Set<string>(
      references.map(reference => reference.profileId)
    );

    for (const profileId of profileIds) {
      const [{ hubId, challengeId, opportunityId }]: {
        hubId?: string;
        challengeId?: string;
        opportunityId?: string;
      }[] = await queryRunner.query(`
          SELECT hub.id AS hubId, challenge.id AS challengeId, opportunity.id AS opportunityId FROM reference
          LEFT JOIN profile ON profile.id = reference.profileId
          LEFT JOIN callout ON callout.profileId = profile.id
          LEFT JOIN collaboration ON collaboration.id = callout.collaborationId
          LEFT JOIN hub ON hub.collaborationId = collaboration.id
          LEFT JOIN challenge ON challenge.collaborationId = collaboration.id
          LEFT JOIN opportunity ON opportunity.collaborationId = collaboration.id
          WHERE profile.id = '${profileId}'
          LIMIT 1;
      `);

      if (!hubId && !challengeId && !opportunityId) {
        // this profile most probably is not associated with a callout so silently continue; i.e was not a recommendation
        continue;
      }

      const journeyTable = hubId
        ? 'hub'
        : challengeId
        ? 'challenge'
        : 'opportunity';
      const journeyId = hubId ?? challengeId ?? opportunityId;

      const [{ contextId }]: { contextId: string }[] = await queryRunner.query(`
          SELECT contextId FROM ${journeyTable} where id = '${journeyId}'
        `);

      if (!contextId) {
        throw Error(
          `No Context found for '${journeyTable}' with id = '${journeyId}'`
        );
      }

      await queryRunner.query(`
        UPDATE reference SET contextRecommendationId = '${contextId}'
        WHERE profileId = '${profileId}'
      `);
    }
    // drop all link-collection callouts
    //NOTE: not all data related to these callout is deleted
    await queryRunner.query(
      `DELETE FROM callout WHERE type = '${CalloutType.LINK_COLLECTION}'`
    );
  }
}
