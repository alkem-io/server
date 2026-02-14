import { AccountType } from '@common/enums/account.type';
import { Agent } from '@domain/agent/agent/agent.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { License } from '@domain/common/license/license.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IAccount } from '@domain/space/account/account.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { IAccountLicensePlan } from '../account.license.plan/account.license.plan.interface';
import { Space } from '../space/space.entity';

export class Account extends AuthorizableEntity implements IAccount {
  type!: AccountType;

  externalSubscriptionID?: string;

  spaces!: Space[];

  baselineLicensePlan!: IAccountLicensePlan;

  agent?: Agent;

  license?: License;

  storageAggregator?: StorageAggregator;

  virtualContributors!: VirtualContributor[];

  innovationHubs!: InnovationHub[];

  innovationPacks!: InnovationPack[];
}
