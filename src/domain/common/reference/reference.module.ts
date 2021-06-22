import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { AuthorizationDefinitionModule } from '../authorization-definition/authorization.definition.module';
import { Reference } from './reference.entity';
import { ReferenceResolverMutations } from './reference.resolver.mutations';
import { ReferenceService } from './reference.service';

@Module({
  imports: [
    AuthorizationDefinitionModule,
    AuthorizationEngineModule,
    TypeOrmModule.forFeature([Reference]),
  ],
  providers: [ReferenceResolverMutations, ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}
