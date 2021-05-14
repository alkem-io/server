import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { Membership } from './membership.dto.result';
import { UserService } from '@domain/community/user/user.service';
import { MembershipInput } from './membership.dto.input';
import { AuthorizationCredential } from '@core/authorization';
import { CommunityService } from '@domain/community/community/community.service';
import { Community } from '@domain/community/community';
import { UserGroupService } from '@domain/community/user-group/user-group.service';

export class MembershipService {
  constructor(
    private userService: UserService,
    private userGroupService: UserGroupService,
    private communityService: CommunityService,
    private ecoverseService: EcoverseService,
    private organisationService: OrganisationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async membership(membershipData: MembershipInput): Promise<Membership> {
    const membership = new Membership();
    const user = await this.userService.getUserWithAgent(membershipData.userID);
    const credentials = user.agent?.credentials;
    if (!credentials) {
      return membership;
    }
    for (const credential of credentials) {
      if (credential.type === AuthorizationCredential.OrganisationMember) {
        const organisation = await this.organisationService.getOrganisationByIdOrFail(
          credential.resourceID
        );
        membership.organisations.push(organisation);
      } else if (credential.type === AuthorizationCredential.CommunityMember) {
        const community = await this.communityService.getCommunityOrFail(
          credential.resourceID,
          {
            relations: ['ecoverse', 'challenge'],
          }
        );
        const ecoverseID = (community as Community).ecoverse?.id;
        if (ecoverseID) {
          const ecoverse = await this.ecoverseService.getEcoverseByIdOrFail(
            ecoverseID,
            {
              relations: ['challenges'],
            }
          );
          membership.ecoverses.push(ecoverse);
        }

        const challengeID = (community as Community).challenge?.id;
        if (challengeID) {
          const challenge = await this.ecoverseService.getEcoverseByIdOrFail(
            challengeID
          );
          membership.challenges.push(challenge);
        }
      } else if (credential.type === AuthorizationCredential.UserGroupMember) {
        const group = await this.userGroupService.getUserGroupByIdOrFail(
          credential.resourceID
        );
        membership.userGroups.push(group);
      }
    }
    return membership;
  }
}
