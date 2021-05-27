import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationRule } from '@src/services/authorization-engine/authorizationRule';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { IOrganisation, Organisation } from '@domain/community/organisation';
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';

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
    organisation.authorizationRules = this.createAuthorizationRules(
      organisation.id
    );

    const profile = organisation.profile;
    if (profile) {
      profile.authorizationRules = await this.authorizationEngine.appendAuthorizationRule(
        organisation.authorizationRules,
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

  private createAuthorizationRules(organisationID: string): string {
    const rules: AuthorizationRule[] = [];

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
    rules.push(globalAdmin);

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
    rules.push(communityAdmin);

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
    rules.push(organisationAdmin);

    const organisationMember = {
      type: AuthorizationCredential.OrganisationMember,
      resourceID: organisationID,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    rules.push(organisationMember);

    return JSON.stringify(rules);
  }
}
