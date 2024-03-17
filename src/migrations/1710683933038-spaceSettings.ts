import { set } from 'lodash';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class spaceSettings1710683933038 implements MigrationInterface {
  name = 'spaceSettings1710683933038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`settingsStr\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`settingsStr\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`settingsStr\` text NOT NULL`
    );

    const spaces: {
      id: string;
      preferenceSetId: string;
    }[] = await queryRunner.query(`SELECT id, preferenceSetId FROM space`);
    for (const space of spaces) {
      const preferences: {
        id: string;
        value: string;
        preferenceDefinitionId: string;
      }[] = await queryRunner.query(
        `SELECT id, value, preferenceDefinitionId FROM preference WHERE preferenceSetId = '${space.preferenceSetId}'`
      );
      const settings = this.getClonedSpaceSettings();
      for (const preference of preferences) {
        const [preferenceDeinition]: {
          id: string;
          type: string;
        }[] = await queryRunner.query(
          `SELECT id, type FROM preference_definition WHERE id = '${preference.preferenceDefinitionId}'`
        );
        switch (preferenceDeinition.type) {
          case SpacePreferenceType.MEMBERSHIP_JOIN_SPACE_FROM_ANYONE:
            if (preference.value === 'true') {
              settings.membership.policy = 'open';
            }
            break;
          case SpacePreferenceType.MEMBERSHIP_APPLICATIONS_FROM_ANYONE:
            if (preference.value === 'true') {
              settings.membership.policy = 'applications';
            }
            break;
          case SpacePreferenceType.AUTHORIZATION_ANONYMOUS_READ_ACCESS:
            if (preference.value === 'true') {
              settings.privace.mode = 'public';
            } else {
              settings.privace.mode = 'private';
            }
            break;
          case SpacePreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES:
            if (preference.value === 'true') {
              settings.collaboration.allowMembersToCreateSubspaces = true;
            }
            break;
          case SpacePreferenceType.ALLOW_MEMBERS_TO_CREATE_CALLOUTS:
            if (preference.value === 'true') {
              settings.collaboration.allowMembersToCreateCallouts = true;
            }
            break;
          case SpacePreferenceType.MEMBERSHIP_JOIN_SPACE_FROM_HOST_ORGANIZATION_MEMBERS:
            // TODO: get this via Account
            break;
        }
        await queryRunner.query(
          `UPDATE space SET settingsStr = '${JSON.stringify(
            settings
          )}' WHERE id = '${space.id}'`
        );
      }
      // drop preferences that match the preferenceSetId
      await queryRunner.query(
        `DELETE FROM preference WHERE preferenceSetId = '${space.preferenceSetId}'`
      );
      await queryRunner.query(
        `DELETE FROM preference_set WHERE id = '${space.preferenceSetId}'`
      );
    }

    const challenges: {
      id: string;
      preferenceSetId: string;
    }[] = await queryRunner.query(`SELECT id, preferenceSetId FROM challenge`);
    for (const challenge of challenges) {
      const preferences: {
        id: string;
        value: string;
        preferenceDefinitionId: string;
      }[] = await queryRunner.query(
        `SELECT id, value, preferenceDefinitionId FROM preference WHERE preferenceSetId = '${challenge.preferenceSetId}'`
      );
      const settings = this.getClonedSpaceSettings();
      for (const preference of preferences) {
        const [preferenceDeinition]: {
          id: string;
          type: string;
        }[] = await queryRunner.query(
          `SELECT id, type FROM preference_definition WHERE id = '${preference.preferenceDefinitionId}'`
        );
        switch (preferenceDeinition.type) {
          case ChallengePreferenceType.MEMBERSHIP_APPLY_CHALLENGE_FROM_SPACE_MEMBERS:
            if (preference.value === 'true') {
              settings.membership.policy = 'applications';
            }
            break;
          case ChallengePreferenceType.MEMBERSHIP_JOIN_CHALLENGE_FROM_SPACE_MEMBERS:
            if (preference.value === 'true') {
              settings.membership.policy = 'open';
            }
            break;
          case ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS:
            if (preference.value === 'true') {
              settings.privace.mode = 'public';
            } else {
              settings.privace.mode = 'private';
            }
            break;
          case ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES:
            if (preference.value === 'true') {
              settings.collaboration.allowMembersToCreateSubspaces = true;
            }
            break;
          case ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS:
            if (preference.value === 'true') {
              settings.collaboration.allowMembersToCreateCallouts = true;
            }
            break;
        }
        await queryRunner.query(
          `UPDATE challenge SET settingsStr = '${JSON.stringify(
            settings
          )}' WHERE id = '${challenge.id}'`
        );
      }
      // drop preferences that match the preferenceSetId
      await queryRunner.query(
        `DELETE FROM preference WHERE preferenceSetId = '${challenge.preferenceSetId}'`
      );
      await queryRunner.query(
        `DELETE FROM preference_set WHERE id = '${challenge.preferenceSetId}'`
      );
    }

    const opportunities: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM opportunity`);
    for (const opportunity of opportunities) {
      const settings = this.getClonedSpaceSettings();
      settings.privacy.mode = 'public';
      settings.collaboration.allowMembersToCreateSubspaces = false;
      settings.collaboration.allowMembersToCreateCallouts = true;
      settings.collaboration.inheritMembershipRights = true;
      settings.membership.policy = 'open';
      await queryRunner.query(
        `UPDATE opportunity SET settingsStr = '${JSON.stringify(
          settings
        )}' WHERE id = '${opportunity.id}'`
      );
    }

    // Remove preferenceSet from space + challenge. Note: no constraints?
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP COLUMN \`preferenceSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`preferenceSetId\``
    );

    // Todo: delete preference definitions that are no longer needed
    const spacePreferenceDefinitions: string[] =
      Object.values(SpacePreferenceType);
    const challengePreferenceDefinitions: string[] = Object.values(
      ChallengePreferenceType
    );
    const preferenceDefinitionsToRemove = spacePreferenceDefinitions.concat(
      challengePreferenceDefinitions
    );
    for (const preferenceDefinition of preferenceDefinitionsToRemove) {
      await queryRunner.query(
        `DELETE FROM preference_definition WHERE type = '${preferenceDefinition}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private getClonedSpaceSettings(): any {
    return JSON.parse(JSON.stringify(spaceSettingsDefaults));
  }
}

export const spaceSettingsDefaults: any = {
  privacy: {
    mode: 'public',
  },
  membership: {
    policy: 'invitations',
    trustedOrganizations: [],
  },
  collaboration: {
    inheritMembershipRights: true,
    allowMembersToCreateSubspaces: true,
    allowMembersToCreateCallouts: true,
  },
};

export enum ChallengePreferenceType {
  MEMBERSHIP_JOIN_CHALLENGE_FROM_SPACE_MEMBERS = 'MembershipJoinChallengeFromSpaceMembers',
  MEMBERSHIP_APPLY_CHALLENGE_FROM_SPACE_MEMBERS = 'MembershipApplyChallengeFromSpaceMembers',
  MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT = 'MembershipFeedbackOnChallengeContext',
  ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES = 'AllowContributorsToCreateOpportunities',
  ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS = 'AllowContributorsToCreateCallouts',
  ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE = 'AllowSpaceMembersToContribute',
  ALLOW_NON_MEMBERS_READ_ACCESS = 'AllowNonMembersReadAccess',
}

export enum SpacePreferenceType {
  MEMBERSHIP_JOIN_SPACE_FROM_ANYONE = 'MembershipJoinSpaceFromAnyone',
  MEMBERSHIP_JOIN_SPACE_FROM_HOST_ORGANIZATION_MEMBERS = 'MembershipJoinSpaceFromHostOrganizationMembers',
  MEMBERSHIP_APPLICATIONS_FROM_ANYONE = 'MembershipApplicationsFromAnyone',
  AUTHORIZATION_ANONYMOUS_READ_ACCESS = 'AuthorizationAnonymousReadAccess',
  ALLOW_MEMBERS_TO_CREATE_CHALLENGES = 'AllowMembersToCreateChallenges',
  ALLOW_MEMBERS_TO_CREATE_CALLOUTS = 'AllowMembersToCreateCallouts',
}
