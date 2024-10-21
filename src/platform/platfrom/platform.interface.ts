import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ITemplatesManager } from '@domain/template/templates-manager/templates.manager.interface';
import { ILibrary } from '@library/library/library.interface';
import { ObjectType } from '@nestjs/graphql';
import { IConfig } from '@platform/configuration/config/config.interface';
import { IForum } from '@platform/forum';
import { IPlatformInvitation } from '@platform/invitation';
import { ILicensing } from '@platform/licensing/licensing.interface';
import { IMetadata } from '@platform/metadata/metadata.interface';

@ObjectType('Platform')
export abstract class IPlatform extends IAuthorizable {
  forum?: IForum;
  library?: ILibrary;
  configuration?: IConfig;
  metadata?: IMetadata;
  storageAggregator!: IStorageAggregator;
  licensing?: ILicensing;
  platformInvitations!: IPlatformInvitation[];
  templatesManager?: ITemplatesManager;
}
