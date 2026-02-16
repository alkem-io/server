import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Conversation } from '../conversation/conversation.entity';
import { IMessaging } from './messaging.interface';

export class Messaging extends AuthorizableEntity implements IMessaging {
  conversations!: Conversation[];
}
