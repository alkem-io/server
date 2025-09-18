import { Injectable } from '@nestjs/common';
import { PromptGraph } from '../ai-persona/dto/prompt.graph.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PromptGraphResolverFields {
  resolvePromptGraph(): PromptGraph {
    const graphPath = path.resolve(__dirname, 'graph.json');
    const graphData = fs.readFileSync(graphPath, 'utf-8');
    return JSON.parse(graphData);
  }
}
