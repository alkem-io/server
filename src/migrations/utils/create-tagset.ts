import { QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { createAuthPolicy } from './create-authorization-policy';

type TagsetOptions = {
  tags?: string[];
  name?: RestrictedTagsetNames;
  profileId?: string;
};

enum RestrictedTagsetNames {
  DEFAULT = 'default',
  SKILLS = 'skills',
  CAPABILITIES = 'capabilities',
  KEYWORDS = 'keywords',
}

export const createTagset = async (
  queryRunner: QueryRunner,
  options?: TagsetOptions
) => {
  const { name, tags = [], profileId } = options ?? {};

  const id = randomUUID();
  const authId = await createAuthPolicy(queryRunner);
  await queryRunner.query(`
    INSERT INTO tagset (id, version, name, tags, authorizationId, profileId) VALUES
    ('${id}',
     1,
     ${name === undefined ? 'DEFAULT' : `'${name}'`},
     '${tags.join(',')}',
     '${authId}',
     ${profileId === undefined ? 'NULL' : `'${profileId}'`}
  )`);

  return id;
};
