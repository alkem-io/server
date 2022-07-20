import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutModule } from '../callout/callout.module';
import { CollaborationService } from './collaboration.service';
import { Collaboration } from './collaboration.entity';
import { NamingModule } from '@services/domain/naming/naming.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    CalloutModule,
    NamingModule,
    TypeOrmModule.forFeature([Collaboration]),
  ],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
