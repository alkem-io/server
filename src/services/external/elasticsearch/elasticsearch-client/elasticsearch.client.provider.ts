import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { Client } from '@elastic/elasticsearch';
import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { elasticSearchClientFactory } from './elasticsearch.client.factory';

export const ElasticsearchClientProvider: FactoryProvider<Client | undefined> =
  {
    provide: ELASTICSEARCH_CLIENT_PROVIDER,
    inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    useFactory: elasticSearchClientFactory,
  };
