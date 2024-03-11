import { Module } from '@nestjs/common';
import { ElasticsearchClientProvider } from '@services/external/elasticsearch/elasticsearch-client';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UserModule } from '@domain/community/user/user.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { SearchIngestService } from './search.ingest/search.ingest.service';
import { Search2Service } from './search2.service';
import { SearchExtractService } from './search.extract';
import { SearchResultService } from './search.result.service';

@Module({
  providers: [
    Search2Service,
    SearchIngestService,
    SearchExtractService,
    SearchResultService,
    ElasticsearchClientProvider,
  ],
  imports: [AuthorizationModule, UserModule, OrganizationModule],
  exports: [Search2Service],
})
export class Search2Module {}
