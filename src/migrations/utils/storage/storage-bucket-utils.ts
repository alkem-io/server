import { randomUUID } from "crypto"
import { QueryRunner } from "typeorm"

export const addStorageBucketRelation = async(
  queryRunner: QueryRunner,
  fk: string,
  entityTable: string
): Promise<void> => {
  await queryRunner.query(
    `ALTER TABLE \`${entityTable}\` ADD \`storageBucketId\` char(36) NULL`
  );
  await queryRunner.query(
    `ALTER TABLE \`${entityTable}\` ADD CONSTRAINT \`${fk}\` FOREIGN KEY (\`storageBucketId\`) REFERENCES \`storage_bucket\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
  );
}

export const removeStorageBucketRelation = async(
  queryRunner: QueryRunner,
  fk: string,
  entityTable: string
): Promise<void> => {
  await queryRunner.query(
    `ALTER TABLE ${entityTable} DROP FOREIGN KEY ${fk}`
  );

  await queryRunner.query(
    `ALTER TABLE ${entityTable} DROP COLUMN storageBucketId`
  );
}

export const createStorageBucketAndLink = async(
  queryRunner: QueryRunner,
  entityTable: string,
  entityID: string,
  allowedMimeTypes: string[],
  maxFileSize: number,
  parentStorageBucketID: string
): Promise<string> => {
  const newStorageBucketID = randomUUID();
  const storageBucketAuthID = randomUUID();

  await queryRunner.query(
    `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
      ('${storageBucketAuthID}',
      1, '', '', 0, '')`
  );

  await queryRunner.query(
    `INSERT INTO storage_bucket (id, version, authorizationId, allowedMimeTypes, maxFileSize, parentStorageBucketId)
          VALUES ('${newStorageBucketID}',
                  '1',
                  '${storageBucketAuthID}',
                  '${allowedMimeTypes}',
                  ${maxFileSize},
                  '${parentStorageBucketID}')`
  );

  await queryRunner.query(
    `UPDATE \`${entityTable}\` SET storageBucketId = '${newStorageBucketID}' WHERE (id = '${entityID}')`
  );
  return newStorageBucketID;
}
export const removeStorageBucketAuths = async(
  queryRunner: QueryRunner,
  entityTables: string[]
): Promise<void> => {
  for(const entityTable of entityTables){
    const authorization_policies: { authorizationId: string; }[] = await queryRunner.query(
      `SELECT storage_bucket.authorizationId FROM ${entityTable}
      LEFT JOIN storage_bucket ON ${entityTable}.storageBucketId = storage_bucket.id`
    );
    for (const auth_policy of authorization_policies) {
        await queryRunner.query(
          `DELETE FROM authorization_policy WHERE (id = '${auth_policy.authorizationId}')`
        );
    }
  }
}
export const allowedTypes = [
  'image/png',
  'image/x-png',
  'image/gif',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'image/avif',
  'application/pdf',
];

export const maxAllowedFileSize = 5242880;