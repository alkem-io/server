import { Entity, OneToMany, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Conversation } from '../conversation/conversation.entity';
import { IMessaging } from './messaging.interface';
import { Platform } from '@platform/platform/platform.entity';

@Entity('messaging')
export class Messaging
  extends AuthorizableEntity
  implements IMessaging
{
  @OneToMany(
    () => Conversation,
    conversation => conversation.messaging,
    {
      eager: false,
      cascade: true,
    }
  )
  conversations!: Conversation[];

  @OneToOne(() => Platform, platform => platform.messaging)
  platform?: Platform;
}
