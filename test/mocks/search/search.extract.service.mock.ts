import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '@test/utils';
import { SearchExtractService } from '@services/api/v2/search.extract.service';

export const MockSearchExtractService: ValueProvider<
  PublicPart<SearchExtractService>
> = {
  provide: SearchExtractService,
  useValue: {
    search: jest.fn(),
  },
};
