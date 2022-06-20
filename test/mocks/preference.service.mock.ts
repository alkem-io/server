import { PreferenceService } from '@domain/common/preference';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockPreferenceService: ValueProvider<
  PublicPart<PreferenceService>
> = {
  provide: PreferenceService,
  useValue: {
    createDefinition: jest.fn(),
    createPreference: jest.fn(),
    definitionExists: jest.fn(),
    getAllDefinitionsInSet: jest.fn(),
    getDefaultPreferenceValue: jest.fn(),
    getPreferenceOrFail: jest.fn(),
    removePreference: jest.fn(),
    updatePreference: jest.fn(),
    validatePreferenceTypeOrFail: jest.fn(),
  },
};
