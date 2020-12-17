import { IWebClientConfig } from './client/web.client.config.interface';
import { ITemplate } from './template/template.interface';

export interface IConfig {
  webClient?: IWebClientConfig;
  template?: ITemplate;
}
