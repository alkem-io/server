import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationDefinition } from './authorization.definition.entity';
import { AuthorizationDefinitionService } from './authorization.definition.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuthorizationDefinition])],
  providers: [AuthorizationDefinitionService],
  exports: [AuthorizationDefinitionService],
})
export class AuthorizationDefinitionModule {}
