import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export const root = realpathSync(
  fileURLToPath(new URL('../../../../', import.meta.url))
);
export const require = createRequire(import.meta.url);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const prerequisite = (value, message) =>
  assert.ok(value, `PREREQUISITE: ${message}`);
export const uuid = value =>
  typeof value === 'string' &&
  /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const project = 'forge-088-mcp-operational-recovery';
const serviceNames = [
  'api',
  'mcp',
  'collaboration',
  'file-service',
  'authorization-evaluation',
  'postgres',
  'rabbitmq',
  'redis',
  'elasticsearch',
  'canary',
];
const files = directory =>
  readdirSync(join(root, directory), { withFileTypes: true }).flatMap(entry => {
    prerequisite(
      !entry.isSymbolicLink(),
      'source/build symlinks are not permitted'
    );
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? files(path) : [path];
  });

export function ownedPath(directory, path) {
  prerequisite(
    typeof path === 'string' && isAbsolute(path),
    'artifact path must be absolute'
  );
  const actual = realpathSync(path);
  prerequisite(
    relative(directory, actual) !== '' &&
      !relative(directory, actual).startsWith('..') &&
      !isAbsolute(relative(directory, actual)),
    'artifact must stay inside its run directory'
  );
  return actual;
}

export function artifact(manifest, descriptor) {
  prerequisite(
    descriptor && /^[a-f\d]{64}$/.test(descriptor.sha256),
    'hashed run-owned artifact required'
  );
  const path = ownedPath(manifest.runDirectory, descriptor.path);
  const bytes = readFileSync(path);
  prerequisite(sha256(bytes) === descriptor.sha256, 'artifact hash mismatch');
  return bytes;
}

export function loopback(value, protocols) {
  prerequisite(typeof value === 'string', 'explicit endpoint required');
  let url;
  try {
    url = new URL(value);
  } catch {
    prerequisite(false, 'invalid endpoint');
  }
  prerequisite(
    protocols.includes(url.protocol) &&
      ['127.0.0.1', '[::1]'].includes(url.hostname) &&
      url.port &&
      !url.username &&
      !url.password &&
      !url.hash,
    'numeric loopback endpoint and explicit port required'
  );
  return url;
}

