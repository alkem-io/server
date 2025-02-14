import { Module } from '@nestjs/common';
import { ElasticsearchClientProvider } from '@services/external/elasticsearch/elasticsearch-client';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SearchService } from './search.service';
import { SearchExtractService } from './extract/search.extract.service';
import { SearchResultService } from './result/search.result.service';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

@Module({
  imports: [AuthorizationModule, UserLookupModule, OrganizationLookupModule],
  providers: [
    SearchService,
    SearchExtractService,
    SearchResultService,
    ElasticsearchClientProvider,
  ],
  exports: [SearchService, SearchExtractService, SearchResultService],
})
export class Search2Module {}
