import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IPreferenceSet } from '.';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';

@Injectable()
export class PreferenceSetAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  applyAuthorizationPolicy(
    preferenceSet: IPreferenceSet,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy[] {
    if (!preferenceSet.preferences) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for preference set authorization: ${preferenceSet.id} `,
        LogContext.COMMUNITY
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit from the parent
    preferenceSet.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        preferenceSet.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(preferenceSet.authorization);

    if (preferenceSet.preferences) {
      for (const preference of preferenceSet.preferences) {
        preference.authorization =
          this.authorizationPolicyService.inheritParentAuthorization(
            preference.authorization,
            preferenceSet.authorization
          );
        updatedAuthorizations.push(preference.authorization);
      }
    }

    return updatedAuthorizations;
  }
}
