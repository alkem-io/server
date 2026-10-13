import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalloutFormResponse } from './callout.form.response.entity';
import { CalloutFormResponseResolverFields } from './callout.form.response.resolver.fields';
import { CalloutFormResponseService } from './callout.form.response.service';

@Module({
  imports: [ActorLookupModule, TypeOrmModule.forFeature([CalloutFormResponse])],
  providers: [CalloutFormResponseService, CalloutFormResponseResolverFields],
  exports: [CalloutFormResponseService],
})
export class CalloutFormResponseModule {}
