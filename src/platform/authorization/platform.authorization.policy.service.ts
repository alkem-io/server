import {
  CREDENTIAL_RULE_TYPES_PLATFORM_CONTENT_FULL_ACCESS,
  CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PlatformAuthorizationPolicyService {
  private readonly rootAuthorizationPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>
  ) {
    this.rootAuthorizationPolicy = this.createRootAuthorizationPolicy();
  }

  public async getPlatformAuthorizationPolicy(): Promise<IAuthorizationPolicy> {
    const platform = await this.platformRepository.findOne({
      where: {},
      relations: {
        authorization: true,
      },
    });

    if (!platform || !platform.authorization) {
      throw new EntityNotFoundException(
        'No Platform authorization found!',
        LogContext.PLATFORM
      );
    }
    return platform.authorization;
  }

  public inheritRootAuthorizationPolicy(
    childAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    return this.authorizationPolicyService.inheritParentAuthorization(
      childAuthorization,
      this.rootAuthorizationPolicy
    );
  }

  private createRootAuthorizationPolicy(): IAuthorizationPolicy {
    const rootAuthorization = new AuthorizationPolicy(
      AuthorizationPolicyType.PLATFORM
    );

    const credentialRules = this.createRootCredentialRules();

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      rootAuthorization,
      credentialRules
    );
  }

  private createRootCredentialRules(): IAuthorizationPolicyRuleCredential[] {
    const credentialRules: IAuthorizationPolicyRuleCredential[] = [];
    const globalAdmins =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.GRANT,
        ],
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS
      );
    credentialRules.push(globalAdmins);

    // 027-platform-role-redesign (T036, research D5/D6, FR-007(e), eleventh
    // analyze pass): the replacement for the root god-mode grant, added
    // ALONGSIDE it (removal is Slice B, T072 — never narrow before the
    // replacement grant exists). Content Full Access gets READ everywhere
    // plus its own privilege — deliberately NOT CREATE/UPDATE/DELETE, and
    // NOT UPDATE_NAMEID:
    //  - CREATE/UPDATE/DELETE are excluded because cascading them would
    //    satisfy the OWNER branch of every dual-path gate this feature adds
    //    (A6 `DELETE ∨ DELETE_ORGANIZATION`, A7 `UPDATE ∨
    //    PLATFORM_SUPPORT_ORG_RESOURCES`, A8 `DELETE ∨
    //    PLATFORM_CONTENT_FULL_ACCESS`) — a policy cannot distinguish an
    //    owner's DELETE from an inherited one, so Content Full Access would
    //    silently reach Support's family (delete any organization, edit any
    //    organization's packs) no matter how the gates are written.
    //  - UPDATE_NAMEID is excluded because A17 is owned by NO global role
    //    (spec row 2, FR-020) — cascading it would hand Content Full Access
    //    entity renames the spec explicitly denies it.
    // The role loses nothing enumerated: every A8 surface is gated on
    // PLATFORM_CONTENT_FULL_ACCESS explicitly (T043), and READ is retained
    // so the role can see what it administers — the ONE declared FR-010
    // exception (A16, recorded as an acceptedExtraReachers entry).
    // Additively reaches the legacy credentials that hold the content
    // cascade today too (global-admin via this very rule, global-support via
    // the platform-subtree cascade in platform.service.authorization.ts) —
    // both keep their own CRUD until Slice B (T076), which is what makes
    // this non-breaking for existing content admins.
    const contentFullAccess =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
        ],
        [
          AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_CONTENT_FULL_ACCESS
      );
    credentialRules.push(contentFullAccess);

    return credentialRules;
  }
}
