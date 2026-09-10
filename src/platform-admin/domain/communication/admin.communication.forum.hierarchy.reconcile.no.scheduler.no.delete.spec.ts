/**
 * The forum/Matrix hierarchy reconcile pass carries two hard prohibitions
 * that the runtime behavior tests in the sibling spec file cannot make
 * durable on their own: it must never be wired to a scheduler (six replicas
 * run with no leader election, so a concurrent converge sweep against the
 * same parents is exactly the failure mode this guards against), and it
 * must never reach a delete-shaped operation (a retired category's Matrix
 * alias is not recoverable — its deterministic id would survive and
 * re-adding the category would silently fork a second room).
 *
 * A mock-absence assertion over one clean happy-path run only proves those
 * two literal method names were not called on that one pass; it says
 * nothing about a scheduler decorator, a different delete-shaped method, or
 * a branch the happy path never exercises. Reading the actual source and
 * asserting the prohibited symbols are absent, the way
 * classification.entry.no.instrumentation.spec.ts already does for its own
 * prohibition, catches all of that — so a later well-meaning PR that wires
 * in a `@Cron`/`@Interval` or a delete call fails this test rather than
 * silently changing the deployed behavior.
 */
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const PROHIBITED_SYMBOLS = [
  /@Cron\b/,
  /@Interval\b/,
  /SchedulerRegistry/,
  /deleteSpace/,
  /deleteRoom/,
  /removeOrphanedRoom/,
];

const SERVICE_FILE = `${__dirname}/admin.communication.forum.hierarchy.reconcile.service.ts`;
const RESOLVER_FILE = `${__dirname}/admin.communication.resolver.mutations.ts`;

describe('no scheduler, no delete path (risk R-5, contract no-scheduler-no-delete)', () => {
  it('the reconcile service source references no prohibited symbol', () => {
    const source = readFileSync(SERVICE_FILE, 'utf-8');
    for (const pattern of PROHIBITED_SYMBOLS) {
      expect(source).not.toMatch(pattern);
    }
  });

  it('the reconcile mutation handler body references no prohibited symbol', () => {
    // The resolver file is shared by every admin communication mutation,
    // including a pre-existing, intentionally delete-capable
    // adminCommunicationRemoveOrphanedRoom — so the file as a whole cannot
    // be scanned wholesale. Isolate just the reconcile mutation's own
    // method body (it is a standalone async class method, closing on a
    // line indented exactly two spaces) and scan that slice instead.
    const source = readFileSync(RESOLVER_FILE, 'utf-8');
    const startMarker = 'async adminCommunicationReconcileForumHierarchy(';
    const startIndex = source.indexOf(startMarker);
    expect(startIndex).toBeGreaterThan(-1);

    const tail = source.slice(startIndex);
    const closingBrace = tail.match(/\n {2}\}\n/);
    expect(closingBrace).not.toBeNull();
    const methodBody = tail.slice(
      0,
      closingBrace!.index! + closingBrace![0].length
    );

    for (const pattern of PROHIBITED_SYMBOLS) {
      expect(methodBody).not.toMatch(pattern);
    }

    // Sanity check so the extracted slice cannot silently start matching
    // nothing: the handler must still dispatch to the reconcile service.
    expect(methodBody).toContain(
      'this.adminCommunicationForumHierarchyReconcileService.reconcile('
    );
  });
});
