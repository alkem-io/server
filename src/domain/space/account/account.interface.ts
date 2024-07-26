import { ObjectType } from '@nestjs/graphql';
import { ITemplatesSet } from '@domain/template/templates-set';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ISpaceDefaults } from '../space.defaults/space.defaults.interface';
import { ISpace } from '../space/space.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';

@ObjectType('Account')
export class IAccount extends IAuthorizable {
  agent?: IAgent;
  space?: ISpace;
  library?: ITemplatesSet;
  defaults?: ISpaceDefaults;
  virtualContributors!: IVirtualContributor[];
  innovationPacks!: IInnovationPack[];
  storageAggregator?: IStorageAggregator;
}
