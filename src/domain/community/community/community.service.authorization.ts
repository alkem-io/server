import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityService } from './community.service';
import { Community, ICommunity } from '@domain/community/community';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition/authorization.definition.interface';

@Injectable()
export class CommunityAuthorizationService {
  constructor(
    private communityService: CommunityService,
    private authorizationDefinitionService: AuthorizationDefinitionService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>
  ) {}

  async applyAuthorizationRules(
    community: ICommunity,
    parentAuthorization: IAuthorizationDefinition | undefined
  ): Promise<ICommunity> {
    community.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
      community.authorization,
      parentAuthorization
    );
    community.authorization = this.extendAuthorizationDefinition(
      community.authorization,
      community
    );

    // cascade
    const groups = await this.communityService.getUserGroups(community);
    for (const group of groups) {
      group.authorization = await this.authorizationDefinitionService.inheritParentAuthorization(
        group.authorization,
        community.authorization
      );
    }

    const applications = await this.communityService.getApplications(community);
    for (const application of applications) {
      application.authorization = await this.authorizationDefinitionService.inheritParentAuthorization(
        application.authorization,
        community.authorization
      );
    }

    return await this.communityRepository.save(community);
  }

  private extendAuthorizationDefinition(
    authorization: IAuthorizationDefinition | undefined,
    community: ICommunity
  ): IAuthorizationDefinition {
    const authorization2 = this.authorizationDefinitionService.appendCredentialAuthorizationRule(
      authorization,
      {
        type: AuthorizationCredential.GlobalAdminCommunity,
        resourceID: '',
      },
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ]
    );

    if (community.credential) {
      return this.authorizationDefinitionService.appendCredentialAuthorizationRule(
        authorization2,
        {
          type: community.credential?.type,
          resourceID: community.credential.resourceID,
        },
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.GRANT,
        ]
      );
    }
    return authorization2;
  }
}
