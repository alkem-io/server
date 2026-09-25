/**
 * Run `worker` over every item with at most `limit` invocations in flight.
 * Items are picked up in order as workers free up. After a worker rejects, no
 * new item is picked up; the run rejects with the first failure once the
 * workers already in flight have settled.
 */
export const asyncForEachBounded = async <T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> => {
  if (items.length === 0) return;
  const width = Math.max(1, Math.min(Math.floor(limit), items.length));
  let next = 0;
  let failed = false;
  const runners = Array.from({ length: width }, async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        await worker(items[index], index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  });
  const settled = await Promise.allSettled(runners);
  const rejection = settled.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );
  if (rejection) throw rejection.reason;
};
