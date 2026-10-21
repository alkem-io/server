import { loadWhiteboardFork } from '../whiteboard.fork';
import { whiteboardSceneToYjsV2State } from './whiteboard.scene.to.yjs.v2.state';
import { whiteboardSnapshotToSearchText } from './whiteboard.snapshot.to.search.text';

const LIMIT = 1_000_000;

const textElement = (
  id: string,
  originalText: string,
  index: string,
  extra: Record<string, unknown> = {}
) => ({
  id,
  type: 'text',
  text: originalText,
  originalText,
  x: 0,
  y: 0,
  index,
  ...extra,
});

const snapshotOf = (elements: Record<string, unknown>[]) =>
  whiteboardSceneToYjsV2State(
    JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements,
      appState: {},
      files: {},
    })
  );

describe('whiteboardSnapshotToSearchText', () => {
  it('joins the text of every text element with a space', async () => {
    const fork = await loadWhiteboardFork();
    const snapshot = await snapshotOf([
      textElement('t1', 'quasar055', 'a0'),
      textElement('t2', 'second note', 'a1'),
    ]);

    const text = whiteboardSnapshotToSearchText(fork, snapshot, LIMIT);

    expect(text.split(' ').sort()).toEqual(
      ['quasar055', 'second', 'note'].sort()
    );
    expect(text).toContain('quasar055');
    expect(text).toContain('second note');
  });

  it('uses the unwrapped originalText, not the soft-wrapped text', async () => {
    const fork = await loadWhiteboardFork();
    const snapshot = await snapshotOf([
      textElement('t1', 'quasar055 nebula', 'a0', {
        text: 'quasar055\nnebula',
      }),
    ]);

    expect(whiteboardSnapshotToSearchText(fork, snapshot, LIMIT)).toBe(
      'quasar055 nebula'
    );
  });

  it('includes text bound inside a container', async () => {
    const fork = await loadWhiteboardFork();
    const snapshot = await snapshotOf([
      {
        id: 'box',
        type: 'rectangle',
        boundElements: [{ id: 'label', type: 'text' }],
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        index: 'a0',
      },
      textElement('label', 'boxed label', 'a1', { containerId: 'box' }),
    ]);

    expect(whiteboardSnapshotToSearchText(fork, snapshot, LIMIT)).toBe(
      'boxed label'
    );
  });

  it('excludes deleted text elements', async () => {
    const fork = await loadWhiteboardFork();
    const snapshot = await snapshotOf([
      textElement('live', 'visible', 'a0'),
      textElement('gone', 'erased', 'a1', {
        isDeleted: true,
        updated: Date.now(),
      }),
    ]);
    // the tombstone is still in the snapshot, so the filter is what drops it
    expect(
      fork
        .decodeSnapshot(snapshot)
        .elements.some(element => element.isDeleted === true)
    ).toBe(true);

    expect(whiteboardSnapshotToSearchText(fork, snapshot, LIMIT)).toBe(
      'visible'
    );
  });

  it('ignores non-text elements', async () => {
    const fork = await loadWhiteboardFork();
    const snapshot = await snapshotOf([
      {
        id: 'shape',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        index: 'a0',
      },
    ]);

    expect(whiteboardSnapshotToSearchText(fork, snapshot, LIMIT)).toBe('');
  });

  it('returns an empty string for an empty scene', async () => {
    const fork = await loadWhiteboardFork();
    const snapshot = await whiteboardSceneToYjsV2State('');

    expect(whiteboardSnapshotToSearchText(fork, snapshot, LIMIT)).toBe('');
  });

  it('truncates the text to the given maximum length', async () => {
    const fork = await loadWhiteboardFork();
    const snapshot = await snapshotOf([textElement('t1', 'abcdefghij', 'a0')]);

    expect(whiteboardSnapshotToSearchText(fork, snapshot, 4)).toBe('abcd');
  });

  it('throws on bytes that are not a Yjs snapshot', async () => {
    const fork = await loadWhiteboardFork();

    expect(() =>
      whiteboardSnapshotToSearchText(
        fork,
        new Uint8Array([0xff, 0xfe, 0x01, 0x02, 0x03]),
        LIMIT
      )
    ).toThrow();
  });
});
