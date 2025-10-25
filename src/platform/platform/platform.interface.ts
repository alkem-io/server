import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ITemplatesManager } from '@domain/template/templates-manager/templates.manager.interface';
import { ILibrary } from '@library/library/library.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IConfig } from '@platform/configuration/config/config.interface';
import { IForum } from '@platform/forum';
import { ILicensingFramework } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.interface';
import { IMetadata } from '@platform/metadata/metadata.interface';
import { IPlatformSettings } from '@platform/platform-settings/platform.settings.interface';
import { IConversationsSet } from '@domain/communication/conversations-set/conversations.set.interface';

@ObjectType('Platform')
export abstract class IPlatform extends IAuthorizable {
  forum?: IForum;
  library?: ILibrary;
  configuration?: IConfig;
  metadata?: IMetadata;
  storageAggregator!: IStorageAggregator;
  guidanceVirtualContributor?: IVirtualContributor;
  licensingFramework?: ILicensingFramework;
  templatesManager?: ITemplatesManager;
  roleSet!: IRoleSet;
  conversationsSet!: IConversationsSet;

  @Field(() => IPlatformSettings, {
    nullable: false,
    description: 'The settings of the Platform.',
  })
  settings!: IPlatformSettings;
}
