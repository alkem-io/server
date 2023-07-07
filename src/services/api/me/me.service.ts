import { Injectable } from '@nestjs/common';
import { UserService } from '@domain/community/user/user.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { InvitationService } from '@domain/community/invitation/invitation.service';
import { IInvitation } from '@domain/community/invitation';
import { IApplication } from '@domain/community/application';
import { ICredential } from '@src/domain';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { groupCredentialsByEntity } from '@services/api/roles/util/group.credentials.by.entity';
import { SpaceService } from '@domain/challenge/space/space.service';

@Injectable()
export class MeService {
  constructor(
    private userService: UserService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private spaceService: SpaceService
  ) {}

  public getUserInvitations(
    userId: string,
    states?: string[]
  ): Promise<IInvitation[]> {
    return this.invitationService.findInvitationsForUser(userId, states);
  }

  public getUserApplications(
    userId: string,
    states?: string[]
  ): Promise<IApplication[]> {
    return this.applicationService.findApplicationsForUser(userId, states);
  }

  public getSpaceMemberships(
    credentials: ICredential[],
    visibilities: SpaceVisibility[] = []
  ) {
    const credentialMap = groupCredentialsByEntity(credentials);
    const spaceIds = Array.from(credentialMap.get('spaces')?.keys() ?? []);

    return this.spaceService.getSpacesByVisibilities(spaceIds, visibilities);
  }
}
