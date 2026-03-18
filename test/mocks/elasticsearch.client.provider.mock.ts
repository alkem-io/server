import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { Client } from '@elastic/elasticsearch';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockElasticsearchClientProvider: ValueProvider<
  PublicPart<Client>
> = {
  provide: ELASTICSEARCH_CLIENT_PROVIDER,
  useValue: {
    // jest manual mocks required because of the sheer amount of functions
  },
};
