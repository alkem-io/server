import { parseNormalizationPlan } from './normalization.command';
import {
  coverageIsComplete,
  inspectNormalizationGroup,
} from './normalization.inventory';
import type {
  NormalizationFile,
  NormalizationPlan,
  NormalizationPort,
  NormalizationResult,
} from './normalization.types';

/** Explicit tuple approvals authorize creation; retained events alone do not. */
export async function applyNormalization(
  port: NormalizationPort,
  input: NormalizationPlan
): Promise<NormalizationResult> {
  const plan = parseNormalizationPlan(input);
  const result: NormalizationResult = {
    schemaVersion: 1,
    ok: true,
    counts: {
      scanned: plan.groups.length,
      eligible: 0,
      copied: 0,
      moved: 0,
      reused: 0,
      redundantStageRemoved: 0,
      reconciled: 0,
      skipped: 0,
      failed: 0,
    },
    records: [],
  };
  const supported = [...(await port.supportedRooms())].sort();
  const complete =
    coverageIsComplete(plan.events, plan.coverage, supported) &&
    JSON.stringify(supported) ===
      JSON.stringify([...plan.supportedRoomIds].sort());
  for (const reviewed of plan.groups) {
    const confirmed = new Map<string, string>(); // IDs are mutation-local, never the messaging key or report contract.
    const excluded = new Set(
      reviewed.targets
        .filter(t => t.state !== 'complete' && !t.approved)
        .map(t => t.bucketId)
    );
    const evidence = () => ({
      eventIds: [...new Set(reviewed.events.map(event => event.eventId))],
      associations: reviewed.targets.map(t => ({
        bucketId: t.bucketId,
        outcome: confirmed.has(t.bucketId)
          ? ('complete' as const)
          : excluded.has(t.bucketId)
            ? ('excluded' as const)
            : ('unavailable' as const),
      })),
    });
    if (!reviewed.eligible) {
      result.counts.skipped++;
      result.records.push({
        mediaId: reviewed.mediaId,
        outcome: 'skipped',
        reason: reviewed.reason,
        ...evidence(),
      });
      continue;
    }
    result.counts.eligible++;
    try {
      const inspect = async () => {
        const live = await inspectNormalizationGroup(
          port,
          reviewed.events,
          complete
        );
        if (!live.eligible)
          throw new Error(live.reason ?? 'reviewed_state_changed');
        if (
          JSON.stringify(live.targets.map(t => t.bucketId)) !==
          JSON.stringify(reviewed.targets.map(t => t.bucketId))
        )
          throw new Error('reviewed_state_changed');
        for (const target of reviewed.targets) {
          const current = await port.association(
            target.bucketId,
            reviewed.mediaId
          );
          if (
            (target.state === 'complete' || confirmed.has(target.bucketId)) &&
            (!current?.complete ||
              (confirmed.has(target.bucketId) &&
                confirmed.get(target.bucketId) !== current.id))
          )
            throw new Error('reviewed_state_changed');
        }
        return live;
      };
      let live = await inspect();
      for (const target of live.targets) {
        if (target.state === 'complete') {
          const current = await port.association(
            target.bucketId,
            reviewed.mediaId
          );
          if (!current?.complete) throw new Error('reviewed_state_changed');
          confirmed.set(target.bucketId, current.id);
          excluded.delete(target.bucketId);
          result.counts.reused++;
        }
      }
      const approved = reviewed.targets.filter(
        t => t.approved && !confirmed.has(t.bucketId)
      );
      // Validate every requested change before the first write. An incomplete
      // row needs a separate supported metadata repair, never delete/recreate.
      for (const target of approved) {
        const current = live.targets.find(t => t.bucketId === target.bucketId)!;
        if (current.reason) throw new Error(current.reason);
      }
      for (const target of approved) {
        live = await inspect();
        const current = live.targets.find(t => t.bucketId === target.bucketId)!;
        if (current.state === 'complete') {
          const row = await port.association(target.bucketId, reviewed.mediaId);
          if (!row?.complete) throw new Error('reviewed_state_changed');
          confirmed.set(target.bucketId, row.id);
          result.counts.reused++;
          continue;
        }
        if (current.reason) throw new Error(current.reason);
        const stage = await port.stage(reviewed.mediaId);
        const source = stage ?? (await port.referenceSource(reviewed.mediaId));
        if (!source || source.reference !== reviewed.mediaId)
          throw new Error('missing_source');
        if (!(await port.permitted(target.bucketId, source.id)))
          throw new Error('bucket_policy_denied');
        const moving = !!stage && target === approved.at(-1);
        let placed: NormalizationFile | undefined;
        let reconciled = false;
        try {
          placed = moving
            ? await port.move(target.bucketId, source, current.event)
            : await port.copy(target.bucketId, source, current.event);
        } catch {
          // A committed mutation can lose its response. Inspect once; do not
          // replay writes or discard possibly attached authorization records.
          reconciled = true;
          placed = await port.association(target.bucketId, reviewed.mediaId);
        }
        if (
          !placed?.complete ||
          placed.bucketId !== target.bucketId ||
          placed.reference !== reviewed.mediaId
        )
          throw new Error('placement_failed');
        confirmed.set(target.bucketId, placed.id);
        if (reconciled) result.counts.reconciled++;
        else if (placed.reused) result.counts.reused++;
        else if (moving && placed.id === source.id) result.counts.moved++;
        else result.counts.copied++;
      }
      await inspect();
      // Only references with at least one established association may lose P.
      // Excluded destinations remain absent; the message is not restoration permission.
      const stage = await port.stage(reviewed.mediaId);
      if (stage && confirmed.size > 0) {
        await port.removeStage(stage.id);
        result.counts.redundantStageRemoved++;
      }
      if (excluded.size) result.counts.skipped += excluded.size;
      result.records.push({
        mediaId: reviewed.mediaId,
        outcome: excluded.size ? 'skipped' : 'completed',
        ...(excluded.size ? { reason: 'unapproved_targets' } : {}),
        ...evidence(),
      });
    } catch (error) {
      result.ok = false;
      result.counts.failed++;
      const reasons = new Set([
        'incomplete_coverage',
        'unmapped_room',
        'reviewed_state_changed',
        'incomplete_association',
        'missing_source',
        'bucket_policy_denied',
        'unmapped_sender',
        'placement_failed',
      ]);
      const reason =
        error instanceof Error && reasons.has(error.message)
          ? error.message
          : 'operation_failed';
      result.records.push({
        mediaId: reviewed.mediaId,
        outcome: 'failed',
        reason,
        ...evidence(),
      });
    }
  }
  return result;
}
