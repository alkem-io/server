import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entitlement } from './entitlement.entity';
import { EntitlementService } from './entitlement.service';

@Module({
  imports: [TypeOrmModule.forFeature([Entitlement])],
  providers: [EntitlementService],
  exports: [EntitlementService],
})
export class EntitlementModule {}
