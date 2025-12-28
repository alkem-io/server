import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';
import { RoomType } from '@common/enums/room.type';
import { VcData } from '../vc-interaction/vc.interaction.entity';

@ObjectType('Room')
export abstract class IRoom extends IAuthorizable {
  type!: RoomType;

  @Field(() => Number, {
    description: 'The number of messages in the Room.',
  })
  messagesCount!: number;

  displayName!: string;

  // Combined VC data (language, thread interactions) stored as JSONB
  vcData!: VcData;

  // GraphQL field (computed from vcData.interactionsByThread)
  vcInteractions?: IVcInteraction[];
}
