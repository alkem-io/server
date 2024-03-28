import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '@test/utils';
import { SearchIngestService } from '@services/api/search2/search.ingest/search.ingest.service';

export const MockSearchIngestService: ValueProvider<
  PublicPart<SearchIngestService>
> = {
  provide: SearchIngestService,
  useValue: {
    ingest: jest.fn(),
    removeIndices: jest.fn(),
  },
};
