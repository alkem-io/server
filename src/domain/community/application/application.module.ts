import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { NVPModule } from '@domain/common/nvp/nvp.module';
import { Application } from '@domain/community/application/application.entity';
import { ApplicationService } from '@domain/community/application/application.service';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationFactoryModule } from './application.factory.module';

@Module({
  imports: [
    ApplicationFactoryModule,
    forwardRef(() => LifecycleModule),
    NVPModule,
    TypeOrmModule.forFeature([Application]),
  ],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
