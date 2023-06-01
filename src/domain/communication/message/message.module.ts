import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { MessageResolverFields } from './message.resolver.fields';
import { MessageReactionModule } from '../message.reaction/message.reaction.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { MessageService } from './message.service';

@Module({
  imports: [
    EntityResolverModule,
    UserModule,
    MessageReactionModule,
    AuthorizationModule,
    CommunicationAdapterModule,
  ],
  providers: [MessageService, MessageResolverFields],
  exports: [MessageService, MessageResolverFields],
})
export class MessageModule {}
