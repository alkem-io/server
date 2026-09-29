import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { NotificationEvent } from '@common/enums/notification.event';
import { ActorContext } from '@core/actor-context/actor.context';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICalloutFormResponse } from '../callout-form-response/callout.form.response.interface';
import { CalloutFormResponseService } from '../callout-form-response/callout.form.response.service';
import { DeleteCalloutFormResponseInput } from '../callout-form-response/dto/callout.form.response.dto.delete';
import { SubmitCalloutFormResponseInput } from '../callout-form-response/dto/callout.form.response.dto.submit';
import { ICalloutForm } from './callout.form.interface';
import { CALLOUT_FORM_OWNER_RELATIONS } from './callout.form.owner.relations';
import { FormResponseAccessService } from './callout.form.response.access.service';
import { CalloutFormService } from './callout.form.service';
import { UpdateCalloutFormInput } from './dto/callout.form.dto.update';

@InstrumentResolver()
@Resolver()
export class CalloutFormResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private formResponseAccess: FormResponseAccessService,
    private calloutFormService: CalloutFormService,
    private calloutFormResponseService: CalloutFormResponseService,
    private notificationAdapterSpace: NotificationSpaceAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICalloutForm, {
    description:
      'Update the definition and/or the settings of a Form. Requires the privilege to create callouts on the collection the Post is in (space admin), the same as creating a Form. Serialized against submissions.',
  })
  async updateCalloutForm(
    @CurrentActor() actorContext: ActorContext,
    @Args('formData') formData: UpdateCalloutFormInput
  ): Promise<ICalloutForm> {
    const callout = await this.calloutFormService.getCalloutForFormOrFail(
      formData.formID,
      CALLOUT_FORM_OWNER_RELATIONS
    );
    this.formResponseAccess.assertCanModerate(actorContext, callout);

    return this.calloutFormService.updateCalloutForm(formData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICalloutFormResponse, {
    description:
      'Submit a response to a Form. Requires CONTRIBUTE on the Post. The Post must be published and the Form open; a single-response Form accepts one response per member. acknowledgedVisibility is the audience the respondent was shown.',
  })
  async submitCalloutFormResponse(
    @CurrentActor() actorContext: ActorContext,
    @Args('responseData') responseData: SubmitCalloutFormResponseInput
  ): Promise<ICalloutFormResponse> {
    const callout = await this.calloutFormService.getCalloutForFormOrFail(
      responseData.formID,
      CALLOUT_FORM_OWNER_RELATIONS
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `respond to Form on callout: ${callout.id}`
    );

    const { response, visibility } =
      await this.calloutFormResponseService.submitResponse(
        actorContext.actorID,
        callout.settings.visibility,
        responseData
      );

    // Fire-and-forget, after the response is committed: a notification
    // failure never fails the submission. The log carries ids only — never
    // an answer.
    this.notificationAdapterSpace
      .spaceCollaborationCalloutFormResponseSubmitted({
        triggeredBy: actorContext.actorID,
        callout,
        formID: responseData.formID,
        response: { id: response.id, createdDate: response.createdDate },
        visibility,
      })
      .catch((err: unknown) => {
        this.logger.error?.(
          {
            message: 'Failed to dispatch form-response notifications',
            calloutID: callout.id,
            formID: responseData.formID,
            responseID: response.id,
            event:
              NotificationEvent.SPACE_ADMIN_COLLABORATION_CALLOUT_FORM_RESPONSE,
          },
          (err as Error)?.stack,
          LogContext.NOTIFICATIONS
        );
      });

    return response;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICalloutFormResponse, {
    description:
      'Delete a Form response. The member who submitted it can always withdraw it (also on a closed Form); otherwise the privilege to create callouts on the collection the Post is in (space admin) is required.',
  })
  async deleteCalloutFormResponse(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteCalloutFormResponseInput
  ): Promise<ICalloutFormResponse> {
    const response = await this.calloutFormResponseService.getResponseOrFail(
      deleteData.responseID
    );

    const isOwner =
      !!response.createdBy &&
      !!actorContext.actorID &&
      response.createdBy === actorContext.actorID;
    if (!isOwner) {
      const callout = await this.calloutFormService.getCalloutForFormOrFail(
        response.formId,
        CALLOUT_FORM_OWNER_RELATIONS
      );
      this.formResponseAccess.assertCanModerate(actorContext, callout);
    }

    return this.calloutFormResponseService.deleteResponse(
      deleteData.responseID
    );
  }
}
