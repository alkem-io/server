import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationDefinitionModule } from '../authorization-definition/authorization.definition.module';
import { Tagset } from './tagset.entity';
import { TagsetService } from './tagset.service';

@Module({
  imports: [AuthorizationDefinitionModule, TypeOrmModule.forFeature([Tagset])],
  providers: [TagsetService],
  exports: [TagsetService],
})
export class TagsetModule {}
