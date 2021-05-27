import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { Membership } from './membership.dto.result';
import { UserService } from '@domain/community/user/user.service';
import { MembershipInput } from './membership.dto.input';
import { MembershipEcoverseResultEntry } from './membership.dto.result.ecoverse.entry';

import { CommunityService } from '@domain/community/community/community.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';

export class MembershipService {
  constructor(
    private userService: UserService,
    private userGroupService: UserGroupService,
    private communityService: CommunityService,
    private ecoverseService: EcoverseService,
    private challengeService: ChallengeService,
    private organisationService: OrganisationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async membership(membershipData: MembershipInput): Promise<Membership> {
    const membership = new Membership();
    if (membershipData) {
      throw new Error();
    }

    return membership;
  }

  async createEcoverseMembershipResult(
    ecoverseID: string
  ): Promise<MembershipEcoverseResultEntry> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(ecoverseID);
    const ecoverseResult = new MembershipEcoverseResultEntry();
    ecoverseResult.name = ecoverse.nameID;
    ecoverseResult.id = `ecoverse:${ecoverse.nameID}`;
    return ecoverseResult;
  }
}
