import { VirtualPersonaType } from '../virtual.persona.type';
import { VirtualPersonaInputBase } from './virtual.persona.dto.base';

interface QueryContext {
  space: Record<'description' | 'tagline', string>;
  messages: any[];
}

export interface VirtualPersonaQueryInput extends VirtualPersonaInputBase {
  question: string;
  prompt: string;
  virtualContributorType: VirtualPersonaType;
  spaceID: string;
  roomID: string;
  context: QueryContext;
}
