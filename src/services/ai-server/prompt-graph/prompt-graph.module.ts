import { Module } from '@nestjs/common';
import { PromptGraph } from '../ai-persona/dto/prompt.graph.dto';
import { PromptGraphResolverFields } from './prompt-graph.resolver.fields';

@Module({
  imports: [],
  providers: [PromptGraphResolverFields],
  exports: [PromptGraph, PromptGraphResolverFields],
})
export class PromptGraphModule {}
