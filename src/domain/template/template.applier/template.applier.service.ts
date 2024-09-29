import { Injectable } from '@nestjs/common';
import { UpdateInnovationFlowFromTemplateInput } from './dto/template.dto.update.innovation.flow';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { TemplateService } from '../template/template.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovaton.flow.service';

@Injectable()
export class TemplateApplierService {
  constructor(
    private templateService: TemplateService,
    private innovationFlowService: InnovationFlowService
  ) {}

  async updateInnovationFlowStatesFromTemplate(
    innovationFlowData: UpdateInnovationFlowFromTemplateInput
  ): Promise<IInnovationFlow> {
    const innovationFlowFromTemplate =
      await this.templateService.getInnovationFlow(
        innovationFlowData.innovationFlowTemplateID
      );
    const newStatesStr = innovationFlowFromTemplate.states;
    const result = await this.innovationFlowService.updateInnovationFlowStates(
      innovationFlowData.innovationFlowID,
      newStatesStr
    );
    return result;
  }
}
