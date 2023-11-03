import { Module } from '@nestjs/common';
import { GuidanceReporterService } from './guidance.reporter.service';
import { ElasticsearchClientProvider } from '../elasticsearch-client';
import { UserModule } from '@domain/community/user/user.module';

@Module({
  imports: [UserModule],
  providers: [GuidanceReporterService, ElasticsearchClientProvider],
  exports: [GuidanceReporterService],
})
export class GuidanceReporterModule {}
