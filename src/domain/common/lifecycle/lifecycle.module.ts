import { Module } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lifecycle } from './lifecycle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lifecycle])],
  providers: [LifecycleService],
  exports: [LifecycleService],
})
export class LifecycleModule {}
