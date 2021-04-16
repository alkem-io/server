import { forwardRef, Module } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lifecycle } from './lifecycle.entity';
import { LifecycleResolverFields } from './lifecycle.resolver.fields';
import { ApplicationModule } from '@domain/community/application/application.module';
import { LifecycleResolverMutations } from './lifecycle.resolver.mutations';

@Module({
  imports: [
    forwardRef(() => ApplicationModule),
    TypeOrmModule.forFeature([Lifecycle]),
  ],
  providers: [
    LifecycleService,
    LifecycleResolverFields,
    LifecycleResolverMutations,
  ],
  exports: [LifecycleService],
})
export class LifecycleModule {}
