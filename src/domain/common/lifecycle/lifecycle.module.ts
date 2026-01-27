import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lifecycle } from './lifecycle.entity';
import { LifecycleService } from './lifecycle.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lifecycle])],
  providers: [LifecycleService],
  exports: [LifecycleService],
})
export class LifecycleModule {}
