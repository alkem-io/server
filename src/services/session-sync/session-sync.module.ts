import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SynapseModule } from '@services/infrastructure/synapse/synapse.module';
import { KratosSessionRepository } from './kratos-session.repository';
import { SessionSyncService } from './session-sync.service';

@Module({
  imports: [ConfigModule, SynapseModule],
  providers: [SessionSyncService, KratosSessionRepository],
})
export class SessionSyncModule {}
