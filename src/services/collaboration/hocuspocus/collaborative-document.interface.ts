import { IBaseAlkemio } from '@domain/common/entity/base-entity';

export interface ICollaborativeDocument extends IBaseAlkemio {
  documentName: string;
  content?: string;
  yDocState?: Buffer;
  documentType?: string;
  version: number;
  lastModified?: Date;
}
