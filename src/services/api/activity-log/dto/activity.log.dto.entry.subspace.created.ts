import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';
import { ISpace } from '@domain/space/space/space.interface';

@ObjectType('ActivityLogEntrySubspaceCreated', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntrySubspaceCreated
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => ISpace, {
    nullable: false,
    description: 'The Subspace that was created.',
  })
  subspace!: ISpace;
}
