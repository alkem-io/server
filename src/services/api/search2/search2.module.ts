import { Module } from '@nestjs/common';
import { ElasticsearchClientProvider } from '@services/external/elasticsearch/elasticsearch-client';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UserModule } from '@domain/community/user/user.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { Search2Service } from './search2.service';
import { SearchExtractService } from './search.extract.service';
import { SearchResultService } from './search.result.service';

@Module({
  providers: [
    Search2Service,
    SearchExtractService,
    SearchResultService,
    ElasticsearchClientProvider,
  ],
  imports: [AuthorizationModule, UserModule, OrganizationModule],
  exports: [Search2Service],
})
export class Search2Module {}
