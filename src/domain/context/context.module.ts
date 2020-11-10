import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '../reference/reference.module';
import { Context } from './context.entity';
import { ContextResolver } from './context.resolver';
import { ContextService } from './context.service';

@Module({
  imports: [ReferenceModule, TypeOrmModule.forFeature([Context])],
  providers: [ContextResolver, ContextService],
  exports: [ContextService],
})
export class ContextModule {}
