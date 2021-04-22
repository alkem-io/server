import { Module } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lifecycle } from './lifecycle.entity';
import { LifecycleResolverFields } from './lifecycle.resolver.fields';

@Module({
  imports: [TypeOrmModule.forFeature([Lifecycle])],
  providers: [LifecycleService, LifecycleResolverFields],
  exports: [LifecycleService],
})
export class LifecycleModule {}
