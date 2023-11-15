import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { UpdateVisualInput } from '@domain/common/visual/dto/visual.dto.update';
import { CreateVisualInput } from '@domain/common/visual/dto/visual.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { getImageDimensions } from '@common/utils';
import { Visual } from './visual.entity';
import { IVisual } from './visual.interface';
import { DeleteVisualInput } from './dto/visual.dto.delete';
import { avatarMinImageSize, avatarMaxImageSize } from './avatar.constants';

@Injectable()
export class VisualService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Visual)
    private visualRepository: Repository<Visual>
  ) {}

  async createVisual(
    visualInput: CreateVisualInput,
    initialUri?: string
  ): Promise<IVisual> {
    const visual: IVisual = Visual.create({
      ...visualInput,
      uri: initialUri ?? '',
    });
    visual.authorization = new AuthorizationPolicy();
    if (initialUri) visual.uri = initialUri;
    await this.visualRepository.save(visual);
    return visual;
  }

  async updateVisual(visualData: UpdateVisualInput): Promise<IVisual> {
    const visual = await this.getVisualOrFail(visualData.visualID);
    visual.uri = visualData.uri;
    if (visualData.alternativeText !== undefined) {
      visual.alternativeText = visualData.alternativeText;
    }

    return await this.visualRepository.save(visual);
  }

  async deleteVisual(deleteData: DeleteVisualInput): Promise<IVisual> {
    const visualID = deleteData.ID;
    const visual = await this.getVisualOrFail(visualID);

    if (visual.authorization)
      await this.authorizationPolicyService.delete(visual.authorization);

    const { id } = visual;
    const result = await this.visualRepository.remove(visual as Visual);
    return {
      ...result,
      id,
    };
  }

  async getVisualOrFail(
    visualID: string,
    options?: FindOneOptions<Visual>
  ): Promise<IVisual> {
    const visual = await this.visualRepository.findOne({
      where: { id: visualID },
      ...options,
    });
    if (!visual)
      throw new EntityNotFoundException(
        `Not able to locate visual with the specified ID: ${visualID}`,
        LogContext.CHALLENGES
      );
    return visual;
  }

  async saveVisual(visual: IVisual): Promise<IVisual> {
    return await this.visualRepository.save(visual);
  }

  public async getImageDimensions(buffer: Buffer) {
    return getImageDimensions(buffer);
  }

  public validateMimeType(visual: IVisual, mimeType: string) {
    if (!visual.allowedTypes.includes(mimeType)) {
      throw new ValidationException(
        `Image upload type (${mimeType}) not in allowed mime types: ${visual.allowedTypes}`,
        LogContext.COMMUNITY
      );
    }
  }

  public validateImageWidth(visual: IVisual, imageWidth: number) {
    if (imageWidth < visual.minWidth || imageWidth > visual.maxWidth)
      throw new ValidationException(
        `Upload image has a width resolution of '${imageWidth}' which is not in the allowed range of ${visual.minWidth} - ${visual.maxWidth} pixels!`,
        LogContext.COMMUNITY
      );
  }

  public validateImageHeight(visual: IVisual, imageHeight: number) {
    if (imageHeight < visual.minHeight || imageHeight > visual.maxHeight)
      throw new ValidationException(
        `Upload image has a height resolution of '${imageHeight}' which is not in the allowed range of ${visual.minHeight} - ${visual.maxHeight} pixels!`,
        LogContext.COMMUNITY
      );
  }

  async createVisualBanner(uri?: string): Promise<IVisual> {
    return await this.createVisual(
      {
        name: 'banner',
        minWidth: 384,
        maxWidth: 1536,
        minHeight: 64,
        maxHeight: 256,
        aspectRatio: 6,
      },
      uri
    );
  }

  async createVisualCard(uri?: string): Promise<IVisual> {
    return await this.createVisual(
      {
        name: 'card',
        minWidth: 307,
        maxWidth: 410,
        minHeight: 192,
        maxHeight: 256,
        aspectRatio: 1.6,
      },
      uri
    );
  }

  async createVisualBannerWide(uri?: string): Promise<IVisual> {
    return await this.createVisual(
      {
        name: 'bannerWide',
        minWidth: 640,
        maxWidth: 2560,
        minHeight: 64,
        maxHeight: 256,
        aspectRatio: 10,
      },
      uri
    );
  }

  async createVisualAvatar(): Promise<IVisual> {
    return await this.createVisual({
      name: 'avatar',
      minWidth: avatarMinImageSize,
      maxWidth: avatarMaxImageSize,
      minHeight: avatarMinImageSize,
      maxHeight: avatarMaxImageSize,
      aspectRatio: 1,
    });
  }
}
