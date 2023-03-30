import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneOptions,
  FindOptionsRelationByString,
  Repository,
} from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Canvas } from './canvas.entity';
import { ICanvas } from './canvas.interface';
import { CreateCanvasInput } from './dto/canvas.dto.create';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { CanvasCheckoutService } from '../canvas-checkout/canvas.checkout.service';
import { UpdateCanvasInput } from './dto/canvas.dto.update';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { AgentInfo } from '@core/authentication';
import { IProfile } from '../profile/profile.interface';
import { ProfileService } from '../profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { IVisual } from '../visual';

@Injectable()
export class CanvasService {
  constructor(
    @InjectRepository(Canvas)
    private canvasRepository: Repository<Canvas>,
    private canvasCheckoutService: CanvasCheckoutService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService
  ) {}

  async createCanvas(
    canvasData: CreateCanvasInput,
    userID: string
  ): Promise<ICanvas> {
    const canvas: ICanvas = Canvas.create({ ...canvasData });
    canvas.authorization = new AuthorizationPolicy();
    canvas.createdBy = userID;

    canvas.profile = await this.profileService.createProfile(
      canvasData.profileData
    );
    await this.profileService.addVisualOnProfile(
      canvas.profile,
      VisualType.CARD
    );

    // get the id assigned
    const savedCanvas = await this.save(canvas);

    canvas.checkout = await this.canvasCheckoutService.createCanvasCheckout({
      canvasID: savedCanvas.id,
    });

    return await this.save(canvas);
  }

  async getCanvasOrFail(
    canvasID: string,
    options?: FindOneOptions<Canvas>
  ): Promise<ICanvas | never> {
    const canvas = await this.canvasRepository.findOne({
      where: {
        id: canvasID,
      },
      ...options,
    });
    if (!canvas)
      throw new EntityNotFoundException(
        `Not able to locate Canvas with the specified ID: ${canvasID}`,
        LogContext.CHALLENGES
      );
    return canvas;
  }

  async deleteCanvas(canvasID: string): Promise<ICanvas> {
    const canvas = await this.getCanvasOrFail(canvasID, {
      relations: ['checkout', 'profile'],
    });

    if (canvas.checkout) {
      await this.canvasCheckoutService.delete(canvas.checkout.id);
    }

    if (canvas.profile) {
      await this.profileService.deleteProfile(canvas.profile.id);
    }

    if (canvas.authorization) {
      await this.authorizationPolicyService.delete(canvas.authorization);
    }

    const deletedCanvas = await this.canvasRepository.remove(canvas as Canvas);
    deletedCanvas.id = canvasID;
    return deletedCanvas;
  }

  async updateCanvas(
    canvasInput: ICanvas,
    updateCanvasData: UpdateCanvasInput,
    agentInfo: AgentInfo
  ): Promise<ICanvas> {
    const canvas = await this.getCanvasOrFail(canvasInput.id, {
      relations: ['checkout', 'profile'],
    });
    if (!canvas.checkout) {
      throw new EntityNotFoundException(
        `Canvas not initialised: ${canvas.id}`,
        LogContext.COLLABORATION
      );
    }

    // Before updating the canvas contents check the user doing it has it checked out
    if (updateCanvasData.value && updateCanvasData.value !== canvas.value) {
      await this.canvasCheckoutService.isUpdateAllowedOrFail(
        canvas.checkout,
        agentInfo
      );
    }
    if (updateCanvasData.value) canvas.value = updateCanvasData.value;
    if (updateCanvasData.profileData) {
      canvas.profile = await this.profileService.updateProfile(
        canvas.profile,
        updateCanvasData.profileData
      );
    }
    return await this.save(canvas);
  }

  async save(canvas: ICanvas): Promise<ICanvas> {
    return await this.canvasRepository.save(canvas);
  }

  public async getProfile(
    canvas: ICanvas,
    relations: FindOptionsRelationByString = []
  ): Promise<IProfile> {
    const canvasLoaded = await this.getCanvasOrFail(canvas.id, {
      relations: ['profile', ...relations],
    });
    if (!canvasLoaded.profile)
      throw new EntityNotFoundException(
        `Canvas profile not initialised: ${canvas.id}`,
        LogContext.COLLABORATION
      );

    return canvasLoaded.profile;
  }

  public async getVisualPreview(canvas: ICanvas): Promise<IVisual> {
    const profile = await this.getProfile(canvas);
    const preview = await this.profileService.getVisual(
      profile,
      VisualType.CARD
    );
    if (!preview)
      throw new EntityNotFoundException(
        `Canvas preview visual not initialised: ${canvas.id}`,
        LogContext.COLLABORATION
      );

    return preview;
  }

  async getCanvasCheckout(canvas: ICanvas): Promise<ICanvasCheckout> {
    const canvasWithCheckout = await this.getCanvasOrFail(canvas.id, {
      relations: ['checkout'],
    });

    // Note: this is done the same as with organizationVerification, i.e. that
    // we create the entity wrapping a lifecycle if it is not present.
    // This is due to lifecycles being difficult to deal with via migraitons.
    // Needs further discussion.
    if (!canvasWithCheckout.checkout) {
      // create and add the checkout
      canvas.checkout = await this.canvasCheckoutService.createCanvasCheckout({
        canvasID: canvas.id,
      });

      await this.save(canvas);
    }

    if (!canvasWithCheckout.checkout)
      throw new EntityNotFoundException(
        `Canvas not initialised, no checkout: ${canvas.id}`,
        LogContext.CONTEXT
      );

    return canvasWithCheckout.checkout;
  }

  async getCanvasesInCalloutCount(calloutId: string): Promise<number> {
    return await this.canvasRepository.countBy({ callout: { id: calloutId } });
  }
}
