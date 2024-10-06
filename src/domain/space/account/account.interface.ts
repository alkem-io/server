import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ISpace } from '../space/space.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { AccountType } from '@common/enums/account.type';
import { ILicense } from '@domain/common/license/license.interface';

@ObjectType('Account')
export class IAccount extends IAuthorizable {
  @Field(() => AccountType, {
    nullable: true,
    description: 'A type of entity that this Account is being used with.',
  })
  type!: AccountType;

  agent?: IAgent;
  license?: ILicense;
  spaces!: ISpace[];
  virtualContributors!: IVirtualContributor[];
  innovationHubs!: IInnovationHub[];
  innovationPacks!: IInnovationPack[];
  storageAggregator?: IStorageAggregator;
}
