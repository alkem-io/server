import { Module } from '@nestjs/common';
import { KratosAdapter } from './kratos.adapter';
import { KonfigModule } from '@platform/configuration/config/config.module';

@Module({
  imports: [KonfigModule],
  providers: [KratosAdapter],
  exports: [KratosAdapter],
})
export class KratosAdapterModule {}
