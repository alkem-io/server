import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ILibrary } from '@library/library/library.interface';
import { ObjectType } from '@nestjs/graphql';
import { IConfig } from '@platform/configuration/config/config.interface';
import { ILicensing } from '@platform/licensing/licensing.interface';
import { IMetadata } from '@platform/metadata/metadata.interface';

@ObjectType('Platform')
export abstract class IPlatform extends IAuthorizable {
  communication?: ICommunication;
  library?: ILibrary;
  configuration?: IConfig;
  metadata?: IMetadata;
  storageAggregator!: IStorageAggregator;
  innovationHubs?: IInnovationHub[];
  licensing?: ILicensing;
}
