import { MigrationInterface, QueryRunner } from 'typeorm';

export class profileType1696335225014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`type\` text NOT NULL`
    );

    const name_type_mappings = [
      { tableName: 'space', profileType: ProfileType.SPACE },
      { tableName: 'challenge', profileType: ProfileType.CHALLENGE },
      { tableName: 'opportunity', profileType: ProfileType.OPPORTUNITY },
      {
        tableName: 'innovation_flow',
        profileType: ProfileType.INNOVATION_FLOW,
      },
      {
        tableName: 'callout_framing',
        profileType: ProfileType.CALLOUT_FRAMING,
      },
      { tableName: 'callout', profileType: ProfileType.CALLOUT },
      { tableName: 'post', profileType: ProfileType.POST },
      { tableName: 'whiteboard_rt', profileType: ProfileType.WHITEBOARD_RT },
      { tableName: 'whiteboard', profileType: ProfileType.WHITEBOARD },
      { tableName: 'discussion', profileType: ProfileType.DISCUSSION },
      { tableName: 'organization', profileType: ProfileType.ORGANIZATION },
      { tableName: 'user_group', profileType: ProfileType.USER_GROUP },
      { tableName: 'user', profileType: ProfileType.USER },
      { tableName: 'innovation_hub', profileType: ProfileType.INNOVATION_HUB },
      { tableName: 'calendar_event', profileType: ProfileType.CALENDAR_EVENT },
      {
        tableName: 'innovation_pack',
        profileType: ProfileType.INNOVATION_PACK,
      },
      {
        tableName: 'callout_template',
        profileType: ProfileType.CALLOUT_TEMPLATE,
      },
      {
        tableName: 'innovation_flow_template',
        profileType: ProfileType.INNOVATION_FLOW_TEMPLATE,
      },
      { tableName: 'post_template', profileType: ProfileType.POST_TEMPLATE },
      {
        tableName: 'whiteboard_template',
        profileType: ProfileType.WHITEBOARD_TEMPLATE,
      },
    ];
    for (const mapping of name_type_mappings) {
      await this.updateProfileType(
        queryRunner,
        mapping.tableName,
        mapping.profileType
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`type\``);
  }

  private async updateProfileType(
    queryRunner: QueryRunner,
    tableName: string,
    profileType: ProfileType
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE ${tableName} JOIN profile SET profile.type = '${profileType}' WHERE profile.id = ${tableName}.profileId`
    );
  }
}
enum ProfileType {
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
  INNOVATION_FLOW = 'innovation-flow',
  CALLOUT_FRAMING = 'callout-framing',
  CALLOUT = 'callout',
  POST = 'post',
  WHITEBOARD_RT = 'whiteboard-rt',
  WHITEBOARD = 'whiteboard',
  DISCUSSION = 'discussion',
  ORGANIZATION = 'organization',
  USER_GROUP = 'user-group',
  USER = 'user',
  INNOVATION_HUB = 'innovation-hub',
  CALENDAR_EVENT = 'calendar-event',
  INNOVATION_PACK = 'innovation-pack',
  CALLOUT_TEMPLATE = 'callout-framing',
  INNOVATION_FLOW_TEMPLATE = 'innovation-flow',
  POST_TEMPLATE = 'post-template',
  WHITEBOARD_TEMPLATE = 'whiteboard-template',
}
