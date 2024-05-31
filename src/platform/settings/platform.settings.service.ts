import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { IVirtualContributor } from '@domain/community/virtual-contributor';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { InnovationHubService } from '@domain/innovation-hub';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { AccountService } from '@domain/space/account/account.service';
import { Injectable } from '@nestjs/common';
import { UpdateInnovationHubPlatformSettingsInput } from './dto/innovation.hub.dto.update.settings';
import { UpdateVirtualContributorPlatformSettingsInput } from './dto/virtual.contributor.dto.update.settings';

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly innovationHubService: InnovationHubService,
    private readonly virtualContributorService: VirtualContributorService,
    private readonly accountService: AccountService
  ) {}

  public async updateInnovationHubPlatformSettingsOrFail(
    input: UpdateInnovationHubPlatformSettingsInput
  ): Promise<IInnovationHub | never> {
    const innovationHub: IInnovationHub =
      await this.innovationHubService.getInnovationHubOrFail(
        {
          idOrNameId: input.ID,
        },
        { relations: { account: true } }
      );

    if (!innovationHub.account)
      throw new EntityNotFoundException(
        `Account for innovation hub ${innovationHub.id} not found!`,
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
      throw new EntityNotFoundException(
        `Account for innovation hub ${virtualContributor.id} not found!`,
        LogContext.PLATFORM
      );

    const account = await this.accountService.getAccountOrFail(input.accountID);
    virtualContributor.account = account;

    return await this.virtualContributorService.save(virtualContributor);
  }
}
