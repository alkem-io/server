import { AccountType } from '@common/enums/account.type';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ILicense } from '@domain/common/license/license.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAccountLicensePlan } from '../account.license.plan/account.license.plan.interface';
import { ISpace } from '../space/space.interface';

@ObjectType('Account')
export class IAccount extends IAuthorizable {
  @Field(() => AccountType, {
    nullable: true,
    description: 'A type of entity that this Account is being used with.',
  })
  type!: AccountType;

  @Field(() => IAccountLicensePlan, {
    nullable: false,
    description:
      'The base license plan assigned to this Account. Additional entitlements may be added via other means.',
  })
  baselineLicensePlan!: IAccountLicensePlan;

  agent?: IAgent;

  spaces!: ISpace[];
  virtualContributors!: IVirtualContributor[];
  innovationHubs!: IInnovationHub[];
  innovationPacks!: IInnovationPack[];
  storageAggregator?: IStorageAggregator;

  license?: ILicense;

  @Field(() => String, {
    nullable: true,
    description: 'The external subscription ID for this Account.',
  })
  externalSubscriptionID?: string;
}
