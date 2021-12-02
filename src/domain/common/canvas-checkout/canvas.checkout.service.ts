import { Injectable } from '@nestjs/common';
import { CanvasCheckout } from './canvas.checkout.entity';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ICanvasCheckout } from './canvas.checkout.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CanvasCheckoutStateEnum } from '@common/enums/canvas.checkout.status';
import { CanvasCheckoutLifecycleConfig } from './canvas.checkout.lifecycle.config';

@Injectable()
export class CanvasCheckoutService {
  constructor(
    @InjectRepository(CanvasCheckout)
    private CanvasCheckoutRepository: Repository<CanvasCheckout>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private lifecycleService: LifecycleService
  ) {}

  async createCanvasCheckout(): Promise<ICanvasCheckout> {
    const canvasCheckout: ICanvasCheckout = new CanvasCheckout();
    canvasCheckout.status = CanvasCheckoutStateEnum.AVAILABLE;
    canvasCheckout.authorization = new AuthorizationPolicy();

    // save the user to get the id assigned
    await this.CanvasCheckoutRepository.save(canvasCheckout);

    // Create the lifecycle
    canvasCheckout.lifecycle = await this.lifecycleService.createLifecycle(
      canvasCheckout.id,
      CanvasCheckoutLifecycleConfig
    );

    return canvasCheckout;
  }

  async delete(CanvasCheckoutID: string): Promise<ICanvasCheckout> {
    const CanvasCheckout = await this.getCanvasCheckoutOrFail(CanvasCheckoutID);

    if (CanvasCheckout.authorization)
      await this.authorizationPolicyService.delete(
        CanvasCheckout.authorization
      );

    const result = await this.CanvasCheckoutRepository.remove(
      CanvasCheckout as CanvasCheckout
    );
    result.id = CanvasCheckoutID;
    return result;
  }

  async save(CanvasCheckout: ICanvasCheckout): Promise<ICanvasCheckout> {
    return await this.CanvasCheckoutRepository.save(CanvasCheckout);
  }
  async getCanvasCheckoutOrFail(
    CanvasCheckoutID: string,
    options?: FindOneOptions<CanvasCheckout>
  ): Promise<ICanvasCheckout> {
    const CanvasCheckout = await this.CanvasCheckoutRepository.findOne(
      { id: CanvasCheckoutID },
      options
    );
    if (!CanvasCheckout)
      throw new EntityNotFoundException(
        `Unable to find CanvasCheckout with ID: ${CanvasCheckoutID}`,
        LogContext.COMMUNITY
      );
    return CanvasCheckout;
  }
}
