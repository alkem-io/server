import { AccountType } from '@common/enums/account.type';
import { IActor, IActorFull } from '@domain/actor/actor/actor.interface';
import { ILicense } from '@domain/common/license/license.interface';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { IAccountLicensePlan } from '@domain/space/account.license.plan/account.license.plan.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISpace } from '../space/space.interface';

@ObjectType('Account', {
  implements: () => [IActorFull],
})
export class IAccount extends IActor implements IActorFull {
  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the Account, unique within the platform.',
  })
  declare nameID: string;

  // Property renamed to accountType to avoid conflict with Actor.type discriminator
  // Note: GraphQL field name changed from 'type' to 'accountType' for schema compatibility
  @Field(() => AccountType, {
    nullable: true,
    description: 'The type of Account (user or organization hosted).',
  })
  accountType!: AccountType;

  @Field(() => IAccountLicensePlan, {
    nullable: false,
    description:
      'The base license plan assigned to this Account. Additional entitlements may be added via other means.',
  })
  baselineLicensePlan!: IAccountLicensePlan;

  // Account extends Actor - credentials are on Actor.credentials

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
