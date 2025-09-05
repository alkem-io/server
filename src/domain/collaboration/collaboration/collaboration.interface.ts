import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';
import { ILicense } from '@domain/common/license/license.interface';
import { ICalloutsSet } from '../callouts-set/callouts.set.interface';
import { ISpace } from '@domain/space/space/space.interface';

@ObjectType('Collaboration')
export abstract class ICollaboration extends IAuthorizable {
  calloutsSet?: ICalloutsSet;

  timeline?: ITimeline;

  innovationFlow?: IInnovationFlow;

  license?: ILicense;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether this Collaboration is a Template or not.',
  })
  isTemplate!: boolean;

  space?: ISpace;
}
