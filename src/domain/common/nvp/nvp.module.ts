import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { NVPService } from './nvp.service';

@Module({
  imports: [TypeOrmModule.forFeature([NVP])],
  providers: [NVPService],
  exports: [NVPService],
})
export class NVPModule {}
