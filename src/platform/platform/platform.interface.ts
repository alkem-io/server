import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
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
import { IPlatformWellKnownVirtualContributors } from '@platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.interface';

@ObjectType('Platform')
export abstract class IPlatform extends IAuthorizable {
  forum?: IForum;
  library?: ILibrary;
  configuration?: IConfig;
  metadata?: IMetadata;
  storageAggregator!: IStorageAggregator;
  licensingFramework?: ILicensingFramework;
  templatesManager?: ITemplatesManager;
  roleSet!: IRoleSet;
  conversationsSet!: IConversationsSet;

  @Field(() => IPlatformSettings, {
    nullable: false,
    description: 'The settings of the Platform.',
  })
  settings!: IPlatformSettings;

  @Field(() => IPlatformWellKnownVirtualContributors, {
    nullable: false,
    description:
      'The mappings of well-known Virtual Contributors to their UUIDs.',
  })
  wellKnownVirtualContributors!: IPlatformWellKnownVirtualContributors;
}
