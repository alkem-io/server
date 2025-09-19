import { PromptGraphDefinition } from '../dto/prompt.graph.defintion.dto';

export const PromptGraphTransformer = {
  to: (value?: PromptGraphDefinition) => value,
  from: (value?: any) =>
    value ? Object.assign(new PromptGraphDefinition(), value) : undefined,
};
