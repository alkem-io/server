import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reference } from './reference.entity';
import { ReferenceResolver } from './reference.resolver';
import { ReferenceService } from './reference.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reference])],
  providers: [ReferenceResolver, ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}
