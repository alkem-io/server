import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { SpaceSortMode } from '@common/enums/space.sort.mode';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateSpaceSettingsEntityInput } from './dto/space.settings.dto.update';
import { ISpaceSettings } from './space.settings.interface';

@Injectable()
export class SpaceSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public applyCreationDefaults(settings: ISpaceSettings): ISpaceSettings {
    if (!settings.sortMode) {
      settings.sortMode = SpaceSortMode.ALPHABETICAL;
    }
    if (!settings.layout?.calloutDescriptionDisplayMode) {
      settings.layout = {
        ...settings.layout,
        calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
      };
    }
    return settings;
  }

  public updateSettings(
    settings: ISpaceSettings,
    updateData: UpdateSpaceSettingsEntityInput
  ): ISpaceSettings {
    if (updateData.privacy) {
      if (updateData.privacy.mode) {
        settings.privacy.mode = updateData.privacy.mode;
      }
      if (updateData.privacy.allowPlatformSupportAsAdmin !== undefined) {
        settings.privacy.allowPlatformSupportAsAdmin =
          updateData.privacy.allowPlatformSupportAsAdmin;
      }
    }
    if (updateData.membership) {
      settings.membership = updateData.membership;
    }
    if (updateData.collaboration) {
      // Apply only the fields the caller explicitly set, preserving the rest.
      const collaborationUpdates = updateData.collaboration;
      const allEntries = Object.entries(collaborationUpdates);
      const definedEntries = allEntries.filter(
        ([, value]) => value !== undefined && value !== null
      );
      const definedFields = Object.fromEntries(definedEntries);
      settings.collaboration = {
        ...(settings.collaboration ?? {}),
        ...definedFields,
      };
    }
    if (updateData.sortMode) {
      settings.sortMode = updateData.sortMode;
    }
    if (updateData.layout) {
      const currentLayout = settings.layout ?? {
        calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
      };
      settings.layout = {
        ...currentLayout,
        ...updateData.layout,
      };
    }
    return settings;
  }
}
