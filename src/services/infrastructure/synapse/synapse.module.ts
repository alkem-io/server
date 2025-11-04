import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SynapseAdminService } from './synapse-admin.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({ timeout: 5000, maxRedirects: 5 }),
  ],
  providers: [SynapseAdminService],
  exports: [SynapseAdminService],
})
export class SynapseModule {}
