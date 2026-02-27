import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { Module } from '@nestjs/common';
import { ElasticsearchClientProvider } from '@services/external/elasticsearch/elasticsearch-client';
import { SearchExtractService } from './extract/search.extract.service';
import { SearchResultService } from './result/search.result.service';
import { SearchResolverQueries } from './search.resolver.queries';
import { SearchService } from './search.service';

@Module({
  imports: [AuthorizationModule, ActorLookupModule],
  providers: [
    SearchService,
    SearchExtractService,
    SearchResultService,
    ElasticsearchClientProvider,
    SearchResolverQueries,
  ],
  exports: [SearchService, SearchExtractService, SearchResultService],
})
export class SearchModule {}
