import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Template } from '@domain/template/template/template.entity';
import { InnovationFlow } from '../innovation-flow/innovation.flow.entity';
import { IInnovationFlowStateSettings } from '../innovation-flow-state-settings/innovation.flow.settings.interface';
import { IInnovationFlowState } from './innovation.flow.state.interface';

export class InnovationFlowState
  extends AuthorizableEntity
  implements IInnovationFlowState
{
  displayName!: string;

  description?: string;

  settings!: IInnovationFlowStateSettings;

  sortOrder!: number;

  innovationFlow?: InnovationFlow;

  defaultCalloutTemplate?: Template | null;
}