export function loadManifest(live = true) {
  const path = process.env.RECOVERY088_MANIFEST;
  prerequisite(
    path && isAbsolute(path),
    'RECOVERY088_MANIFEST must name an explicit fresh run manifest'
  );
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  prerequisite(
    manifest.schemaVersion === 1 &&
      manifest.project === project &&
      uuid(manifest.runId),
    'manifest project/schema/run identity mismatch'
  );
  prerequisite(manifest.worktree === root, 'manifest worktree mismatch');
  prerequisite(
    typeof manifest.runDirectory === 'string' &&
      isAbsolute(manifest.runDirectory),
    'run directory required'
  );
  manifest.runDirectory = realpathSync(manifest.runDirectory);
  prerequisite(
    manifest.runDirectory.includes(`/${project}/`) ||
      manifest.runDirectory.startsWith(`${root}/.forge/`),
    'dedicated feature run directory required'
  );
  ownedPath(manifest.runDirectory, resolve(path));
  prerequisite(
    Date.parse(manifest.createdAt) <= Date.now() &&
      Date.parse(manifest.expiresAt) > Date.now() &&
      Date.parse(manifest.expiresAt) - Date.parse(manifest.createdAt) <=
        86400000,
    'manifest must be fresh and expire within one day'
  );
  prerequisite(
    manifest.lockSha256 === sha256(readFileSync(join(root, 'pnpm-lock.yaml'))),
    'lockfile hash mismatch'
  );
  prerequisite(
    manifest.sourceHashes && Object.keys(manifest.sourceHashes).length,
    'source hashes required'
  );
  prerequisite(
    JSON.stringify(Object.keys(manifest.sourceHashes).sort()) ===
      JSON.stringify(
        files('src')
          .filter(path => !/\.(spec|it-spec)\.ts$/.test(path))
          .sort()
      ),
    'complete current product source inventory required'
  );
  for (const [path, digest] of Object.entries(manifest.sourceHashes)) {
    prerequisite(
      !isAbsolute(path) &&
        path.startsWith('src/') &&
        !path.split('/').includes('..'),
      'only product source hash paths allowed'
    );
    prerequisite(
      sha256(readFileSync(join(root, path))) === digest,
      'source hash mismatch'
    );
  }
  if (!live) return manifest;
  prerequisite(
    process.env.RECOVERY088_LIVE_RUN === manifest.runId,
    'live authorization must match this run ID'
  );
  prerequisite(
    (statSync(path).mode & 0o077) === 0,
    'live manifest credentials require owner-only permissions'
  );
  prerequisite(
    manifest.freshStorage === true &&
      manifest.authorization === 'isolated-fixtures-only',
    'fresh isolated storage authorization required'
  );
  prerequisite(
    manifest.services &&
      Object.keys(manifest.services).length === serviceNames.length,
    'exact service inventory required'
  );
  for (const name of serviceNames) {
    const service = manifest.services[name];
    prerequisite(
      service?.project === project &&
        service.runId === manifest.runId &&
        /^[a-f\d]{64}$/.test(service.containerId) &&
        /^sha256:[a-f\d]{64}$/.test(service.imageId),
      `run-owned ${name} identity required`
    );
    const endpoint = loopback(
      service.endpoint,
      name === 'collaboration'
        ? ['ws:']
        : name === 'postgres'
          ? ['postgresql:']
          : name === 'rabbitmq'
            ? ['amqp:']
            : name === 'redis'
              ? ['redis:']
              : ['http:']
    );
    const inspected = JSON.parse(artifact(manifest, service.inspection));
    prerequisite(
      inspected.Id === service.containerId &&
        inspected.Image === service.imageId,
      `${name} inspected identity mismatch`
    );
    prerequisite(
      inspected.Config?.Labels?.['com.docker.compose.project'] === project &&
        inspected.Config.Labels['com.docker.compose.service'] === name,
      `${name} inspected project/service mismatch`
    );
    prerequisite(
      Date.parse(inspected.Created) >= Date.parse(manifest.createdAt),
      `${name} predates this run`
    );
    prerequisite(
      Object.values(inspected.NetworkSettings?.Ports ?? {})
        .flatMap(value => value ?? [])
        .some(
          binding =>
            binding.HostPort === endpoint.port &&
            ['127.0.0.1', '::1'].includes(binding.HostIp)
        ),
      `${name} must use its inspected exclusive loopback publication`
    );
    prerequisite(
      (inspected.Mounts ?? []).every(mount =>
        mount.Type === 'volume'
          ? manifest.volumes?.some(
              volume =>
                volume.name === mount.Name && volume.fresh && !volume.external
            )
          : mount.Type === 'bind' &&
            typeof mount.Source === 'string' &&
            mount.Source.startsWith(`${root}/.forge/`) &&
            !mount.Source.includes('docker.sock')
      ),
      `${name} uses unowned storage/mounts`
    );
  }
  prerequisite(
    manifest.services.api.endpoint !== manifest.services.mcp.endpoint &&
      manifest.services.api.containerId !== manifest.services.mcp.containerId,
    'independent API/MCP required'
  );
  prerequisite(
    new URL(manifest.services.postgres.endpoint).pathname ===
      `/forge088_${manifest.runId.replaceAll('-', '')}`,
    'postgres DSN namespace mismatch'
  );
  prerequisite(
    ['', '/', '/%2F'].includes(new URL(manifest.services.rabbitmq.endpoint).pathname),
    'rabbitmq must use the supported default vhost on its fresh project-owned broker'
  );
  prerequisite(
    new URL(manifest.services.redis.endpoint).pathname === '/0',
    'fresh project-owned Redis must use the supported default database'
  );
  prerequisite(
    manifest.volumes?.length &&
      manifest.volumes.every(
        volume =>
          volume.project === project &&
          volume.runId === manifest.runId &&
          volume.fresh === true &&
          volume.external === false &&
          volume.name.startsWith(`${project}_`)
      ),
    'fresh project-owned nonexternal storage inventory required'
  );
  prerequisite(
    manifest.buildHashes && Object.keys(manifest.buildHashes).length,
    'built tree hashes required'
  );
  prerequisite(
    JSON.stringify(Object.keys(manifest.buildHashes).sort()) ===
      JSON.stringify(files('dist').sort()),
    'complete current built tree inventory required'
  );
  for (const [path, digest] of Object.entries(manifest.buildHashes)) {
    prerequisite(
      path.startsWith('dist/') && !path.split('/').includes('..'),
      'built artifact outside dist'
    );
    prerequisite(
      sha256(readFileSync(join(root, path))) === digest,
      'built artifact hash mismatch'
    );
  }
  const headlessPath = require.resolve('@excalidraw-yjs/excalidraw/headless');
  const pkg = JSON.parse(
    readFileSync(
      join(dirname(dirname(dirname(headlessPath))), 'package.json'),
      'utf8'
    )
  );
  prerequisite(
    manifest.producer?.version === pkg.version &&
      /^sha512-/.test(manifest.producer.integrity ?? '') &&
      manifest.producer.registry === 'https://registry.npmjs.org' &&
      manifest.producer.humanPublished === true,
    'actual human-published registry handoff required'
  );
  const lock = require('yaml').parse(
    readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8')
  );
  prerequisite(
    lock.packages?.[`@excalidraw-yjs/excalidraw@${pkg.version}`]?.resolution
      ?.integrity === manifest.producer.integrity,
    'registry integrity must match the committed lockfile'
  );
  prerequisite(
    sha256(readFileSync(headlessPath)) === manifest.producer.headlessSha256,
    'installed headless hash mismatch'
  );
  prerequisite(
    typeof require('@excalidraw-yjs/excalidraw/headless').prepareSceneImport ===
      'function',
    'installed registry package lacks prepareSceneImport'
  );
  prerequisite(
    manifest.fixtures?.runId === manifest.runId,
    'run-owned domain fixtures required'
  );
  prerequisite(
    manifest.fixtures.boards?.length &&
      manifest.fixtures.boards.every(
        item =>
          uuid(item.id) &&
          [
            'collision',
            'negative',
            'text',
            'faults',
            'cold',
            'legacy',
          ].includes(item.role)
      ),
    'known run-owned board roles required'
  );
  prerequisite(
    Object.keys(manifest.fixtures.actors ?? {}).every(name =>
      ['author', 'secondAuthor', 'reader', 'denied', 'authorAlias', 'resource3', 'resource4', 'resource5'].includes(
        name
      )
    ),
    'unknown actor fixture'
  );
  return manifest;
}

