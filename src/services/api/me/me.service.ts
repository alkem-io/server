import { Injectable } from '@nestjs/common';
import { MeQueryResults } from '@services/api/me/dto';
import { UserService } from '@domain/community/user/user.service';
import { IUser } from '@domain/community/user';
import { ApplicationForRoleResult } from '@services/api/roles/dto/roles.dto.result.application';
import { InvitationForRoleResult } from '@services/api/roles/dto/roles.dto.result.invitation';
import { ApplicationService } from '@domain/community/application/application.service';
import { InvitationService } from '@domain/community/invitation/invitation.service';
import { IInvitation } from '@domain/community/invitation';
import { IApplication } from '@domain/community/application';
import { asyncFilter } from '@common/utils';

export type BuildMeResultsOpts = {
  user: boolean;
  invitations: boolean;
  applications: boolean;
  spaces: boolean;
};

@Injectable()
export class MeService {
  constructor(
    private userService: UserService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService
  ) {}

  public async buildMeResults(userId: string, opts?: BuildMeResultsOpts) {
    const {
      user = true,
      applications = true,
      invitations = true,
      spaces = true,
    } = opts ?? {};

    const results: MeQueryResults = {} as MeQueryResults;

    if (user) {
      results.user = await this.userService.getUserOrFail(userId);
    }

    if (applications) {
      // this will return all applications
      // the code before returned only NOT finalized apps
      // todo: what should we return
      results.applications = await this.getUserApplications(userId);
    }

    if (invitations) {
      // this will return all applications
      // the code before returned only NOT finalized invites
      // todo: what should we return
      results.invitations = await this.getUserInvitations(userId);
    }

    if (spaces) {
      // previously the a custom result object was returned with all it's parent memberships
      // but now we are returning the whole object
      // todo how should we return all the parent memberships
      results.spaceMemberships = [];
    }

    return results;
  }

  private async getUserApplications(userId: string): Promise<IApplication[]> {
    const applications = await this.applicationService.findApplicationsForUser(
      userId
    );

    return asyncFilter(
      applications,
      async app =>
        !(await this.applicationService.isFinalizedApplication(app.id))
    );
  }

  private async getUserInvitations(userId: string): Promise<IInvitation[]> {
    const invitations = await this.invitationService.findInvitationsForUser(
      userId
    );

    return asyncFilter(
      invitations,
      async inv => !(await this.invitationService.isFinalizedInvitation(inv.id))
    );
  }
}
