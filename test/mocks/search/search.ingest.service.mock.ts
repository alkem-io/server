import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '@test/utils';
import { SearchIngestService } from '@services/api/search/ingest/search.ingest.service';

export const MockSearchIngestService: ValueProvider<
  PublicPart<SearchIngestService>
> = {
  provide: SearchIngestService,
  useValue: {
    // Provide only mocked public methods actually used in tests; removed non-existent 'ingest' and private 'removeIndices'
    ingestFromScratch: jest.fn(),
  },
};
