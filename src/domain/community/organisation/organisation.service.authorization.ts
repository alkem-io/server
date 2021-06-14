import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { IOrganisation, Organisation } from '@domain/community/organisation';
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';
import {
  AuthorizationDefinition,
  IAuthorizationDefinition,
} from '@domain/common/authorization-definition';
import { AuthorizationCredentialRule } from '@src/services/platform/authorization-engine/authorization.credential.rule';

@Injectable()
export class OrganisationAuthorizationService {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private profileAuthorizationService: ProfileAuthorizationService,
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>
  ) {}

  async applyAuthorizationRules(
    organisation: IOrganisation
  ): Promise<IOrganisation> {
    organisation.authorization = this.createAuthorizationDefinition(
      organisation.id
    );

    const profile = organisation.profile;
    if (profile) {
      profile.authorization = await this.authorizationEngine.appendCredentialAuthorizationRule(
        organisation.authorization,
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

  private createAuthorizationDefinition(
    organisationID: string
  ): IAuthorizationDefinition {
    const authorization = new AuthorizationDefinition();
    const newRules: AuthorizationCredentialRule[] = [];

    const globalAdmin = {
      type: AuthorizationCredential.GlobalAdmin,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
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

    this.authorizationEngine.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
