import { AuthorizationService } from '@core/authorization/authorization.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { TemplateService } from '@domain/template/template/template.service';
import { createMock } from '@golevelup/ts-vitest';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { LookupByNameResolverFields } from './lookup.by.name.resolver.fields';

const mockAuth = { id: 'auth-1' };
const mockEntity = (id = 'entity-1') => ({
  id,
  authorization: mockAuth,
});
const actorContext = { actorID: 'user-1' } as any;

describe('LookupByNameResolverFields', () => {
  let resolver: LookupByNameResolverFields;

  beforeEach(() => {
    const platformAuthService =
      createMock<PlatformAuthorizationPolicyService>();
    platformAuthService.getPlatformAuthorizationPolicy.mockResolvedValue(
      mockAuth as any
    );
    const authService = createMock<AuthorizationService>();
    const innovationHubService = createMock<InnovationHubService>();
    innovationHubService.getInnovationHubByNameIdOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const innovationPackService = createMock<InnovationPackService>();
    innovationPackService.getInnovationPackByNameIdOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const templateService = createMock<TemplateService>();
    templateService.getTemplateByNameIDInTemplatesSetOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const userLookupService = createMock<UserLookupService>();
    userLookupService.getUserByNameIdOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const spaceLookupService = createMock<SpaceLookupService>();
    spaceLookupService.getSpaceByNameIdOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const orgLookupService = createMock<OrganizationLookupService>();
    orgLookupService.getOrganizationByNameIdOrFail.mockResolvedValue(
      mockEntity() as any
    );
    const vcLookupService = createMock<VirtualActorLookupService>();
    vcLookupService.getVirtualContributorByNameIdOrFail.mockResolvedValue(
      mockEntity() as any
    );

    resolver = new LookupByNameResolverFields(
      platformAuthService,
      authService,
      innovationHubService,
      innovationPackService,
      templateService,
      userLookupService,
      spaceLookupService,
      orgLookupService,
      vcLookupService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should resolve innovationHub', async () => {
    const result = await resolver.innovationHub(actorContext, 'test-hub');
    expect(result).toBe('entity-1');
  });

  it('should resolve innovationPack', async () => {
    const result = await resolver.innovationPack(actorContext, 'test-pack');
    expect(result).toBe('entity-1');
  });

  it('should resolve space', async () => {
    const result = await resolver.space(actorContext, 'test-space');
    expect(result).toBeDefined();
  });

  it('should resolve user', async () => {
    const result = await resolver.user(actorContext, 'test-user');
    expect(result).toBe('entity-1');
  });

  it('should resolve organization', async () => {
    const result = await resolver.organization('test-org');
    expect(result).toBe('entity-1');
  });

  it('should resolve virtualContributor', async () => {
    const result = await resolver.virtualContributor(actorContext, 'test-vc');
    expect(result).toBe('entity-1');
  });

  it('should resolve template', async () => {
    const result = await resolver.template(
      actorContext,
      'set-id',
      'template-name'
    );
    expect(result).toBe('entity-1');
  });
});
