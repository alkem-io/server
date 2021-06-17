import { Module } from '@nestjs/common';
import { SsiAgentService } from './ssi.agent.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature(undefined, 'jolocom')],
  providers: [SsiAgentService],
  exports: [SsiAgentService],
})
export class SsiAgentModule {}
