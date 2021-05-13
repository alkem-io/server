import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EcosystemModelService } from './ecosystem-model.service';
import { ActorGroupModule } from '../actor-group/actor-group.module';
import { EcosystemModel } from './ecosystem-model.entity';
import { EcosystemModelResolverMutations } from './ecosystem-model.resolver.mutations';

@Module({
  imports: [ActorGroupModule, TypeOrmModule.forFeature([EcosystemModel])],
  providers: [EcosystemModelResolverMutations, EcosystemModelService],
  exports: [EcosystemModelService],
})
export class EcosystemModelModule {}
