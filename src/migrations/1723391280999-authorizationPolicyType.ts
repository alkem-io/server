import { MigrationInterface, QueryRunner } from 'typeorm';
import { chunkArray } from './utils/chunk.array';

export class AuthorizationPolicyType1723121607999
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the type column to the storage aggregator table
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` ADD `type` varchar(128) NOT NULL'
    );
    for (const key in AuthorizationPolicyType) {
      if (AuthorizationPolicyType.hasOwnProperty(key)) {
        const type =
          AuthorizationPolicyType[key as keyof typeof AuthorizationPolicyType];
        await this.updateAuthorizationPolicyTypeForEntity(
          queryRunner,
          key.toLowerCase(),
          type
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`authorization_policy\` DROP COLUMN \`type\``);
  }

  private async updateAuthorizationPolicyTypeForEntity(
    queryRunner: QueryRunner,
    entityName: string,
    authorizationPolicyType: string
  ) {
    // get all the policies for this entity
    const entities: {
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT authorizationId FROM \`${entityName}\``
    );
    // extract only the auth ids
    const authIds = entities.map(entity => entity.authorizationId);
    // convert the ids to strings with quotes
    const authIdsStr = authIds.map(id => `'${id}'`);
    // chunk the big array since the IN operator may have some limitations for the amount of values used with it
    const idChunks = chunkArray(authIdsStr, 500);
    // for every chunk, do an UPDATE with WHERE IN
    for (const idChunk of idChunks) {
      // join the ids in a string
      const idChunkStr = idChunk.join(',');
      // update
      await queryRunner.query(
        `UPDATE \`authorization_policy\` SET type = '${authorizationPolicyType}' WHERE id IN (${idChunkStr})`
      );
    }
  }
}

enum AuthorizationPolicyType {
  AGENT = 'agent',
  CALLOUT = 'callout',
  CALLOUT_CONTRIBUTION = 'callout-contribution',
  CALLOUT_FRAMING = 'callout-framing',
  COLLABORATION = 'collaboration',
  INNOVATION_FLOW = 'innovation-flow',
  INNOVATION_HUB = 'innovation-hub',
  INNOVATION_PACK = 'innovation-pack',
  LINK = 'link',
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  PREFERENCE = 'preference',
  PREFERENCE_SET = 'preference-set',
  PROFILE = 'profile',
  REFERENCE = 'reference',
  TAGSET = 'tagset',
  VISUAL = 'visual',
  COMMUNICATION = 'communication',
  ROOM = 'room',
  AI_PERSONA = 'ai-persona',
  APPLICATION = 'application',
  COMMUNITY = 'community',
  COMMUNITY_GUIDELINES = 'community-guidelines',
  INVITATION = 'invitation',
  FORUM = 'forum',
  PLATFORM = 'platform',
  DISCUSSION = 'discussion',
  USER = 'user',
  USER_GROUP = 'user-group',
  ACTOR = 'actor',
  ACTOR_GROUP = 'actor-group',
  ORGANIZATION = 'organization',
  ORGANIZATION_VERIFICATION = 'organization-verification',
  CONTEXT = 'context',
  ECOSYSTEM_MODEL = 'ecosystem-model',
  VIRTUAL_CONTRIBUTOR = 'virtual-contributor',
  SPACE = 'space',
  SPACE_DEFAULTS = 'space-defaults',
  ACCOUNT = 'account',
  DOCUMENT = 'document',
  STORAGE_AGGREGATOR = 'storage-aggregator',
  STORAGE_BUCKET = 'storage-bucket',
  TEMPLATES_SET = 'templates-set',
  CALENDAR = 'calendar',
  CALENDAR_EVENT = 'calendar-event',
  TIMELINE = 'timeline',
  WHITEBOARD_TEMPLATE = 'whiteboard-template',
  POST_TEMPLATE = 'template',
  CALLOUT_TEMPLATE = 'template',
  INNOVATION_FLOW_TEMPLATE = 'template',
  COMMUNITY_GUIDELINES_TEMPLATE = 'template',
  LICENSING = 'licensing',

  AI_PERSONA_SERVICE = 'ai-persona-service',
}
