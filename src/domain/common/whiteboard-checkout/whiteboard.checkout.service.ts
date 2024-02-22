import { Injectable } from '@nestjs/common';
import { WhiteboardCheckout } from './whiteboard.checkout.entity';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { IWhiteboardCheckout } from './whiteboard.checkout.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  EntityNotFoundException,
  InvalidStateTransitionException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { WhiteboardCheckoutStateEnum } from '@common/enums/whiteboard.checkout.status';
import { WhiteboardCheckoutLifecycleConfig } from './whiteboard.checkout.lifecycle.config';
import { CreateWhiteboardCheckoutInput } from './dto/whiteboard.checkout.dto.create';
import { EntityCheckoutStatusException } from '@common/exceptions/entity.not.checkedout.exception';
import { AgentInfo } from '@core/authentication.agent.info/agent-info';

@Injectable()
export class WhiteboardCheckoutService {
  constructor(
    @InjectRepository(WhiteboardCheckout)
    private whiteboardCheckoutRepository: Repository<WhiteboardCheckout>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private lifecycleService: LifecycleService
  ) {}

  async createWhiteboardCheckout(
    checkoutData: CreateWhiteboardCheckoutInput
  ): Promise<IWhiteboardCheckout> {
    const whiteboardCheckout: IWhiteboardCheckout = WhiteboardCheckout.create({
      ...checkoutData,
    });
    whiteboardCheckout.authorization = new AuthorizationPolicy();

    // save the user to get the id assigned
    await this.whiteboardCheckoutRepository.save(whiteboardCheckout);

    // Create the lifecycle
    whiteboardCheckout.lifecycle = await this.lifecycleService.createLifecycle(
      whiteboardCheckout.id,
      WhiteboardCheckoutLifecycleConfig
    );
    whiteboardCheckout.lifecycle =
      await this.lifecycleService.initializationEvent(
        whiteboardCheckout.lifecycle
      );

    return this.save(whiteboardCheckout);
  }

  async delete(WhiteboardCheckoutID: string): Promise<IWhiteboardCheckout> {
    const whiteboardCheckout = await this.getWhiteboardCheckoutOrFail(
      WhiteboardCheckoutID
    );

    if (whiteboardCheckout.authorization)
      await this.authorizationPolicyService.delete(
        whiteboardCheckout.authorization
      );

    if (whiteboardCheckout.lifecycle)
      await this.lifecycleService.deleteLifecycle(
        whiteboardCheckout.lifecycle.id
      );

    const result = await this.whiteboardCheckoutRepository.remove(
      whiteboardCheckout as WhiteboardCheckout
    );
    result.id = WhiteboardCheckoutID;
    return result;
  }

  async save(
    whiteboardCheckout: IWhiteboardCheckout
  ): Promise<IWhiteboardCheckout> {
    return await this.whiteboardCheckoutRepository.save(whiteboardCheckout);
  }

  async getWhiteboardCheckoutOrFail(
    whiteboardCheckoutID: string,
    options?: FindOneOptions<WhiteboardCheckout>
  ): Promise<WhiteboardCheckout | never> {
    const whiteboardCheckout = await this.whiteboardCheckoutRepository.findOne({
      where: { id: whiteboardCheckoutID },
      ...options,
    });
    if (!whiteboardCheckout)
      throw new EntityNotFoundException(
        `Unable to find WhiteboardCheckout with ID: ${whiteboardCheckoutID}`,
        LogContext.COMMUNITY
      );
    return whiteboardCheckout;
  }

  isUpdateAllowedOrFail(
    checkout: IWhiteboardCheckout,
    agentInfo: AgentInfo
  ): void {
    const status = this.getWhiteboardStatus(checkout);
    if (status !== WhiteboardCheckoutStateEnum.CHECKED_OUT) {
      throw new EntityCheckoutStatusException(
        `Unable to update entity that is not checkedout: ${status}`,
        LogContext.CONTEXT
      );
    }
    if (checkout.lockedBy !== agentInfo.userID) {
      throw new EntityCheckoutStatusException(
        `Entity is checked out by ${checkout.lockedBy}, which does not match the current user: ${agentInfo.userID}`,
        LogContext.CONTEXT
      );
    }
  }

  getWhiteboardStatus(
    whiteboardCheckout: IWhiteboardCheckout
  ): WhiteboardCheckoutStateEnum {
    const lifecycle = whiteboardCheckout.lifecycle;
    if (!lifecycle) {
      throw new EntityNotFoundException(
        `Unable to find lifecycle WhiteboardCheckout with ID: ${whiteboardCheckout.id}`,
        LogContext.COMMUNITY
      );
    }
    const state = this.lifecycleService.getState(lifecycle);
    if (state === WhiteboardCheckoutStateEnum.AVAILABLE) {
      return WhiteboardCheckoutStateEnum.AVAILABLE;
    } else if (state === WhiteboardCheckoutStateEnum.CHECKED_OUT) {
      return WhiteboardCheckoutStateEnum.CHECKED_OUT;
    } else {
      throw new InvalidStateTransitionException(
        `Unable to find lifecycle WhiteboardCheckout with expected state: ${whiteboardCheckout.id}`,
        LogContext.CONTEXT
      );
    }
  }
}
