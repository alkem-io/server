import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@common/enums';

export const getDocumentUrlPattern = (configService: ConfigService) => {
  const { endpoint_cluster, path_api_private_rest } = configService.get(
    ConfigurationTypes.HOSTING
  );
  return `${endpoint_cluster}${path_api_private_rest}/storage/document/`;
};
