import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';

const FIXTURE_PATH = join(
  __dirname,
  '..',
  'data',
  'identity',
  'kratos.identity.sample.json'
);

export type KratosIdentityFixtureKey = 'existingUser' | 'newUser';

export type KratosIdentityFixtureSet = Record<
  KratosIdentityFixtureKey,
  OryDefaultIdentitySchema
>;

let cachedFixtures: KratosIdentityFixtureSet | undefined;

const loadFixturesFromDisk = (): KratosIdentityFixtureSet => {
  if (!cachedFixtures) {
    const raw = readFileSync(FIXTURE_PATH, 'utf8');
    cachedFixtures = JSON.parse(raw) as KratosIdentityFixtureSet;
  }
  return cachedFixtures;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const loadKratosIdentityFixtures = (): KratosIdentityFixtureSet =>
  clone(loadFixturesFromDisk());

export const getKratosIdentityFixture = (
  key: KratosIdentityFixtureKey
): OryDefaultIdentitySchema => clone(loadFixturesFromDisk()[key]);
