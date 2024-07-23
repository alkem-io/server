import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { IVirtualContributor } from '@domain/community/virtual-contributor';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { InnovationHubService } from '@domain/innovation-hub';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { AccountService } from '@domain/space/account/account.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { UpdateInnovationHubPlatformSettingsInput } from './dto/innovation.hub.dto.update.settings';
import { UpdateVirtualContributorPlatformSettingsInput } from './dto/virtual.contributor.dto.update.settings';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IOrganization } from '@domain/community/organization';
import { UpdateOrganizationPlatformSettingsInput } from './dto/organization.dto.update.platform.settings';
import { OrganizationService } from '@domain/community/organization/organization.service';

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly innovationHubService: InnovationHubService,
    private readonly virtualContributorService: VirtualContributorService,
    private readonly accountService: AccountService,
    private readonly authorizationService: AuthorizationService,
    private readonly organizationService: OrganizationService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async updateInnovationHubPlatformSettingsOrFail(
    input: UpdateInnovationHubPlatformSettingsInput
  ): Promise<IInnovationHub | never> {
    const innovationHub: IInnovationHub =
      await this.innovationHubService.getInnovationHubOrFail(input.ID, {
        relations: { account: true },
      });

    if (!innovationHub.account)
      this.logger.warn(
        `Account for  innovation hub ${innovationHub.id} not found!`,
        LogContext.PLATFORM
      );

    const account = await this.accountService.getAccountOrFail(input.accountID);
    innovationHub.account = account;

    return await this.save(innovationHub);
  }

  public async save(innovationHub: IInnovationHub): Promise<IInnovationHub> {
    return await this.innovationHubService.save(innovationHub);
  }

  public async updateVirtualContributorPlatformSettingsOrFail(
    input: UpdateVirtualContributorPlatformSettingsInput
  ): Promise<IVirtualContributor | never> {
    const virtualContributor: IVirtualContributor =
      await this.virtualContributorService.getVirtualContributorOrFail(
        input.ID,
        {
          relations: { account: true },
        }
      );

    if (!virtualContributor.account)
      this.logger.warn(
        `Account for virtual contributor ${virtualContributor.id} not found!`,
        LogContext.PLATFORM
      );

    const account = await this.accountService.getAccountOrFail(input.accountID);
    virtualContributor.account = account;

    return await this.virtualContributorService.save(virtualContributor);
  }

  async updateOrganizationPlatformSettings(
    organization: IOrganization,
    organizationData: UpdateOrganizationPlatformSettingsInput
  ): Promise<IOrganization> {
    if (
      organizationData.nameID.toLowerCase() !==
      organization.nameID.toLowerCase()
    ) {
      // updating the nameID, check new value is allowed
      await this.organizationService.checkNameIdOrFail(organizationData.nameID);
      organization.nameID = organizationData.nameID;
    }

    return await this.organizationService.save(organization);
  }

  public async checkAuthorizationOrFail(agentInfo: AgentInfo, action: string) {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      action
    );
  }
}
