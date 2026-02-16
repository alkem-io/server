import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { License } from '@domain/common/license/license.entity';
import { Space } from '@domain/space/space/space.entity';
import { Timeline } from '@domain/timeline/timeline/timeline.entity';
import { CalloutsSet } from '../callouts-set/callouts.set.entity';
import { InnovationFlow } from '../innovation-flow/innovation.flow.entity';

export class Collaboration
  extends AuthorizableEntity
  implements ICollaboration
{
  calloutsSet?: CalloutsSet;

  isTemplate!: boolean;

  timeline?: Timeline;

  innovationFlow?: InnovationFlow;

  license?: License;

  space?: Space;
}
