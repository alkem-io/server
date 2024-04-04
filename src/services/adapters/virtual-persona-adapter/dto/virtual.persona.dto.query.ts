import { VirtualPersonaType } from '../virtual.persona.type';
import { VirtualPersonaInputBase } from './virtual.persona.dto.base';

export interface VirtualPersonaQueryInput extends VirtualPersonaInputBase {
  question: string;
  prompt: string;
  virtualContributorType: VirtualPersonaType;
}
