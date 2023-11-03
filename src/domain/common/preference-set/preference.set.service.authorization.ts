import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PreferenceSetService } from './preference.set.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { PreferenceSet } from './preference.set.entity';
import { IPreferenceSet } from '.';

@Injectable()
export class PreferenceSetAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private preferenceSetService: PreferenceSetService,
    @InjectRepository(PreferenceSet)
    private preferenceSetRepository: Repository<PreferenceSet>
  ) {}

  async applyAuthorizationPolicy(
    preferenceSetInput: IPreferenceSet,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IPreferenceSet> {
    const preferenceSet =
      await this.preferenceSetService.getPreferenceSetOrFail(
        preferenceSetInput.id,
        {
          relations: {},
        }
      );

    // Inherit from the parent
    preferenceSet.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        preferenceSet.authorization,
        parentAuthorization
      );

    if (preferenceSet.preferences) {
      for (const preference of preferenceSet.preferences) {
        preference.authorization =
          this.authorizationPolicyService.inheritParentAuthorization(
            preference.authorization,
            preferenceSet.authorization
          );
      }
    }

    return await this.preferenceSetRepository.save(preferenceSet);
  }
}
