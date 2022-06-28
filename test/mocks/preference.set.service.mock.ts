import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockPreferenceSetService: ValueProvider<
  PublicPart<PreferenceSetService>
> = {
  provide: PreferenceSetService,
  useValue: {
    createPreferenceSet: jest.fn(),
    deletePreferenceSet: jest.fn(),
    getPreferenceOrFail: jest.fn(),
    getPreferenceSetOrFail: jest.fn(),
    getPreferenceValue: jest.fn(),
    getPreferencesOrFail: jest.fn(),
  },
};
