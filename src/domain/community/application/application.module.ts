import { NVPModule } from '@domain/common/nvp/nvp.module';
import { Application } from '@domain/community/application/application.entity';
import { ApplicationService } from '@domain/community/application/application.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationFactoryModule } from './application.factory.module';

@Module({
  imports: [
    ApplicationFactoryModule,
    NVPModule,
    TypeOrmModule.forFeature([Application]),
  ],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
