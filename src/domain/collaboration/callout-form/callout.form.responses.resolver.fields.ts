import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ICalloutFormResponse } from '../callout-form-response/callout.form.response.interface';
import { CalloutFormResponseService } from '../callout-form-response/callout.form.response.service';
import { ICalloutFormResponses } from '../callout-form-response/dto/callout.form.responses.view';
import { PaginatedCalloutFormResponses } from '../callout-form-response/dto/paginated.callout.form.responses';

/**
 * Field resolvers of the viewer-scoped responses view. The scope was resolved
 * once, by FormResponseAccess, when the lookup created the view; everything
 * here only applies it.
 */
@Resolver(() => ICalloutFormResponses)
export class CalloutFormResponsesResolverFields {
  constructor(private calloutFormResponseService: CalloutFormResponseService) {}

  @ResolveField('canReadAll', () => Boolean, {
    nullable: false,
    description: 'Whether the viewer can read every response of the Form.',
  })
  canReadAll(@Parent() view: ICalloutFormResponses): boolean {
    return view.scope === 'ALL';
  }

  @ResolveField('canModerate', () => Boolean, {
    nullable: false,
    description:
      'Whether the viewer can moderate the Form: edit its definition and delete any response.',
  })
  canModerate(@Parent() view: ICalloutFormResponses): boolean {
    return view.canModerate;
  }

  @ResolveField('mine', () => [ICalloutFormResponse], {
    nullable: false,
    description: "The viewer's own responses.",
  })
  mine(@Parent() view: ICalloutFormResponses): Promise<ICalloutFormResponse[]> {
    return this.calloutFormResponseService.findMine(view.formID, view.actorID);
  }

  @ResolveField('all', () => PaginatedCalloutFormResponses, {
    nullable: false,
    description:
      'The responses the viewer may read: every response when canReadAll, otherwise only their own.',
  })
  async all(
    @Parent() view: ICalloutFormResponses
  ): Promise<PaginatedCalloutFormResponses> {
    return this.calloutFormResponseService.paginate(
      view.formID,
      view.scope,
      view.actorID,
      view.first,
      view.after
    );
  }
}
