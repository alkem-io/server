import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InnovationHubService } from './innovation.hub.service';
import { InnovationHub } from './innovation.hub.entity';
import { InnovationHubFieldResolver } from './innovation.hub.field.resolver';
import { HubModule } from '@domain/challenge/hub/hub.module';

@Module({
  imports: [TypeOrmModule.forFeature([InnovationHub]), HubModule],
  providers: [InnovationHubService, InnovationHubFieldResolver],
  exports: [InnovationHubService],
})
export class InnovationHubModule {}
