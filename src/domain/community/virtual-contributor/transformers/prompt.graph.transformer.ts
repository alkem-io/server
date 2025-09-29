import { PromptGraphDefinition } from '../dto/prompt-graph-definition/prompt.graph.definition.dto';

export const PromptGraphTransformer = {
  to: (value?: PromptGraphDefinition) => value,
  from: (value?: any) =>
    value ? Object.assign(new PromptGraphDefinition(), value) : undefined,
};
