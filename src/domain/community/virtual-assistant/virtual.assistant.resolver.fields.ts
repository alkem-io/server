import { AuthorizationPrivilege } from '@common/enums';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IProfile } from '@domain/common/profile';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IAssistantCapabilityToggle } from './dto/assistant.capability.toggle.interface';
import { VirtualAssistant } from './virtual.assistant.entity';
import { IVirtualAssistant } from './virtual.assistant.interface';

@Resolver(() => IVirtualAssistant)
export class VirtualAssistantResolverFields {
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The profile for this Virtual Assistant.',
  })
  async profile(
    @Parent() virtualAssistant: VirtualAssistant,
    @Loader(ProfileLoaderCreator, {
      parentClassRef: VirtualAssistant,
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(virtualAssistant.id);
  }

  @ResolveField('capabilityGrant', () => [IAssistantCapabilityToggle], {
    nullable: false,
    description:
      'The admin per-capability grant governing system-invoked authority (default read-only).',
  })
  capabilityGrant(
    @Parent() virtualAssistant: VirtualAssistant
  ): IAssistantCapabilityToggle[] {
    return virtualAssistant.capabilityGrant ?? [];
  }
}
