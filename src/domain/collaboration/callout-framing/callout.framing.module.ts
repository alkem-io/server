import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { CalloutFramingService } from './callout.framing.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalloutFraming } from './callout.framing.entity';
import { CalloutFramingAuthorizationService } from './callout.framing.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CalloutFramingResolverFields } from './callout.framing.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    TypeOrmModule.forFeature([CalloutFraming]),
  ],
  providers: [
    CalloutFramingService,
    CalloutFramingAuthorizationService,
    CalloutFramingResolverFields,
  ],
  exports: [CalloutFramingService, CalloutFramingAuthorizationService],
})
export class CalloutFramingModule {}
