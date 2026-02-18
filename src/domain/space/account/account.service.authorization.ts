import {
  CREDENTIAL_RULE_PLATFORM_CREATE_INNOVATION_PACK,
  CREDENTIAL_RULE_PLATFORM_CREATE_SPACE,
  CREDENTIAL_RULE_PLATFORM_CREATE_VC,
  CREDENTIAL_RULE_TYPES_ACCOUNT_CHILD_ENTITIES,
  CREDENTIAL_RULE_TYPES_ACCOUNT_LICENSE_MANAGE,
  CREDENTIAL_RULE_TYPES_ACCOUNT_MANAGE,
  CREDENTIAL_RULE_TYPES_ACCOUNT_MANAGE_GLOBAL_ROLES,
  CREDENTIAL_RULE_TYPES_ACCOUNT_RESOURCES_MANAGE,
  CREDENTIAL_RULE_TYPES_ACCOUNT_RESOURCES_TRANSFER_ACCEPT,
  CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ,
} from '@common/constants/authorization/credential.rule.types.constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { VirtualContributorAuthorizationService } from '@domain/community/virtual-contributor/virtual.contributor.service.authorization';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { InnovationPackAuthorizationService } from '@library/innovation-pack/innovation.pack.service.authorization';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SpaceAuthorizationService } from '../space/space.service.authorization';
import { IAccount } from './account.interface';
import { AccountService } from './account.service';

