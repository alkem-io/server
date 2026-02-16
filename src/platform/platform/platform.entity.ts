import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Messaging } from '@domain/communication/messaging/messaging.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { TemplatesManager } from '@domain/template/templates-manager/templates.manager.entity';
import { Library } from '@library/library/library.entity';
import { Forum } from '@platform/forum/forum.entity';
import { LicensingFramework } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.entity';
import { IPlatformWellKnownVirtualContributors } from '@platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.interface';
import { IPlatformSettings } from '@platform/platform-settings/platform.settings.interface';
import { IPlatform } from './platform.interface';

export class Platform extends AuthorizableEntity implements IPlatform {
  settings!: IPlatformSettings;

  wellKnownVirtualContributors!: IPlatformWellKnownVirtualContributors;

  forum?: Forum;

  library?: Library;

  templatesManager?: TemplatesManager;

  storageAggregator!: StorageAggregator;

  licensingFramework?: LicensingFramework;

  roleSet!: RoleSet;

  messaging?: Messaging;
}
