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

@Injectable()
export class OrganisationAuthorizationService {
  constructor(
    private authorizationDefinition: AuthorizationDefinitionService,
    private profileAuthorizationService: ProfileAuthorizationService,
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>
  ) {}

  async applyAuthorizationRules(
    organisation: IOrganisation
  ): Promise<IOrganisation> {
    organisation.authorization = this.updateAuthorizationDefinition(
      organisation.authorization,
      organisation.id
    );

    const profile = organisation.profile;
    if (profile) {
      profile.authorization = this.authorizationDefinition.inheritParentAuthorization(
        profile.authorization,
        organisation.authorization
      );
      profile.authorization = await this.authorizationDefinition.appendCredentialAuthorizationRule(
        profile.authorization,
        {
          type: AuthorizationCredential.GlobalAdminCommunity,
          resourceID: '',
        },
        [AuthorizationPrivilege.UPDATE]
      );
      organisation.profile = await this.profileAuthorizationService.applyAuthorizationRules(
        profile
      );
    }

    return await this.organisationRepository.save(organisation);
  }

  private updateAuthorizationDefinition(
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
