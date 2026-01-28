import { ENUM_LENGTH } from '@common/constants';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { ICalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.interface';
import { Link } from '@domain/collaboration/link/link.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Memo } from '@domain/common/memo/memo.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { Callout } from '../callout/callout.entity';

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

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
    default: CalloutFramingType.NONE,
  })
  type!: CalloutFramingType;

  @OneToOne(
    () => Callout,
    callout => callout.framing
  )
  callout?: Callout;

  @OneToOne(
    () => Whiteboard,
    whiteboard => whiteboard.framing,
    {
      eager: false,
      cascade: true,
      onDelete: 'SET NULL',
    }
  )
  @JoinColumn()
  whiteboard?: Whiteboard;

  @OneToOne(() => Link, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  link?: Link;

  @OneToOne(() => Memo, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  memo?: Memo;
}
