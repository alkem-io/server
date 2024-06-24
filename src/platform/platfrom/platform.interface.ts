import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ILibrary } from '@library/library/library.interface';
import { ObjectType } from '@nestjs/graphql';
import { IConfig } from '@platform/configuration/config/config.interface';
import { IForum } from '@platform/forum';
import { ILicensing } from '@platform/licensing/licensing.interface';
import { IMetadata } from '@platform/metadata/metadata.interface';
import { IVirtualPersona } from '@platform/virtual-persona/virtual.persona.interface';

@ObjectType('Platform')
export abstract class IPlatform extends IAuthorizable {
  forum?: IForum;
  library?: ILibrary;
  configuration?: IConfig;
  metadata?: IMetadata;
  storageAggregator!: IStorageAggregator;
  innovationHubs?: IInnovationHub[];
  licensing?: ILicensing;
  virtualPersonas?: IVirtualPersona[];
}
