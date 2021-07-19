import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { IOrganisation, Organisation } from '@domain/community/organisation';
import { ProfileAuthorizationService } from '@domain/community/profile/profile.service.authorization';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';
import { AuthorizationRuleCredential } from '@domain/common/authorization-definition/authorization.rule.credential';
import { EntityNotInitializedException } from '@common/exceptions';
import { OrganisationService } from './organisation.service';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';

@Injectable()
export class OrganisationAuthorizationService {
  constructor(
    private organisationService: OrganisationService,
    private authorizationDefinition: AuthorizationDefinitionService,
    private authorizationDefinitionService: AuthorizationDefinitionService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService,
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>
  ) {}

  async applyAuthorizationPolicy(
    organisation: IOrganisation
  ): Promise<IOrganisation> {
    organisation.authorization = await this.authorizationDefinitionService.reset(
      organisation.authorization
    );
    organisation.authorization = this.appendCredentialRules(
      organisation.authorization,
      organisation.id
    );

    if (organisation.profile) {
      organisation.profile.authorization = this.authorizationDefinition.inheritParentAuthorization(
        organisation.profile.authorization,
        organisation.authorization
      );
      organisation.profile = await this.profileAuthorizationService.applyAuthorizationPolicy(
        organisation.profile
      );
    }

    organisation.agent = await this.organisationService.getAgent(organisation);
    organisation.agent.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
      organisation.agent.authorization,
      organisation.authorization
    );

    organisation.groups = await this.organisationService.getUserGroups(
      organisation
    );
    for (const group of organisation.groups) {
      group.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
        group.authorization,
        organisation.authorization
      );
      await this.userGroupAuthorizationService.applyAuthorizationPolicy(group);
    }

    return await this.organisationRepository.save(organisation);
  }

  private appendCredentialRules(
    authorization: IAuthorizationDefinition | undefined,
    organisationID: string
  ): IAuthorizationDefinition {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for organisation: ${organisationID}`,
        LogContext.COMMUNITY
      );

    const newRules: AuthorizationRuleCredential[] = [];

    const globalAdmin = {
      type: AuthorizationCredential.GlobalAdmin,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
    };
    newRules.push(globalAdmin);

    const communityAdmin = {
      type: AuthorizationCredential.GlobalAdminCommunity,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
    };
    newRules.push(communityAdmin);

    const organisationAdmin = {
      type: AuthorizationCredential.OrganisationAdmin,
      resourceID: organisationID,
      grantedPrivileges: [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
    };
    newRules.push(organisationAdmin);

    const organisationMember = {
      type: AuthorizationCredential.OrganisationMember,
      resourceID: organisationID,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    newRules.push(organisationMember);

    const updatedAuthorization = this.authorizationDefinition.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return updatedAuthorization;
  }
}
