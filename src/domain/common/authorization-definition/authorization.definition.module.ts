import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationDefinition } from './authorization.definition.entity';
import { AuthorizationDefinitionResolverFields } from './authorization.definition.resolver.fields';
import { AuthorizationDefinitionService } from './authorization.definition.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuthorizationDefinition])],
  providers: [
    AuthorizationDefinitionService,
    AuthorizationDefinitionResolverFields,
  ],
  exports: [AuthorizationDefinitionService],
})
export class AuthorizationDefinitionModule {}
