import { Module } from '@nestjs/common';
import { SpaceDefaultsService } from './space.defaults.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceDefaults } from './space.defaults.entity';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([SpaceDefaults]),
  ],
  providers: [SpaceDefaultsService],
  exports: [SpaceDefaultsService],
})
export class SpaceDefaultsModule {}
