import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NVP } from '@domain/common/nvp/nvp.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NVP])],
  providers: [],
  exports: [],
})
export class NVPModule {}
