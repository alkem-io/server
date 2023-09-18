import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
} from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ICalloutResponseDefaults } from './callout.response.defaults.interface';
import { compressText, decompressText } from '@common/utils/compression.util';

@Entity()
export class CalloutResponseDefaults
  extends BaseAlkemioEntity
  implements ICalloutResponseDefaults
{
  @Column('text', { nullable: true })
  postDescription? = '';

  @BeforeInsert()
  @BeforeUpdate()
  async compressContent() {
    if (this.whiteboardContent) {
      this.whiteboardContent = await compressText(this.whiteboardContent);
    }
  }
  @AfterInsert()
  @AfterUpdate()
  @AfterLoad()
  async decompressContent() {
    if (this.whiteboardContent) {
      this.whiteboardContent = await decompressText(this.whiteboardContent);
    }
  }

  @Column('longtext', { nullable: false })
  whiteboardContent?: string;
}
