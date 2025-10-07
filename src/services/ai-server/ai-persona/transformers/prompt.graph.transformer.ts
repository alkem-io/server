import { PromptGraph } from '../../prompt-graph/dto/prompt.graph.dto';

export const PromptGraphTransformer = {
  to: (value?: PromptGraph) => value,
  from: (value?: any) =>
    value ? Object.assign(new PromptGraph(), value) : undefined,
};
