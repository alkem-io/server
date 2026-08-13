import { SMALL_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { McpApiKeyScope } from './mcp.types';

/**
 * Operations an MCP API key may perform (workspace#038). TS values are the
 * lowercase forms so they match what `mcp-scope.ts`'s `scopeViolation` (and
 * the stored `McpApiKeyScope.operations`) compares against without
 * translation — see contracts/graphql-schema.md.
 */
export enum McpApiKeyOperation {
  READ = 'read',
  TOOLS = 'tools',
}

registerEnumType(McpApiKeyOperation, {
  name: 'McpApiKeyOperation',
  description: 'Operations an MCP API key may perform.',
});

/**
 * Lifecycle status of an MCP API key (presentation-only, derived — data-model.md
 * §Derived status). REVOKED takes precedence over EXPIRED (FR-032).
 */
export enum McpApiKeyStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

registerEnumType(McpApiKeyStatus, {
  name: 'McpApiKeyStatus',
  description:
    'Lifecycle status of an MCP API key. REVOKED takes precedence over EXPIRED.',
});

/**
 * Metadata for one MCP API key — the ALLOWLIST. Deliberately has no `keyHash`
 * field: every GraphQL projection of an `McpApiKey` row must be built from
 * this shape, never a passthrough of the entity (FR-008).
 */
@ObjectType('McpApiKey', {
  description:
    'Metadata for one MCP API key. The key value itself is never exposed here.',
})
export class IMcpApiKey {
  @Field(() => UUID, { nullable: false })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description: 'User-supplied label. Not unique.',
  })
  name!: string;

  @Field(() => [McpApiKeyOperation], {
    nullable: false,
    description: 'Granted operations, flattened from the stored scope.',
  })
  operations!: McpApiKeyOperation[];

  @Field(() => Date, { nullable: false })
  createdDate!: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'Optional expiry chosen at mint.',
  })
  expiresAt?: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'When this key last authenticated a request.',
  })
  lastUsedAt?: Date;

  @Field(() => String, {
    nullable: true,
    description: 'Source address of the last request this key authenticated.',
  })
  lastUsedFromIp?: string;

  @Field(() => McpApiKeyStatus, { nullable: false })
  status!: McpApiKeyStatus;
}

/**
 * Result of minting a key. The ONLY type that ever carries the plaintext
 * (FR-002) — returned exactly once, never re-queryable.
 */
@ObjectType('McpApiKeyMintResult', {
  description:
    'Result of minting a key. The only place the plaintext is ever returned.',
})
export class McpApiKeyMintResult {
  @Field(() => String, {
    nullable: false,
    description:
      'The plaintext key. Returned EXACTLY ONCE — it is not stored and cannot be re-derived.',
  })
  apiKey!: string;

  @Field(() => IMcpApiKey, {
    nullable: false,
    description: 'Metadata for the key just created.',
  })
  key!: IMcpApiKey;
}

@InputType()
export class MintMcpApiKeyInput {
  @Field(() => String, {
    nullable: false,
    description: 'Label for the key. 1..128 characters after trimming.',
  })
  // Trim BEFORE validating: the description promises "1..128 characters after
  // trimming", and without this a whitespace-only name passes `@IsNotEmpty()`
  // and mints a key with a blank label — defeating the identify-then-revoke
  // workflow the label exists for.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => [McpApiKeyOperation], {
    nullable: false,
    description:
      'At least one operation. Duplicates are removed; order is not significant.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(McpApiKeyOperation, { each: true })
  operations!: McpApiKeyOperation[];

  @Field(() => Date, {
    nullable: true,
    description: 'Optional expiry. MUST be in the future when supplied.',
  })
  @IsOptional()
  @IsDate()
  expiresAt?: Date;
}

@InputType()
export class RevokeMcpApiKeyInput {
  @Field(() => UUID, { nullable: false })
  @IsUUID()
  keyID!: string;
}

@InputType()
export class AdminRevokeMcpApiKeyInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'Owner of the key. Required — it scopes the revoke and the audit subject.',
  })
  @IsUUID()
  userID!: string;

  @Field(() => UUID, { nullable: false })
  @IsUUID()
  keyID!: string;
}

/**
 * The exact set of `McpApiKey` entity columns this projection reads. Deliberately
 * excludes `keyHash`, `userId`, `actorId`, `description` — nothing beyond this
 * shape may be accepted, so a caller cannot accidentally pass a full entity
 * (with `keyHash`) through and have it silently work.
 */
export interface McpApiKeyProjectionSource {
  id: string;
  name: string;
  scopes: McpApiKeyScope[];
  createdDate: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  lastUsedFromIp?: string;
  isActive: boolean;
}

/**
 * Projects an allowlisted `McpApiKey` row shape to the GraphQL `IMcpApiKey`
 * (workspace#038, FR-008/FR-032). Derives `status` with REVOKED > EXPIRED >
 * ACTIVE precedence and flattens `scopes[].operations` into a single
 * de-duplicated list. Accepts ONLY {@link McpApiKeyProjectionSource} — never a
 * raw entity — so `keyHash` cannot leak through this helper even if a caller
 * passes a full row by mistake (there is no `keyHash` field to read).
 */
export function toGraphqlMcpApiKey(row: McpApiKeyProjectionSource): IMcpApiKey {
  const status = deriveStatus(row.isActive, row.expiresAt);
  // Filter, don't cast. Rows predating this feature were written by the
  // bootstrap path or by hand and may carry operations outside the published
  // enum (or omit `operations` entirely). `me.mcpApiKeys` is `[McpApiKey!]!`,
  // so one unrepresentable value fails the WHOLE field — the user would lose
  // sight of every key, including the good ones, on the only surface that can
  // revoke them. Unknown values degrade to an empty operation list: the key
  // stays listable and stays revocable.
  const operations = Array.from(
    new Set(
      row.scopes
        .flatMap(scope => scope.operations ?? [])
        .filter((op): op is McpApiKeyOperation =>
          Object.values(McpApiKeyOperation).includes(op as McpApiKeyOperation)
        )
    )
  );

  const result = new IMcpApiKey();
  result.id = row.id;
  result.name = row.name;
  result.operations = operations;
  result.createdDate = row.createdDate;
  result.expiresAt = row.expiresAt;
  result.lastUsedAt = row.lastUsedAt;
  result.lastUsedFromIp = row.lastUsedFromIp;
  result.status = status;
  return result;
}

function deriveStatus(
  isActive: boolean,
  expiresAt: Date | undefined
): McpApiKeyStatus {
  if (!isActive) {
    return McpApiKeyStatus.REVOKED;
  }
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return McpApiKeyStatus.EXPIRED;
  }
  return McpApiKeyStatus.ACTIVE;
}
