import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity, OneToMany } from 'typeorm';
import { Conversation } from '../conversation/conversation.entity';
import { IMessaging } from './messaging.interface';

@Entity('messaging')
export class Messaging extends AuthorizableEntity implements IMessaging {
  @OneToMany(
    () => Conversation,
    conversation => conversation.messaging,
    {
      eager: false,
      cascade: true,
    }
  )
  conversations!: Conversation[];
}
