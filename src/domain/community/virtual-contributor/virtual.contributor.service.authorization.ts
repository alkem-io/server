import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { VirtualContributorService } from './virtual.contributor.service';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_TYPES_ORGANIZATION_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_ADMIN_COMMUNITY,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_ADMINS,
  CREDENTIAL_RULE_ORGANIZATION_ADMIN,
  CREDENTIAL_RULE_ORGANIZATION_READ,
  CREDENTIAL_RULE_ORGANIZATION_SELF_REMOVAL,
} from '@common/constants';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { VirtualContributor } from './virtual.contributor.entity';
import { IVirtualContributor } from './virtual.contributor.interface';

@Injectable()
export class VirtualContributorAuthorizationService {
  constructor(
    private virtualService: VirtualContributorService,
    private authorizationPolicy: AuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    @InjectRepository(VirtualContributor)
    private virtualRepository: Repository<VirtualContributor>
  ) {}

  async applyAuthorizationPolicy(
    virtualInput: IVirtualContributor
  ): Promise<IVirtualContributor> {
    const virtual = await this.virtualService.getVirtualContributorOrFail(
      virtualInput.id,
      {
        relations: {
          storageAggregator: true,
          profile: true,
          agent: true,
        },
      }
    );
    if (!virtual.profile || !virtual.storageAggregator || !virtual.agent)
      throw new RelationshipNotFoundException(
        `Unable to load entities for virtual: ${virtual.id} `,
        LogContext.COMMUNITY
      );
    virtual.authorization = await this.authorizationPolicyService.reset(
      virtual.authorization
    );
    virtual.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        virtual.authorization
      );
    virtual.authorization = this.appendCredentialRules(
      virtual.authorization,
      virtual.id
    );

    // NOTE: Clone the authorization policy to ensure the changes are local to profile
    const clonedVirtualAuthorizationAnonymousAccess =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        virtual.authorization
      );
    // To ensure that profile on an virtual is always publicly visible, even for non-authenticated users
    clonedVirtualAuthorizationAnonymousAccess.anonymousReadAccess = true;
    virtual.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        virtual.profile,
        clonedVirtualAuthorizationAnonymousAccess
      );

    virtual.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        virtual.storageAggregator,
        virtual.authorization
      );

    virtual.agent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        virtual.agent.authorization,
        virtual.authorization
      );

    return await this.virtualRepository.save(virtual);
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    virtualID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for virtual: ${virtualID}`,
        LogContext.COMMUNITY
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global admins to reset authorization
    const globalAdminNotInherited =
      this.authorizationPolicy.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.AUTHORIZATION_RESET],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
        ],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_AUTHORIZATION_RESET
      );
    globalAdminNotInherited.cascade = false;
    newRules.push(globalAdminNotInherited);

    const communityAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_ADMIN_COMMUNITY
      );
    newRules.push(communityAdmin);

    // Allow Global admins + Global Space Admins to manage access to Spaces + contents
    const globalAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.GRANT],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
        ],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_ADMINS
      );
    newRules.push(globalAdmin);

    const virtualAdmin = this.authorizationPolicyService.createCredentialRule(
      [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      [
        {
          type: AuthorizationCredential.ORGANIZATION_ADMIN,
          resourceID: virtualID,
        },
        {
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: virtualID,
        },
      ],
      CREDENTIAL_RULE_ORGANIZATION_ADMIN
    );

    newRules.push(virtualAdmin);

    const readPrivilege = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ],
      [
        {
          type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
          resourceID: virtualID,
        },
        {
          type: AuthorizationCredential.ORGANIZATION_ADMIN,
          resourceID: virtualID,
        },
        {
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: virtualID,
        },
        {
          type: AuthorizationCredential.GLOBAL_REGISTERED,
          resourceID: '',
        },
      ],
      CREDENTIAL_RULE_ORGANIZATION_READ
    );
    newRules.push(readPrivilege);

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  public extendAuthorizationPolicyForSelfRemoval(
    virtual: IVirtualContributor,
    userToBeRemovedID: string
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const userSelfRemovalRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.GRANT],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: userToBeRemovedID,
          },
        ],
        CREDENTIAL_RULE_ORGANIZATION_SELF_REMOVAL
      );
    newRules.push(userSelfRemovalRule);

    const clonedVirtualAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        virtual.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedVirtualAuthorization,
        newRules
      );

    return updatedAuthorization;
  }
}
