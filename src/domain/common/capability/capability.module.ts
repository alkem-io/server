import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Capability } from './capability.entity';
import { CapabilityService } from './capability.service';

@Module({
  imports: [TypeOrmModule.forFeature([Capability])],
  providers: [CapabilityService],
  exports: [CapabilityService],
})
export class CapabilityModule {}
