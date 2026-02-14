import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { TagsetTemplate } from '@domain/common/tagset-template/tagset.template.entity';
import { IInnovationFlowSettings } from '../innovation-flow-settings/innovation.flow.settings.interface';
import { InnovationFlowState } from '../innovation-flow-state/innovation.flow.state.entity';
import { IInnovationFlow } from './innovation.flow.interface';

export class InnovationFlow
  extends AuthorizableEntity
  implements IInnovationFlow
{
  profile!: Profile;

  states!: InnovationFlowState[];

  currentStateID?: string;

  settings!: IInnovationFlowSettings;

  flowStatesTagsetTemplate!: TagsetTemplate;
}
