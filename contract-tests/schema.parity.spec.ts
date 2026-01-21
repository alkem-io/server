import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema, parse, print, buildSchema } from 'graphql';
import { AppModule } from '../src/app.module';
import { SchemaBootstrapModule } from '../src/schema-bootstrap/module.schema-bootstrap';

function normalizeSDL(sdl: string): string {
  const parsed = parse(sdl, { noLocation: true });
  return print(parsed).trim();
}

function countTypeDefinitions(sdl: string): number {
  const schema = buildSchema(sdl);
  // prettier-ignore
  return Object.keys(schema.getTypeMap())
    .filter(t => !t.startsWith('__'))
    .length;
}

// TODO: This test is skipped in Vitest due to the "Duplicate graphql modules" issue
// when two NestJS apps are instantiated in the same test. This works in Jest but
// requires additional Vitest configuration or workaround.
// See: https://github.com/vitest-dev/vitest/issues/2073
describe.skip('Contract: Schema parity (AppModule vs SchemaBootstrapModule)', () => {
  it('emits identical SDL and lightweight cold start < 2000ms', async () => {
    const startLight = Date.now();
    const lightApp = await NestFactory.createApplicationContext(
      SchemaBootstrapModule,
      { logger: false }
    );
    const lightHost = lightApp.get(GraphQLSchemaHost, { strict: false });
    if (!lightHost?.schema) throw new Error('Light schema missing');
    const lightSDL = normalizeSDL(printSchema(lightHost.schema));
    const lightDuration = Date.now() - startLight;

    const startFull = Date.now();
    const fullApp = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    const fullHost = fullApp.get(GraphQLSchemaHost, { strict: false });
    if (!fullHost?.schema) throw new Error('Full schema missing');
    const fullSDL = normalizeSDL(printSchema(fullHost.schema));
    const fullDuration = Date.now() - startFull;

    if (lightSDL !== fullSDL) {
      // Emit a short diff snippet to aid debugging (first differing segment)
      let idx = 0;
      while (idx < lightSDL.length && idx < fullSDL.length) {
        if (lightSDL[idx] !== fullSDL[idx]) break;
        idx++;
      }
      const contextStart = Math.max(0, idx - 40);
      const contextLight = lightSDL.slice(contextStart, idx + 40);
      const contextFull = fullSDL.slice(contextStart, idx + 40);
      console.error(
        'SDL mismatch context:\n--- Light ---\n' +
          contextLight +
          '\n--- Full ---\n' +
          contextFull
      );
    }

    // Compare
    expect(lightSDL).toBe(fullSDL);
    // Element count parity (defensive)
    expect(countTypeDefinitions(lightSDL)).toBe(countTypeDefinitions(fullSDL));

    // Performance assertion (light cold start)
    expect(lightDuration).toBeLessThanOrEqual(2000);

    // Optional: ensure full duration not absurd (sanity, non-blocking)
    expect(fullDuration).toBeLessThan(10000);

    await lightApp.close();
    await fullApp.close();
  }, 20000);
});
