import { ActorRolePolicy } from './actor.role.policy';

describe('ActorRolePolicy', () => {
  it('should initialize with default values of -1', () => {
    const policy = new ActorRolePolicy();

    expect(policy.minimum).toBe(-1);
    expect(policy.maximum).toBe(-1);
  });

  it('should allow setting minimum and maximum', () => {
    const policy = new ActorRolePolicy();
    policy.minimum = 0;
    policy.maximum = 100;

    expect(policy.minimum).toBe(0);
    expect(policy.maximum).toBe(100);
  });
});
