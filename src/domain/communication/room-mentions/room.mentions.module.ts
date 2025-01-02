import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { Module } from '@nestjs/common';
import { RoomMentionsService } from './room.mentions.service';
import { VirtualContributorMessageModule } from '../virtual.contributor.message/virtual.contributor.message.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { RoomLookupModule } from '../room-lookup/room.lookup.module';

@Module({
  imports: [
    RoomLookupModule,
    EntityResolverModule,
    NotificationAdapterModule,
    VirtualContributorMessageModule,
    VirtualContributorLookupModule,
    UserLookupModule,
    OrganizationLookupModule,
  ],
  providers: [RoomMentionsService],
  exports: [RoomMentionsService],
})
export class RoomMentionsModule {}
