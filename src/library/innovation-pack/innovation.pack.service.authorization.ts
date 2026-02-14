import { LogContext } from '@common/enums';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { TemplatesSetAuthorizationService } from '@domain/template/templates-set/templates.set.service.authorization';
import { Injectable } from '@nestjs/common';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPackService } from './innovation.pack.service';

@Injectable()
export class InnovationPackAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private innovationPackService: InnovationPackService
  ) {}

  async applyAuthorizationPolicy(
    innovationPackInput: IInnovationPack,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(
        innovationPackInput.id,
        {
          with: {
            profile: true,
            templatesSet: true,
          },
        }
      );
    if (!innovationPack.profile || !innovationPack.templatesSet) {
      throw new RelationshipNotFoundException(
        `Unable to load entities for innovation pack auth reset: ${innovationPack.id} `,
        LogContext.COMMUNITY
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Ensure always applying from a clean state
    innovationPack.authorization = this.authorizationPolicyService.reset(
      innovationPack.authorization
    );
    innovationPack.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        innovationPack.authorization,
        parentAuthorization
      );
    innovationPack.authorization = this.appendCredentialRules(innovationPack);
    updatedAuthorizations.push(innovationPack.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        innovationPack.profile.id,
        innovationPack.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    const templatesSetAuthorizations =
      await this.templatesSetAuthorizationService.applyAuthorizationPolicy(
        innovationPack.templatesSet,
        innovationPack.authorization
      );
    updatedAuthorizations.push(...templatesSetAuthorizations);

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    innovationPack: IInnovationPack
  ): IAuthorizationPolicy {
    const authorization = innovationPack.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for InnovationPack: ${innovationPack.id}`,
        LogContext.LIBRARY
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  // // TODO: what does this look like after the move? Prviously the library explicitly allowed read access to anonymous users

  // private extendStorageAuthorizationPolicy(
  //   storageAuthorization: IAuthorizationPolicy | undefined
  // ): IAuthorizationPolicy {
  //   if (!storageAuthorization)
  //     throw new EntityNotInitializedException(
  //       'Authorization definition not found',
  //       LogContext.LIBRARY
  //     );

  //   const newRules: IAuthorizationPolicyRuleCredential[] = [];

  //   // Any member can upload
  //   const registeredUsersCanUpload =
  //     this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
  //       [AuthorizationPrivilege.FILE_UPLOAD],
  //       [AuthorizationCredential.GLOBAL_REGISTERED],
  //       CREDENTIAL_RULE_TYPES_LIBRARY_FILE_UPLOAD_ANY_USER
  //     );
  //   registeredUsersCanUpload.cascade = false;
  //   newRules.push(registeredUsersCanUpload);

  //   this.authorizationPolicyService.appendCredentialAuthorizationRules(
  //     storageAuthorization,
  //     newRules
  //   );

  //   return storageAuthorization;
  // }
}
