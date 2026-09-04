import { ROLE_SET_INVITE_BATCH_MAX } from '@common/constants';
import { validate } from 'class-validator';
import { InviteForEntryRoleOnRoleSetInput } from './role.set.dto.entry.role.invite';

const validInput = (): InviteForEntryRoleOnRoleSetInput => {
  const input = new InviteForEntryRoleOnRoleSetInput();
  input.roleSetID = '12345678-1234-1234-1234-123456789012';
  input.invitedActorIDs = [];
  input.invitedUserEmails = [];
  input.extraRoles = [];
  return input;
};

describe('InviteForEntryRoleOnRoleSetInput', () => {
  describe(`invitedActorIDs @ArrayMaxSize(${ROLE_SET_INVITE_BATCH_MAX})`, () => {
    it(`accepts exactly ${ROLE_SET_INVITE_BATCH_MAX} entries`, async () => {
      const input = validInput();
      input.invitedActorIDs = Array.from(
        { length: ROLE_SET_INVITE_BATCH_MAX },
        (_v, i) => `actor-${i}`
      );

      const errors = await validate(input);

      expect(errors.some(error => error.property === 'invitedActorIDs')).toBe(
        false
      );
    });

    it(`rejects ${ROLE_SET_INVITE_BATCH_MAX + 1} entries`, async () => {
      const input = validInput();
      input.invitedActorIDs = Array.from(
        { length: ROLE_SET_INVITE_BATCH_MAX + 1 },
        (_v, i) => `actor-${i}`
      );

      const errors = await validate(input);

      expect(
        errors.some(
          error =>
            error.property === 'invitedActorIDs' &&
            !!error.constraints?.arrayMaxSize
        )
      ).toBe(true);
    });
  });

  describe(`invitedUserEmails @ArrayMaxSize(${ROLE_SET_INVITE_BATCH_MAX})`, () => {
    const email = (i: number) => `invitee-${i}@example.com`;

    it(`accepts exactly ${ROLE_SET_INVITE_BATCH_MAX} entries`, async () => {
      const input = validInput();
      input.invitedUserEmails = Array.from(
        { length: ROLE_SET_INVITE_BATCH_MAX },
        (_v, i) => email(i)
      );

      const errors = await validate(input);

      expect(errors.some(error => error.property === 'invitedUserEmails')).toBe(
        false
      );
    });

    it(`rejects ${ROLE_SET_INVITE_BATCH_MAX + 1} entries`, async () => {
      const input = validInput();
      input.invitedUserEmails = Array.from(
        { length: ROLE_SET_INVITE_BATCH_MAX + 1 },
        (_v, i) => email(i)
      );

      const errors = await validate(input);

      expect(
        errors.some(
          error =>
            error.property === 'invitedUserEmails' &&
            !!error.constraints?.arrayMaxSize
        )
      ).toBe(true);
    });
  });
});
