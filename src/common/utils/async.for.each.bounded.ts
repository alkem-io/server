/**
 * Run `worker` over every item with at most `limit` invocations in flight.
 * Items are picked up in order as workers free up; a rejected worker rejects
 * the whole run once the other in-flight workers have settled.
 */
export const asyncForEachBounded = async <T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> => {
  if (items.length === 0) return;
  const width = Math.max(1, Math.min(Math.floor(limit), items.length));
  let next = 0;
  const runners = Array.from({ length: width }, async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
};
