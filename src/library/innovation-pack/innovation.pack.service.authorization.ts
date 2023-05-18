import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InnovationPackService } from './innovaton.pack.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPack } from './innovation.pack.entity';
import { TemplatesSetAuthorizationService } from '@domain/template/templates-set/templates.set.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { EntityNotInitializedException } from '@common/exceptions';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_LIBRARY_INNOVATION_PACK_PROVIDER_ADMIN } from '@common/constants/authorization/credential.rule.constants';

@Injectable()
export class InnovationPackAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private innovationPackService: InnovationPackService,
    @InjectRepository(InnovationPack)
    private innovationPackRepository: Repository<InnovationPack>
  ) {}

  async applyAuthorizationPolicy(
    innovationPack: IInnovationPack,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IInnovationPack> {
    // Ensure always applying from a clean state
    innovationPack.authorization = this.authorizationPolicyService.reset(
      innovationPack.authorization
    );
    innovationPack.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        innovationPack.authorization,
        parentAuthorization
      );

    innovationPack.authorization = await this.appendCredentialRules(
      innovationPack
    );

    // Cascade down
    const innovationPackPropagated =
      await this.propagateAuthorizationToChildEntities(innovationPack);

    return await this.innovationPackRepository.save(innovationPackPropagated);
  }

  private async propagateAuthorizationToChildEntities(
    innovationPack: IInnovationPack
  ): Promise<IInnovationPack> {
    innovationPack.profile = await this.innovationPackService.getProfile(
      innovationPack
    );
    innovationPack.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        innovationPack.profile,
        innovationPack.authorization
      );
    innovationPack.templatesSet =
      await this.innovationPackService.getTemplatesSetOrFail(innovationPack.id);
    innovationPack.templatesSet =
      await this.templatesSetAuthorizationService.applyAuthorizationPolicy(
        innovationPack.templatesSet,
        innovationPack.authorization
      );

    return innovationPack;
  }

  private async appendCredentialRules(
    innovationPack: IInnovationPack
  ): Promise<IAuthorizationPolicy> {
    const authorization = innovationPack.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for InnovationPack: ${innovationPack.id}`,
        LogContext.LIBRARY
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const providerOrg = await this.innovationPackService.getProvider(
      innovationPack.id
    );
    if (!providerOrg)
      throw new EntityNotInitializedException(
        `Providing organization not found for InnovationPack: ${innovationPack.id}`,
        LogContext.LIBRARY
      );

    const providerOrgAdmins =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          {
            type: AuthorizationCredential.ORGANIZATION_ADMIN,
            resourceID: providerOrg.id,
          },
        ],
        CREDENTIAL_RULE_LIBRARY_INNOVATION_PACK_PROVIDER_ADMIN
      );
    newRules.push(providerOrgAdmins);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