export async function mcp(manifest, actorName = 'author', serviceName = 'mcp') {
  prerequisite(['api', 'mcp'].includes(serviceName), 'unknown MCP listener');
  const actor = manifest.fixtures.actors?.[actorName];
  prerequisite(
    uuid(actor?.id) &&
      typeof actor.apiKey === 'string' &&
      actor.apiKey.length > 20,
    `fresh ${actorName} credential required`
  );
  const endpoint = new URL(
    '/rest/mcp',
    manifest.services[serviceName].endpoint
  );
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: {
      headers: { Authorization: `Bearer ${actor.apiKey}` },
      redirect: 'error',
    },
  });
  const client = new Client({ name: 'recovery-harness', version: '1.0.0' });
  try {
    await client.connect(transport);
  } catch {
    await transport.close();
    throw new Error(
      'MCP initialization failed (credential/transport details redacted)'
    );
  }
  try {
    const tools = await client.listTools();
    prerequisite(
      tools.tools.some(tool => tool.name === 'import_whiteboard_scene'),
      'real initialized tools/list must expose scene import'
    );
  } catch (error) {
    await client.close();
    throw error;
  }
  return client;
}

export async function call(client, name, args) {
  let result;
  try {
    result = await client.callTool({ name, arguments: args }, undefined, {
      timeout: 65000,
    });
  } catch {
    throw new Error(
      'MCP tools/call failed (request and credential details redacted)'
    );
  }
  const text = result.content
    ?.filter(item => item.type === 'text')
    .map(item => item.text)
    .join('\n');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }
  return { error: result.isError === true, data };
}

export function native(manifest) {
  const sessionPath =
    'dist/services/collaboration-client/collaboration-document.session.js';
  const aliasesPath = 'dist/config/aliases.js';
  for (const path of [sessionPath, aliasesPath])
    prerequisite(manifest.buildHashes[path], `required build hash: ${path}`);
  require(join(root, aliasesPath));
  return {
    ...require(join(root, sessionPath)),
    fork: require('@excalidraw-yjs/excalidraw/headless'),
    Y: require('yjs'),
  };
}

export async function room(manifest, board, actorName = 'author') {
  prerequisite(
    uuid(board) && manifest.fixtures.boards?.some(item => item.id === board),
    'unknown board fixture'
  );
  prerequisite(
    uuid(manifest.fixtures.actors?.[actorName]?.id),
    'unknown actor fixture'
  );
  const { CollaborationDocumentSession } = native(manifest);
  prerequisite(
    /^[a-z\d-]+$/i.test(manifest.actorHeader ?? ''),
    'configured collaboration actor header required'
  );
  const session = new CollaborationDocumentSession(
    `${manifest.services.collaboration.endpoint}/collab/${board}?type=whiteboard`,
    { [manifest.actorHeader]: manifest.fixtures.actors[actorName].id },
    board
  );
  try {
    await session.connect(10000);
    return session;
  } catch {
    session.close();
    throw new Error('Real collaboration admission failed');
  }
}

export async function readRoom(manifest, board, actorName) {
  const session = await room(manifest, board, actorName);
  try {
    const { fork } = native(manifest);
    const path =
      'dist/services/mcp-server/collaboration/whiteboard-scene.reader.js';
    prerequisite(
      manifest.buildHashes[path],
      'actual production scene reader build hash required'
    );
    const { readWhiteboardScene } = require(join(root, path));
    const scene = readWhiteboardScene(session.doc, fork);
    scene.elements.sort((a, b) =>
      a.index < b.index ? -1 : a.index > b.index ? 1 : 0
    );
    return {
      ...scene,
      appState: session.doc.getMap(fork.APPSTATE).toJSON(),
      state: Buffer.from(
        require('yjs').encodeStateAsUpdate(session.doc)
      ).toString('base64'),
    };
  } finally {
    session.close();
  }
}

export function board(manifest, role) {
  const matches = manifest.fixtures.boards?.filter(item => item.role === role);
  prerequisite(
    matches?.length === 1 && uuid(matches[0].id),
    `one run-owned ${role} board required`
  );
  return matches[0].id;
}
