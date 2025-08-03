import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InAppNotificationEntity } from './in.app.notification.entity';
import { InAppNotificationService } from './in.app.notification.service';
import { InAppNotificationResolverMutations } from './in.app.notification.resolver.mutations';

@Module({
  imports: [
    TypeOrmModule.forFeature([InAppNotificationEntity]),
    AuthorizationModule,
  ],
  providers: [InAppNotificationService, InAppNotificationResolverMutations],
  exports: [InAppNotificationService],
})
export class InAppNotificationModule {}
