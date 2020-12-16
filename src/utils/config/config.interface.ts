import { IWebClientConfig } from './client/web.client.config.interface';
import { IUxTemplate } from './template/template.interface';

export interface IConfig {
  webClient?: IWebClientConfig;
  template?: IUxTemplate;
}
