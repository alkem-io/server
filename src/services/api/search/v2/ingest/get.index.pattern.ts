import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@common/enums';
import { AlkemioConfig } from '@src/types';

const DEFAULT_INDEX_PATTERN = 'alkemio-data-';

export const getIndexPattern = (
  configService: ConfigService<AlkemioConfig, true>
) => {
  const pattern =
    configService.get(ConfigurationTypes.SEARCH)?.index_pattern ??
    DEFAULT_INDEX_PATTERN;
  const prefix =
    configService.get(ConfigurationTypes.SEARCH)?.index_pattern_prefix ?? '';

  return `${prefix}${pattern}`;
};
