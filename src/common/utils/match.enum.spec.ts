import { LicenseFeatureFlagName } from '@common/enums/license.feature.flag.name';
import { matchEnumString } from './match.enum';
import { CalloutType } from '@common/enums/callout.type';

describe('matchEnumString function', () => {
  it('should return a match for a valid input string', () => {
    const inputString = 'whiteboard-rt';
    const matchResult = matchEnumString(LicenseFeatureFlagName, inputString);

    expect(matchResult).toEqual({
      key: 'WHITEBOART_RT',
      value: 'whiteboard-rt',
    });
  });

  it('should return null for an invalid input string', () => {
    const inputString = 'InvalidValue';
    const matchResult = matchEnumString(LicenseFeatureFlagName, inputString);

    expect(matchResult).toBeNull();
  });

  it('should work with any TypeScript enum', () => {
    const inputString = 'post';
    const matchResult = matchEnumString(CalloutType, inputString);

    expect(matchResult).toEqual({ key: 'POST', value: 'post' });
  });
});
