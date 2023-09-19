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
import { compressText, decompressText } from '@common/utils/compression.util';
import { ICalloutContributionDefaults } from './callout.contribution.defaults.interface';

@Entity()
export class CalloutContributionDefaults
  extends BaseAlkemioEntity
  implements ICalloutContributionDefaults
{
  @Column('text', { nullable: true })
  postDescription? = '';

  @Column('longtext', { nullable: true })
  whiteboardContent?: string;

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
}
