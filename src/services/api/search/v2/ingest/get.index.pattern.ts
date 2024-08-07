import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';

const DEFAULT_INDEX_PATTERN = 'alkemio-data-';

export const getIndexPattern = (
  configService: ConfigService<AlkemioConfig, true>
) => {
  return configService.get('search.index_pattern', { infer: true }) ??
    DEFAULT_INDEX_PATTERN;
};
