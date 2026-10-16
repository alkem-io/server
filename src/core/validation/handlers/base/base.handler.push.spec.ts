import { ValidationException } from '@common/exceptions';
import { RegisterDevicePushTokenInput } from '@domain/device-push-token/dto/device.push.token.dto.register.input';
import { UnregisterDevicePushTokenInput } from '@domain/device-push-token/dto/device.push.token.dto.unregister.input';
import { plainToInstance } from 'class-transformer';
import { describe, expect, it } from 'vitest';
import { BaseHandler } from './base.handler';

// SC-003. This handler's allowlist is OPT-IN: an input absent from `types[]`
// has NO validation at all, so every decorator on the two new inputs would be
// dead code. These specs prove the wiring, not just its presence — a metatype
// missing from the allowlist would make every one of them pass with
// rejects.toThrow() never firing, since `validate()` is never even called.
// This is the only layer where that is provable: the resolver unit spec calls
// the mutation directly and never runs Nest's validation pipe.
describe('BaseHandler — the device push token DTOs are validated at the pipe (SC-003)', () => {
  const handler = new BaseHandler();

  it('rejects an empty token on RegisterDevicePushTokenInput', async () => {
    const value = plainToInstance(RegisterDevicePushTokenInput, {
      token: '',
      platform: 'ios',
    });

    await expect(
      handler.handle(value, RegisterDevicePushTokenInput)
    ).rejects.toThrow(ValidationException);
  });

  it("rejects a platform of 'web' — only the two native platforms are bindable", async () => {
    const value = plainToInstance(RegisterDevicePushTokenInput, {
      token: 'tok-1',
      platform: 'web',
    });

    await expect(
      handler.handle(value, RegisterDevicePushTokenInput)
    ).rejects.toThrow(ValidationException);
  });

  it('accepts a valid ios registration, so the rejections are not an everything-fails artefact', async () => {
    const value = plainToInstance(RegisterDevicePushTokenInput, {
      token: 'tok-1',
      platform: 'ios',
    });

    await expect(
      handler.handle(value, RegisterDevicePushTokenInput)
    ).resolves.toBeNull();
  });

  it('rejects an empty token on UnregisterDevicePushTokenInput', async () => {
    const value = plainToInstance(UnregisterDevicePushTokenInput, {
      token: '',
    });

    await expect(
      handler.handle(value, UnregisterDevicePushTokenInput)
    ).rejects.toThrow(ValidationException);
  });
});
