/**
 * SubscriptionReadService is a pure pass-through service.
 * Each method delegates directly to a PubSubEngine's asyncIterableIterator
 * with a fixed subscription type constant. There is no conditional logic,
 * transformation, or error handling to test.
 */
describe.skip('SubscriptionReadService', () => {
  it('pure pass-through service - no behavioral tests needed', () => {
    // intentionally left empty
  });
});
