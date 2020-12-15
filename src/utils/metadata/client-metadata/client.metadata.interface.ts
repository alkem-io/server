import { IAadConfig } from './aad-config/aad.config.interface';
import { IUxTemplate } from './template/template.interface';

export interface IClientMetadata {
  template?: IUxTemplate;
  aadConfig?: IAadConfig;
}
