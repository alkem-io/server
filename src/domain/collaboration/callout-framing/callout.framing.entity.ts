import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { ICalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { compressText, decompressText } from '@common/utils/compression.util';

@Entity()
export class CalloutFraming
  extends AuthorizableEntity
  implements ICalloutFraming
{
  @OneToOne(() => Profile, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;

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
