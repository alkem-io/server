import { ValueProvider } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { PublicPart } from '../utils/public-part';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';

export const MockElasticsearchClientProvider: ValueProvider<
  PublicPart<Client>
> = {
  provide: ELASTICSEARCH_CLIENT_PROVIDER,
  useValue: {
    // jest manual mocks required because of the sheer amount of functions
  },
};
