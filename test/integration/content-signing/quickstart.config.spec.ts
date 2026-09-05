import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const root = process.cwd();

const readYaml = (path: string) =>
  parse(readFileSync(resolve(root, path), 'utf8')) as Record<string, any>;

describe('content-signing local quickstart', () => {
  const compose = readYaml('quickstart-services.yml');
  const traefik = readYaml('.build/traefik/http.yml');
  const config = readYaml('alkemio.yml');

  it('pins the released gateway and mock with loopback-only host access', () => {
    const gateway = compose.services['trust-gateway'];
    const mock = compose.services['cleverbase-refmock'];

    expect(gateway.image).toBe(
      'alkemio/trust-gateway@sha256:8dd4c44ed575fb7b3efabc9516f0df6f29ae4462ca859aa7978b05752759694b'
    );
    expect(gateway.ports).toEqual(['127.0.0.1:8080:8080']);
    expect(mock.image).toBe(
      'ghcr.io/alkem-io/cleverbase-refmock@sha256:271f70ee82e8114c0fc03f45788512d5d8f54a9a4fb3c3d7b33057781233fee2'
    );
    expect(mock.ports).toEqual(['127.0.0.1:9000:9000']);
    expect(config.trustGateway.url).toBe(
      '${TRUST_GATEWAY_URL}:http://localhost:8080'
    );
  });

  it('reuses the outbound-capable quickstart network', () => {
    const gateway = compose.services['trust-gateway'];

    expect(compose.networks.alkemio_dev_net ?? {}).not.toHaveProperty(
      'internal',
      true
    );
    expect(compose.services.traefik.networks).toContain('alkemio_dev_net');
    expect(gateway.networks).toEqual(['alkemio_dev_net']);
    expect(compose.services['cleverbase-refmock'].networks).toEqual([
      'alkemio_dev_net',
    ]);
  });

  it('uses the credential-free B-T fixture contract without an API key', () => {
    const environment: string[] = compose.services['trust-gateway'].environment;

    expect(environment).toEqual(
      expect.arrayContaining([
        'TRUST_GATEWAY_MODE=fixtures',
        'TRUST_GATEWAY_ENV=acceptance',
        'TRUST_GATEWAY_CSC_API=v1_rsa',
        'TRUST_GATEWAY_REDIRECT_URI=http://localhost:3000/oauth/cleverbase/callback',
        'TRUST_GATEWAY_RETURN_URL=http://localhost:3000/api/public/rest/content-signing/complete',
        'TRUST_GATEWAY_AUTH_DISABLED=true',
        'TRUST_GATEWAY_DEFAULT_CONFORMANCE=B-B',
        'TRUST_GATEWAY_BASE_URL=http://cleverbase-refmock:9000',
        'TRUST_GATEWAY_PUBLIC_BASE_URL=http://localhost:9000',
        'TRUST_GATEWAY_TSA_URL=http://cleverbase-refmock:9000/tsr',
      ])
    );
    expect(environment.some(value => value.includes('API_KEY'))).toBe(false);
  });

  it('publishes only the exact GET callback through Traefik', () => {
    const service = traefik.http.services['trust-gateway'];
    const callback = traefik.http.routers['trust-gateway-callback'];

    expect(service.loadBalancer.servers).toEqual([
      { url: 'http://trust-gateway:8080/' },
    ]);
    expect(callback).toEqual({
      rule: 'Method(`GET`) && Path(`/oauth/cleverbase/callback`)',
      service: 'trust-gateway',
      entryPoints: ['web'],
      priority: 200,
    });
    expect(
      Object.values(traefik.http.routers).filter(
        (router: any) => router.service === 'trust-gateway'
      )
    ).toEqual([callback]);
    const publicRules = Object.values(traefik.http.routers)
      .map((router: any) => router.rule)
      .join(' ');
    expect(publicRules).not.toContain('/v1/sign');
    expect(publicRules).not.toContain('/v1/verify');
  });
});
