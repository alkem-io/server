import { Entity, JoinColumn, OneToOne } from 'typeorm';
import { ICalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { WhiteboardRt } from '@domain/common/whiteboard-rt/whiteboard.rt.entity';

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

  @OneToOne(() => Whiteboard, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  whiteboard?: Whiteboard;

  @OneToOne(() => WhiteboardRt, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  whiteboardRt?: WhiteboardRt;
}
