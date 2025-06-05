import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ICollaborativeDocument } from './collaborative-document.interface';
import { MID_TEXT_LENGTH } from '@common/constants';

@Entity()
export class CollaborativeDocument
  extends BaseAlkemioEntity
  implements ICollaborativeDocument
{
  @Column('varchar', { length: MID_TEXT_LENGTH, unique: true })
  documentName!: string;

  @Column('longtext', { nullable: true })
  content?: string;

  @Column('longblob', { nullable: true })
  yDocState?: Buffer;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  documentType?: string;

  @Column('int', { default: 0 })
  version: number = 0;

  @Column('timestamp', { nullable: true })
  lastModified?: Date;

  constructor() {
    super();
    this.version = 0;
  }
}
