import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InAppNotification } from './in.app.notification.entity';
import { InAppNotificationService } from './in.app.notification.service';
import { InAppNotificationResolverMutations } from './in.app.notification.resolver.mutations';
import { InAppNotificationResolverFields } from './in.app.notification.resolver.fields';

@Module({
  imports: [TypeOrmModule.forFeature([InAppNotification]), AuthorizationModule],
  providers: [
    InAppNotificationService,
    InAppNotificationResolverFields,
    InAppNotificationResolverMutations,
  ],
  exports: [InAppNotificationService],
})
export class InAppNotificationModule {}
