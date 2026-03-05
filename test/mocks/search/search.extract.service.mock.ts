import { ValueProvider } from '@nestjs/common';
import { SearchExtractService } from '@services/api/search/extract/search.extract.service';
import { PublicPart } from '@test/utils';
import { vi } from 'vitest';

export const MockSearchExtractService: ValueProvider<
  PublicPart<SearchExtractService>
> = {
  provide: SearchExtractService,
  useValue: {
    search: vi.fn(),
  },
};
