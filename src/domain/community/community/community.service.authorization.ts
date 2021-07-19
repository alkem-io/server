import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityService } from './community.service';
import { Community, ICommunity } from '@domain/community/community';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition/authorization.definition.interface';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';

@Injectable()
export class CommunityAuthorizationService {
  constructor(
    private communityService: CommunityService,
    private authorizationDefinitionService: AuthorizationDefinitionService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>
  ) {}

  async applyAuthorizationPolicy(
    community: ICommunity,
    parentAuthorization: IAuthorizationDefinition | undefined
  ): Promise<ICommunity> {
    community.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
      community.authorization,
      parentAuthorization
    );
    // always false
    community.authorization.anonymousReadAccess = false;

    community.authorization = this.extendAuthorizationDefinition(
      community.authorization
    );

    // cascade
    const groups = await this.communityService.getUserGroups(community);
    for (const group of groups) {
      group.authorization = await this.authorizationDefinitionService.inheritParentAuthorization(
        group.authorization,
        community.authorization
      );
      await this.userGroupAuthorizationService.applyAuthorizationPolicy(group);
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
    authorization: IAuthorizationDefinition | undefined
  ): IAuthorizationDefinition {
    return this.authorizationDefinitionService.appendCredentialAuthorizationRule(
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
  }
}
