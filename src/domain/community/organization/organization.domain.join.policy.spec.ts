import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { isDomainJoinEligible } from './organization.domain.join.policy';

describe('isDomainJoinEligible', () => {
  const org = (overrides: Record<string, unknown> = {}) => ({
    domain: 'example.com',
    settings: {
      membership: { allowUsersMatchingDomainToJoin: true },
    },
    verification: {
      status: OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION,
    },
    ...overrides,
  });

  it('is eligible when the domain matches, the switch is on and the organization is verified', () => {
    expect(isDomainJoinEligible(org() as any, 'example.com')).toEqual({
      eligible: true,
    });
  });

  it('is case-insensitive on the domain comparison', () => {
    expect(isDomainJoinEligible(org() as any, 'EXAMPLE.com')).toEqual({
      eligible: true,
    });
  });

  it('reports DOMAIN_MISMATCH when the viewer email domain differs', () => {
    expect(isDomainJoinEligible(org() as any, 'other.org')).toEqual({
      eligible: false,
      reason: 'DOMAIN_MISMATCH',
    });
  });

  it('reports SWITCH_OFF when the domain matches but the switch is off', () => {
    const withSwitchOff = org({
      settings: { membership: { allowUsersMatchingDomainToJoin: false } },
    });
    expect(isDomainJoinEligible(withSwitchOff as any, 'example.com')).toEqual({
      eligible: false,
      reason: 'SWITCH_OFF',
    });
  });

  it('reports NOT_VERIFIED when the switch is on but the organization is not verified by manual attestation', () => {
    const unverified = org({ verification: { status: 'unverified' } });
    expect(isDomainJoinEligible(unverified as any, 'example.com')).toEqual({
      eligible: false,
      reason: 'NOT_VERIFIED',
    });
  });

  it('reports NOT_VERIFIED when verification is entirely absent', () => {
    const noVerification = org({ verification: undefined });
    expect(isDomainJoinEligible(noVerification as any, 'example.com')).toEqual({
      eligible: false,
      reason: 'NOT_VERIFIED',
    });
  });

  it('reports DOMAIN_MISMATCH before checking the switch or verification (precedence)', () => {
    const mismatchedButOtherwiseIneligible = org({
      domain: 'example.com',
      settings: { membership: { allowUsersMatchingDomainToJoin: false } },
      verification: { status: 'unverified' },
    });
    expect(
      isDomainJoinEligible(mismatchedButOtherwiseIneligible as any, 'other.org')
    ).toEqual({ eligible: false, reason: 'DOMAIN_MISMATCH' });
  });
});
