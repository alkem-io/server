import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthorizationPolicyType1723121607999
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the type column to the storage aggregator table
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` ADD `type` varchar(128) NULL'
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
    console.log('No down migration for AuthorizationPolicyType1723121607999');
  }

  private async updateAuthorizationPolicyTypeForEntity(
    queryRunner: QueryRunner,
    entityType: string,
    authorizationPolicyType: string
  ) {
    const entities: {
      id: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId FROM \`${entityType}\``
    );
    for (const entity of entities) {
      const [authorizationPolicy]: {
        id: string;
      }[] = await queryRunner.query(
        `SELECT id FROM authorization_policy WHERE id = '${entity.authorizationId}'`
      );
      if (authorizationPolicy) {
        await queryRunner.query(
          `UPDATE \`authorization_policy\` SET type = '${authorizationPolicyType}' WHERE id = '${authorizationPolicy.id}'`
        );
      } else {
        console.log(
          `No storage_aggregator found for ${entityType}: ${entity.id}`
        );
      }
    }
  }
}

export enum AuthorizationPolicyType {
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
