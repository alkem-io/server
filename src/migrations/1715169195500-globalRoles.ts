import { MigrationInterface, QueryRunner } from 'typeorm';

export class globalRoles1715169195500 implements MigrationInterface {
  name = 'globalRoles1715169195500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const credentials: {
      id: string;
      resourceID: string;
      type: string;
    }[] = await queryRunner.query(
      `SELECT id, resourceID, type FROM credential`
    );
    for (const credential of credentials) {
      const updatedType = this.updateType(credential.type);
      if (updatedType !== credential.type) {
        await queryRunner.query(
          `UPDATE credential SET type = '${updatedType}' WHERE id = '${credential.id}'`
        );
      }
    }

    // Add the extra space setting
    const spaces: {
      id: string;
      settingsStr: string;
    }[] = await queryRunner.query(`SELECT id, settingsStr FROM space`);
    for (const space of spaces) {
      const settings: SpaceSettingsOld = JSON.parse(space.settingsStr);
      const updatedSettings: SpaceSettingsNew = {
        privacy: {
          mode: settings.privacy.mode,
          allowPlatformSupportAsAdmin: true,
        },
        membership: {
          policy: settings.membership.policy,
          trustedOrganizations: settings.membership.trustedOrganizations,
          allowSubspaceAdminsToInviteMembers: true,
        },
        collaboration: {
          inheritMembershipRights:
            settings.collaboration.inheritMembershipRights,
          allowMembersToCreateSubspaces:
            settings.collaboration.allowMembersToCreateSubspaces,
          allowMembersToCreateCallouts:
            settings.collaboration.allowMembersToCreateCallouts,
        },
      };
      await queryRunner.query(
        `UPDATE space SET settingsStr = '${JSON.stringify(
          updatedSettings
        )}' WHERE id = '${space.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private updateType(type: string): string {
    let updatedType = type;
    updatedType = updatedType.replace(
      'global-admin-community',
      'global-community-read'
    );
    updatedType = updatedType.replace('global-admin-spaces', 'global-support');
    return updatedType;
  }
}

export type SpaceSettingsOld = {
  privacy: {
    mode: 'public' | 'private';
  };
  membership: {
    policy: 'open' | 'applications' | 'invitations';
    trustedOrganizations: string[];
  };
  collaboration: {
    inheritMembershipRights: boolean;
    allowMembersToCreateSubspaces: boolean;
    allowMembersToCreateCallouts: boolean;
  };
};

export type SpaceSettingsNew = {
  privacy: {
    mode: 'public' | 'private';
    allowPlatformSupportAsAdmin: boolean;
  };
  membership: {
    policy: 'open' | 'applications' | 'invitations';
    trustedOrganizations: string[];
    allowSubspaceAdminsToInviteMembers: boolean;
  };
  collaboration: {
    inheritMembershipRights: boolean;
    allowMembersToCreateSubspaces: boolean;
    allowMembersToCreateCallouts: boolean;
  };
};
