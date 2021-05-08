import { Module } from '@nestjs/common';
import { SsiAgentService } from './agent.service';
import { SsiAgentResolver } from './agent.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature(undefined, 'jolocom')],
  providers: [SsiAgentService, SsiAgentResolver],
  exports: [SsiAgentService],
})
export class SsiAgentModule {}