@Injectable()
export class AccountAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private virtualContributorAuthorizationService: VirtualContributorAuthorizationService,
    private innovationPackAuthorizationService: InnovationPackAuthorizationService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private innovationHubAuthorizationService: InnovationHubAuthorizationService,
    private accountService: AccountService,
    private licenseAuthorizationService: LicenseAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyAuthorizationPolicy(
    accountInput: IAccount
  ): Promise<IAuthorizationPolicy[]> {
    const account = await this.accountService.getAccountOrFail(
      accountInput.id,
      {
        relations: {
          spaces: {
            templatesManager: true,
          },
          virtualContributors: true,
          innovationPacks: true,
          innovationHubs: true,
          storageAggregator: true,
          license: true,
        },
      }
    );
    if (!account.storageAggregator || !account.license) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of auth reset: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    const accountAdminCredential: ICredentialDefinition = {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: account.id,
    };

    // Ensure always applying from a clean state
    account.authorization = this.authorizationPolicyService.reset(
      account.authorization
    );
    account.authorization =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        account.authorization,
        AuthorizationPrivilege.READ
      );
    account.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        account.authorization
      );

    account.authorization = await this.extendAuthorizationPolicy(
      account.authorization,
      accountAdminCredential
    );

    account.authorization = await this.authorizationPolicyService.save(
      account.authorization
    );

    const childUpdatedAuthorizations =
      await this.applyAuthorizationPolicyForChildEntities(account);
    updatedAuthorizations.push(...childUpdatedAuthorizations);

    return updatedAuthorizations;
  }

  public async getClonedAccountAuthExtendedForChildEntities(
    account: IAccount
  ): Promise<IAuthorizationPolicy> {
    let clonedAccountAuth =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        account.authorization
      );
    // Get the account admin credential
    const accountAdminCredential: ICredentialDefinition = {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: account.id,
    };

    clonedAccountAuth = this.extendAuthorizationPolicyForChildEntities(
      clonedAccountAuth,
      accountAdminCredential
    );
    return clonedAccountAuth;
  }

  public async applyAuthorizationPolicyForChildEntities(
    account: IAccount
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !account.spaces ||
      !account.virtualContributors ||
      !account.innovationPacks ||
      !account.storageAggregator ||
      !account.innovationHubs ||
      !account.license
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of auth reset: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    for (const space of account.spaces) {
      const spaceAuthorizations =
        await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
      this.logger.verbose?.(
        `space nameID ${space.nameID}: authorizations to reset count = ${spaceAuthorizations.length}`,
        LogContext.AUTH
      );
      updatedAuthorizations.push(...spaceAuthorizations);
    }

    const licenseAuthorizations =
      this.licenseAuthorizationService.applyAuthorizationPolicy(
        account.license,
        account.authorization
      );
    updatedAuthorizations.push(...licenseAuthorizations);

    const storageAggregatorAuthorizations =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        account.storageAggregator,
        account.authorization
      );
    updatedAuthorizations.push(...storageAggregatorAuthorizations);

    for (const vc of account.virtualContributors) {
      const updatedVcAuthorizations =
        await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
          vc
        );
      updatedAuthorizations.push(...updatedVcAuthorizations);
    }

    // For the VCs, InnovationPacks + InnovationHubs use a cloned + extended authorization
    const clonedAccountAuth =
      await this.getClonedAccountAuthExtendedForChildEntities(account);

    for (const ip of account.innovationPacks) {
      const innovationPackAuthorizations =
        await this.innovationPackAuthorizationService.applyAuthorizationPolicy(
          ip,
          clonedAccountAuth
        );
      updatedAuthorizations.push(...innovationPackAuthorizations);
    }

    for (const innovationHub of account.innovationHubs) {
      const updatedInnovationHubAuthorizations =
        await this.innovationHubAuthorizationService.applyAuthorizationPolicy(
          innovationHub,
          clonedAccountAuth
        );
      updatedAuthorizations.push(...updatedInnovationHubAuthorizations);
    }

    return updatedAuthorizations;
  }

  private async extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    accountAdminCredential: ICredentialDefinition
  ): Promise<IAuthorizationPolicy> {
    if (!authorization) {
      throw new EntityNotInitializedException(
        'Authorization definition not found for account',
        LogContext.ACCOUNT
      );
    }

    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    // By default it is world visible. TODO: work through the logic on this
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        authorization,
        AuthorizationPrivilege.READ
      );

    // Allow global admins to reset authorization, manage platform settings
    // and transfer resources
    const authorizationReset =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.AUTHORIZATION_RESET,
          AuthorizationPrivilege.LICENSE_RESET,
          AuthorizationPrivilege.PLATFORM_ADMIN,
          AuthorizationPrivilege.CREATE_SPACE,
          AuthorizationPrivilege.CREATE_INNOVATION_HUB,
          AuthorizationPrivilege.CREATE_INNOVATION_PACK,
          AuthorizationPrivilege.CREATE_VIRTUAL,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_ACCOUNT_MANAGE_GLOBAL_ROLES
      );
    authorizationReset.cascade = false;
    newRules.push(authorizationReset);

    // Allow Global Spaces Read to view Spaces + contents
    const globalSpacesReader =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_SPACES_READER],
        CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ
      );
    newRules.push(globalSpacesReader);

    // Add privileges related to offering and accepting transfer of resources
    const accountResourcesManage =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT, // Later remove?
        ],
        CREDENTIAL_RULE_TYPES_ACCOUNT_RESOURCES_MANAGE
      );
    accountResourcesManage.criterias.push(accountAdminCredential);
    accountResourcesManage.cascade = false;
    newRules.push(accountResourcesManage);

    const acceptResourceTransfers =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_ACCOUNT_RESOURCES_TRANSFER_ACCEPT
      );
    acceptResourceTransfers.criterias.push(accountAdminCredential);
    acceptResourceTransfers.cascade = false;
    newRules.push(acceptResourceTransfers);

    const accountLicenseManage =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        ],
        CREDENTIAL_RULE_TYPES_ACCOUNT_LICENSE_MANAGE
      );
    accountLicenseManage.cascade = false;
    newRules.push(accountLicenseManage);

    // Allow hosts (users = self mgmt, org = org admin) to manage resources in their account in a way that cascades
    const accountHostManage =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [accountAdminCredential],
        CREDENTIAL_RULE_TYPES_ACCOUNT_MANAGE
      );
    accountHostManage.cascade = true;
    newRules.push(accountHostManage);

    const createSpace = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.CREATE_SPACE],
      [accountAdminCredential],
      CREDENTIAL_RULE_PLATFORM_CREATE_SPACE
    );
    createSpace.cascade = false;
    newRules.push(createSpace);

    const createVC = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.CREATE_VIRTUAL],
      [accountAdminCredential],
      CREDENTIAL_RULE_PLATFORM_CREATE_VC
    );
    createVC.cascade = false;
    newRules.push(createVC);

    const createInnovationPack =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.CREATE_INNOVATION_PACK],
        [accountAdminCredential],
        CREDENTIAL_RULE_PLATFORM_CREATE_INNOVATION_PACK
      );
    createInnovationPack.cascade = false;
    newRules.push(createInnovationPack);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      updatedAuthorization,
      newRules
    );
  }

  private extendAuthorizationPolicyForChildEntities(
    authorization: IAuthorizationPolicy | undefined,
    accountAdminCredential: ICredentialDefinition
  ): IAuthorizationPolicy {
    if (!authorization) {
      throw new EntityNotInitializedException(
        'Authorization definition not found for account',
        LogContext.ACCOUNT
      );
    }
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const accountChildEntities =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.GRANT,
        ],
        [accountAdminCredential],
        CREDENTIAL_RULE_TYPES_ACCOUNT_CHILD_ENTITIES
      );
    newRules.push(accountChildEntities);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }
}
