import { Module } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';
import { LifecycleResolver } from './lifecycle.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lifecycle } from './lifecycle.entity';
import { LifecycleResolverFields } from './lifecycle.resolver.fields';

@Module({
  imports: [TypeOrmModule.forFeature([Lifecycle])],
  providers: [LifecycleService, LifecycleResolver, LifecycleResolverFields],
})
export class LifecycleModule {}
