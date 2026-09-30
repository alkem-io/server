import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { describe, expect, it, vi } from 'vitest';

// Quality-gate reproduction: exercise the actual policy composition and
// evaluator. Only persistence/config/logging are substitutes.
describe('conversation attachment membership revocation', () => {
  it('does not restore a departed uploader through the generic document creator rule', async () => {
    const authorization = new AuthorizationService({} as any);
    const policies = new AuthorizationPolicyService(
      { save: vi.fn(async value => value) } as any,
      authorization,
      {} as any,
      { get: () => 500 } as any
    );
    const documents = new DocumentAuthorizationService(policies);
    const buckets = new StorageBucketAuthorizationService(policies, documents);
    const parent = new AuthorizationPolicy(AuthorizationPolicyType.UNKNOWN);
    parent.credentialRules.push(
      policies.createCredentialRule(
        [AuthorizationPrivilege.READ, AuthorizationPrivilege.CONTRIBUTE],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: 'alice',
          },
        ],
        'Current conversation members'
      )
    );
    const document = {
      id: 'attachment',
      createdBy: 'bob',
      authorization: new AuthorizationPolicy(AuthorizationPolicyType.DOCUMENT),
      tagset: null,
    };
    const bucket = {
      id: 'conversation-bucket',
      authorization: new AuthorizationPolicy(AuthorizationPolicyType.UNKNOWN),
      documents: [document],
      // Real conversation context: the cascade derives the CONVERSATION case
      // from the bucket's own aggregator.
      storageAggregator: { type: StorageAggregatorType.CONVERSATION },
    };

    await buckets.applyAuthorizationPolicy(bucket as any, parent);

    const credentials = [
      { type: AuthorizationCredential.USER_SELF_MANAGEMENT, resourceID: 'bob' },
    ];
    expect(
      authorization.getGrantedPrivileges(credentials, bucket.authorization)
    ).not.toContain(AuthorizationPrivilege.READ);
    const documentPrivileges = authorization.getGrantedPrivileges(
      credentials,
      document.authorization
    );
    expect(documentPrivileges).not.toContain(AuthorizationPrivilege.READ);
    // The generic creator rule granted READ/UPDATE/DELETE together; all three
    // must go, not only the one the bucket assertion happens to name.
    expect(documentPrivileges).not.toContain(AuthorizationPrivilege.UPDATE);
    expect(documentPrivileges).not.toContain(AuthorizationPrivilege.DELETE);

    // The same creator retains the platform's normal rights in a USER bucket.
    bucket.storageAggregator.type = StorageAggregatorType.USER;
    await buckets.applyAuthorizationPolicy(bucket as any, parent);
    const ordinaryPrivileges = authorization.getGrantedPrivileges(
      credentials,
      document.authorization
    );
    expect(ordinaryPrivileges).toContain(AuthorizationPrivilege.READ);
    expect(ordinaryPrivileges).toContain(AuthorizationPrivilege.UPDATE);
    expect(ordinaryPrivileges).toContain(AuthorizationPrivilege.DELETE);
  });
});
