import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  addStorageBucketRelation,
  allowedTypes,
  createStorageBucketAndLink,
  maxAllowedFileSize,
  removeStorageBucketAuths,
  removeStorageBucketRelation,
} from './utils/storage/storage-bucket-utils';
import { randomUUID } from 'crypto';

export class storageBucketOnProfile1696056259963 implements MigrationInterface {
  name = 'storageBucketOnProfile1696056259963';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`storageBucketId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_4a1c74fd2a61b32d9d9500e065\` (\`storageBucketId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4a1c74fd2a61b32d9d9500e065\` ON \`profile\` (\`storageBucketId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_4a1c74fd2a61b32d9d9500e0650\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Add a storage bucket to users
    await addStorageBucketRelation(
      queryRunner,
      'FK_12341450cf75dc486700ca034c6',
      'user'
    );

    const users: { id: string }[] = await queryRunner.query(
      `SELECT id FROM user`
    );
    for (const user of users) {
      await createStorageBucketAndLink(
        queryRunner,
        'user',
        user.id,
        allowedTypes,
        maxAllowedFileSize,
        ''
      );
    }

    //////////////////////////////
    // Now set the storage buckets on all profiles
    const spaces: {
      id: string;
      storageBucketId: string;
      profileId: string;
      collaborationId: string;
      communityId: string;
      templatesSetId: string;
    }[] = await queryRunner.query(
      `SELECT id, storageBucketId, profileId, collaborationId, communityId, templatesSetId FROM space`
    );
    for (const space of spaces) {
      const spaceStorageBucketId = space.storageBucketId;
      await this.createStorageBucketOnProfile(
        queryRunner,
        space.profileId,
        spaceStorageBucketId
      );
      await this.processCollaborationProfiles(
        queryRunner,
        space.collaborationId,
        spaceStorageBucketId
      );
      await this.processCommunityProfiles(
        queryRunner,
        space.communityId,
        spaceStorageBucketId
      );
      await this.processTemplatesSetProfiles(
        queryRunner,
        space.templatesSetId,
        spaceStorageBucketId
      );

      const challenges: {
        id: string;
        storageBucketId: string;
        profileId: string;
        collaborationId: string;
        communityId: string;
        innovationFlowId: string;
      }[] = await queryRunner.query(
        `SELECT id, storageBucketId, profileId, collaborationId, communityId, innovationFlowId FROM challenge WHERE challenge.spaceId = '${space.id}'`
      );
      for (const challenge of challenges) {
        const challengeStorageBucketId = challenge.storageBucketId;

        await this.createStorageBucketOnProfile(
          queryRunner,
          challenge.profileId,
          challengeStorageBucketId
        );
        await this.processCollaborationProfiles(
          queryRunner,
          challenge.collaborationId,
          challengeStorageBucketId
        );
        await this.processCommunityProfiles(
          queryRunner,
          challenge.communityId,
          challengeStorageBucketId
        );
        await this.createStorageBucketOnInnovationFlow(
          queryRunner,
          challenge.innovationFlowId,
          challengeStorageBucketId
        );

        const opportunities: {
          id: string;
          storageBucketId: string;
          profileId: string;
          collaborationId: string;
          communityId: string;
          innovationFlowId: string;
        }[] = await queryRunner.query(
          `SELECT id, profileId, collaborationId, communityId, innovationFlowId FROM opportunity WHERE opportunity.challengeId = '${challenge.id}'`
        );
        for (const opportunity of opportunities) {
          // Use the challenge storage bucket
          await this.createStorageBucketOnProfile(
            queryRunner,
            opportunity.profileId,
            challengeStorageBucketId
          );
          await this.processCollaborationProfiles(
            queryRunner,
            opportunity.collaborationId,
            challengeStorageBucketId
          );
          await this.processCommunityProfiles(
            queryRunner,
            opportunity.communityId,
            challengeStorageBucketId
          );
          await this.createStorageBucketOnInnovationFlow(
            queryRunner,
            opportunity.innovationFlowId,
            challengeStorageBucketId
          );
        }
      }
    }

    //////////////////////////////
    // Now set the storage buckets on all users + organizations
    await this.createStorageBucketOnUser(queryRunner);
    await this.createStorageBucketOnOrganization(queryRunner);

    //////////////////////////////
    // Set the storage buckets on library
    const libraryStorageBucketID = await this.getStorageBucketOnLibrary(
      queryRunner
    );
    if (libraryStorageBucketID) {
      const innovationPacks: {
        id: string;
        profileId: string;
        templatesSetId: string;
      }[] = await queryRunner.query(
        `SELECT id, profileId, templatesSetId FROM innovation_pack`
      );
      for (const innovationPack of innovationPacks) {
        // Use the challenge storage bucket
        await this.createStorageBucketOnProfile(
          queryRunner,
          innovationPack.profileId,
          libraryStorageBucketID
        );
        await this.processTemplatesSetProfiles(
          queryRunner,
          innovationPack.templatesSetId,
          libraryStorageBucketID
        );
      }
    }

    //////////////////////////////
    // Set the storage buckets on platform
    const result = await this.getStorageBucketOnPlatform(queryRunner);
    if (result) {
      const platformStorageBucketID = result.platformStorageBucketID;
      const communicationID = result.communicationID;
      const innovationHubs: {
        id: string;
        profileId: string;
      }[] = await queryRunner.query(`SELECT id, profileId FROM innovation_hub`);
      for (const innovationHub of innovationHubs) {
        await this.createStorageBucketOnProfile(
          queryRunner,
          innovationHub.profileId,
          platformStorageBucketID
        );
      }

      await this.processCommunicationProfiles(
        queryRunner,
        communicationID,
        platformStorageBucketID
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_4a1c74fd2a61b32d9d9500e0650\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4a1c74fd2a61b32d9d9500e065\` ON \`profile\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP INDEX \`IDX_4a1c74fd2a61b32d9d9500e065\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP COLUMN \`storageBucketId\``
    );

    //
    await removeStorageBucketAuths(queryRunner, ['user']);
    await removeStorageBucketRelation(
      queryRunner,
      'FK_12341450cf75dc486700ca034c6',
      'user'
    );
  }

  private async processCommunicationProfiles(
    queryRunner: QueryRunner,
    communicationID: string,
    storageBucketID: string
  ) {
    const discussions: {
      id: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId FROM discussion WHERE discussion.communicationId = '${communicationID}'`
    );
    for (const discussion of discussions) {
      await this.createStorageBucketOnProfile(
        queryRunner,
        discussion.profileId,
        storageBucketID
      );
    }
  }

  private async createStorageBucketOnUser(queryRunner: QueryRunner) {
    const contributorsWithProfiles: {
      id: string;
      storageBucketId: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, storageBucketId, profileId FROM user`
    );
    for (const contributor of contributorsWithProfiles) {
      const contributorStorageBucketId = contributor.storageBucketId;
      await this.createStorageBucketOnProfile(
        queryRunner,
        contributor.profileId,
        contributorStorageBucketId
      );
    }
  }

  private async createStorageBucketOnOrganization(queryRunner: QueryRunner) {
    const contributorsWithProfiles: {
      id: string;
      storageBucketId: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, storageBucketId, profileId FROM organization`
    );
    for (const organization of contributorsWithProfiles) {
      const contributorStorageBucketId = organization.storageBucketId;
      await this.createStorageBucketOnProfile(
        queryRunner,
        organization.profileId,
        contributorStorageBucketId
      );
      await this.processUserGroupProfiles(
        queryRunner,
        'organizationId',
        organization.id,
        contributorStorageBucketId
      );
    }
  }

  private async createStorageBucketOnInnovationFlow(
    queryRunner: QueryRunner,
    innovationFlowID: string,
    storageBucketID: string
  ) {
    const innovationFlows: {
      id: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId FROM innovation_flow WHERE innovation_flow.id = '${innovationFlowID}'`
    );
    for (const innovationFlow of innovationFlows) {
      await this.createStorageBucketOnProfile(
        queryRunner,
        innovationFlow.profileId,
        storageBucketID
      );
    }
  }

  private async getStorageBucketOnLibrary(
    queryRunner: QueryRunner
  ): Promise<string | undefined> {
    const libraries: {
      id: string;
      storageBucketId: string;
    }[] = await queryRunner.query(`SELECT id, storageBucketId FROM library`);
    if (libraries.length !== 1) {
      console.log(`Not a singleton is found: ${libraries}`);
      return undefined;
    }
    return libraries[0].storageBucketId;
  }

  private async getStorageBucketOnPlatform(
    queryRunner: QueryRunner
  ): Promise<
    { platformStorageBucketID: string; communicationID: string } | undefined
  > {
    const platforms: {
      id: string;
      storageBucketId: string;
      communicationId: string;
    }[] = await queryRunner.query(
      `SELECT id, storageBucketId, communicationId FROM platform`
    );
    if (platforms.length !== 1) {
      console.log(`Not a singleton is found: ${platforms}`);
      return undefined;
    }
    const platformStorageBucketID = platforms[0].storageBucketId;
    const communicationID = platforms[0].communicationId;
    return { platformStorageBucketID, communicationID };
  }

  private async createStorageBucketOnProfile(
    queryRunner: QueryRunner,
    profileID: string,
    parentStorageBucketID: string
  ): Promise<string> {
    const newStorageBucketID = randomUUID();
    const storageBucketAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${storageBucketAuthID}',
        1, '', '', 0, '')`
    );

    await queryRunner.query(
      `INSERT INTO storage_bucket (id, version, authorizationId, allowedMimeTypes, maxFileSize, parentStorageBucketId)
            VALUES ('${newStorageBucketID}',
                    '1',
                    '${storageBucketAuthID}',
                    '${allowedTypes}',
                    ${maxAllowedFileSize},
                    '${parentStorageBucketID}')`
    );

    await queryRunner.query(
      `UPDATE \`profile\` SET storageBucketId = '${newStorageBucketID}' WHERE (id = '${profileID}')`
    );
    return newStorageBucketID;
  }

  private async processCommunityProfiles(
    queryRunner: QueryRunner,
    communityID: string,
    parentStorageBucketID: string
  ) {
    const communities: {
      id: string;
      communicationID: string;
    }[] = await queryRunner.query(
      `SELECT id, communicationId FROM community WHERE community.id = '${communityID}'`
    );
    if (communities.length !== 1) {
      console.log(
        `Found community with not exactly one communication: ${communityID}`
      );
    } else {
      const communicationID = communities[0].communicationID;
      await this.processCommunicationProfiles(
        queryRunner,
        communicationID,
        parentStorageBucketID
      );
    }

    await this.processUserGroupProfiles(
      queryRunner,
      'communityId',
      communityID,
      parentStorageBucketID
    );
  }

  private async processUserGroupProfiles(
    queryRunner: QueryRunner,
    parentyEntityField: string,
    parentyEntityValue: string,
    parentStorageBucketID: string
  ) {
    const userGroups: {
      id: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId FROM user_group WHERE user_group.${parentyEntityField} = '${parentyEntityValue}'`
    );
    for (const userGroup of userGroups) {
      await this.createStorageBucketOnProfile(
        queryRunner,
        userGroup.profileId,
        parentStorageBucketID
      );
    }
  }

  private async processCollaborationProfiles(
    queryRunner: QueryRunner,
    collaborationID: string,
    parentStorageBucketID: string
  ) {
    const callouts: {
      id: string;
      profileId: string;
      whiteboardTemplateId: string;
      postTemplateId: string;
      whiteboardRtId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId, whiteboardTemplateId, postTemplateId, whiteboardRtId FROM callout WHERE callout.collaborationId = '${collaborationID}'`
    );
    for (const callout of callouts) {
      await this.createStorageBucketOnProfile(
        queryRunner,
        callout.profileId,
        parentStorageBucketID
      );
      // whiteboards
      const whiteboards: {
        id: string;
        profileId: string;
      }[] = await queryRunner.query(
        `SELECT id, profileId FROM whiteboard WHERE whiteboard.calloutId = '${callout.id}'`
      );
      for (const whiteboard of whiteboards) {
        await this.createStorageBucketOnProfile(
          queryRunner,
          whiteboard.profileId,
          parentStorageBucketID
        );
      }
      // posts
      const posts: {
        id: string;
        profileId: string;
      }[] = await queryRunner.query(
        `SELECT id, profileId FROM post WHERE post.calloutId = '${callout.id}'`
      );
      for (const post of posts) {
        await this.createStorageBucketOnProfile(
          queryRunner,
          post.profileId,
          parentStorageBucketID
        );
      }

      // Single entities
      if (callout.whiteboardRtId) {
        await this.processProfileOnSingleEntity(
          queryRunner,
          'whiteboard_rt',
          callout.whiteboardRtId,
          parentStorageBucketID
        );
      }
      if (callout.postTemplateId) {
        await this.processProfileOnSingleEntity(
          queryRunner,
          'post_template',
          callout.postTemplateId,
          parentStorageBucketID
        );
      }
      if (callout.whiteboardTemplateId) {
        await this.processProfileOnSingleEntity(
          queryRunner,
          'whiteboard_template',
          callout.whiteboardTemplateId,
          parentStorageBucketID
        );
      }
    }

    const collaborations: {
      id: string;
      timelineId: string;
    }[] = await queryRunner.query(
      `SELECT id, timelineId FROM collaboration WHERE collaboration.id = '${collaborationID}'`
    );
    if (collaborations.length !== 1) {
      console.log(`Found collaboration without a timeline: ${collaborationID}`);
    } else {
      const collaboration = collaborations[0];
      const timelines: {
        id: string;
        calendarId: string;
      }[] = await queryRunner.query(
        `SELECT id, calendarId FROM timeline WHERE timeline.id = '${collaboration.timelineId}'`
      );
      if (timelines.length !== 1) {
        console.log(
          `Found timeline without a calendar: ${collaboration.timelineId}`
        );
      } else {
        const timeline = timelines[0];
        const calendarEvents: {
          id: string;
          profileId: string;
        }[] = await queryRunner.query(
          `SELECT id, profileId FROM calendar_event WHERE calendar_event.calendarId = '${timeline.calendarId}'`
        );
        for (const calendarEvent of calendarEvents) {
          await this.createStorageBucketOnProfile(
            queryRunner,
            calendarEvent.profileId,
            parentStorageBucketID
          );
        }
      }
    }
  }

  private async processProfileOnSingleEntity(
    queryRunner: QueryRunner,
    entityType: string,
    entityID: string,
    parentStorageBucketID: string
  ) {
    const entities: {
      id: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId FROM ${entityType} WHERE ${entityType}.id = '${entityID}'`
    );
    if (entities.length !== 1) {
      console.log(
        `Found not exactly one entity of type ${entityType} : ${entityID}`
      );
    } else {
      const entity = entities[0];
      await this.createStorageBucketOnProfile(
        queryRunner,
        entity.profileId,
        parentStorageBucketID
      );
    }
  }

  private async processTemplatesSetProfiles(
    queryRunner: QueryRunner,
    templatesSetID: string,
    parentStorageBucketID: string
  ) {
    await this.processTemplateProfiles(
      queryRunner,
      templatesSetID,
      'whiteboard_template',
      parentStorageBucketID
    );
    await this.processTemplateProfiles(
      queryRunner,
      templatesSetID,
      'innovation_flow_template',
      parentStorageBucketID
    );
    await this.processTemplateProfiles(
      queryRunner,
      templatesSetID,
      'post_template',
      parentStorageBucketID
    );
    await this.processTemplateProfiles(
      queryRunner,
      templatesSetID,
      'callout_template',
      parentStorageBucketID
    );

    // Callout template needs some more...
    const calloutTemplates: {
      id: string;
      profileId: string;
      framingId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId, framingId FROM callout_template WHERE callout_template.templatesSetId = '${templatesSetID}'`
    );
    for (const calloutTemplate of calloutTemplates) {
      const calloutFramings: {
        id: string;
        profileId: string;
      }[] = await queryRunner.query(
        `SELECT id, profileId FROM callout_framing WHERE callout_framing.id = '${calloutTemplate.framingId}'`
      );
      if (calloutFramings.length !== 1) {
        console.log(
          `Found callout template without a framing: ${calloutTemplate.id}`
        );
      } else {
        const calloutFraming = calloutFramings[0];
        await this.createStorageBucketOnProfile(
          queryRunner,
          calloutFraming.profileId,
          parentStorageBucketID
        );
      }
    }
  }

  private async processTemplateProfiles(
    queryRunner: QueryRunner,
    templatesSetID: string,
    entityType: string,
    parentStorageBucketID: string
  ) {
    const templates: {
      id: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, profileId FROM ${entityType} WHERE ${entityType}.templatesSetId = '${templatesSetID}'`
    );
    for (const template of templates) {
      await this.createStorageBucketOnProfile(
        queryRunner,
        template.profileId,
        parentStorageBucketID
      );
    }
  }
}
