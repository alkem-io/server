import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reference } from './reference.entity';
import { ReferenceResolverMutations } from './reference.resolver.mutations';
import { ReferenceService } from './reference.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reference])],
  providers: [ReferenceResolverMutations, ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}
