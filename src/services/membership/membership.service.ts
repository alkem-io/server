import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { Membership } from './membership.dto.result';
import { UserService } from '@domain/community/user/user.service';
import { MembershipInput } from './membership.dto.input';
import { MembershipEcoverseResultEntry } from './membership.dto.result.ecoverse.entry';

import { CommunityService } from '@domain/community/community/community.service';
import { Community } from '@domain/community/community';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { IChallenge } from '@domain/challenge/challenge';
import { IUserGroup } from '@domain/community/user-group';
import { MembershipResultEntry } from './membership.dto.result.entry';
import { AuthorizationCredential } from '@common/enums/authorization.credential';

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
    const storedChallenges: IChallenge[] = [];
    const storedUserGroups: IUserGroup[] = [];
    for (const credential of credentials) {
      if (credential.type === AuthorizationCredential.OrganisationMember) {
        const organisation = await this.organisationService.getOrganisationOrFail(
          credential.resourceID
        );
        const orgResult = new MembershipResultEntry(
          organisation.name,
          `organisation:${organisation.id.toString()}`
        );
        membership.organisations.push(orgResult);
      } else if (credential.type === AuthorizationCredential.CommunityMember) {
        const community = await this.communityService.getCommunityOrFail(
          credential.resourceID,
          {
            relations: ['ecoverse', 'challenge'],
          }
        );
        const ecoverse = (community as Community).ecoverseID;
        const challenge = (community as Community).challenge;
        if (ecoverse) {
          const ecoverseResult = await this.createEcoverseMembershipResult(
            ecoverse
          );
          membership.ecoverses.push(ecoverseResult);
        } else if (challenge) {
          storedChallenges.push(challenge);
        }
      } else if (credential.type === AuthorizationCredential.UserGroupMember) {
        const group = await this.userGroupService.getUserGroupByIdOrFail(
          credential.resourceID
        );
        storedUserGroups.push(group);
      }
    }

    // Assume single ecoverse for now.
    // Todo: when domain-model restructuring goes in use the ecoverseID to determine ecoverse scope.
    if (membership.ecoverses.length > 0) {
      const ecoverseResult = membership.ecoverses[0];
      for (const challenge of storedChallenges) {
        const challengeResult = new MembershipResultEntry(
          challenge.name,
          `challenge:${challenge.id.toString()}`
        );
        ecoverseResult.challenges.push(challengeResult);
      }
      for (const group of storedUserGroups) {
        const groupResult = new MembershipResultEntry(
          group.name,
          `group:${group.id.toString()}`
        );
        ecoverseResult.userGroups.push(groupResult);
      }
    }

    return membership;
  }

  async createEcoverseMembershipResult(
    ecoverseID: string
  ): Promise<MembershipEcoverseResultEntry> {
    const ecoverse = await this.ecoverseService.getEcoverseByIdOrFail(
      ecoverseID,
      {
        relations: ['challenges'],
      }
    );
    const ecoverseResult = new MembershipEcoverseResultEntry();
    ecoverseResult.name = ecoverse.name;
    ecoverseResult.id = `ecoverse:${ecoverse.id.toString()}`;
    return ecoverseResult;
  }
}
