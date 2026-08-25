import { ClassificationValue } from '@domain/common/classification-value/classification.value.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IClassificationEntry } from './classification.entry.interface';

@Resolver(() => IClassificationEntry)
export class ClassificationEntryResolverFields {
  // Renamed at the GraphQL layer: the stored/service-facing property is
  // `valueSet` (data-model.md §1); the contract's field name is `values`
  // (so `about.classifications[].values[]` holds exactly).
  @ResolveField('values', () => [ClassificationValue], {
    nullable: false,
    description: 'The snapshot vocabulary, in authored order. Never re-sorted.',
  })
  values(@Parent() entry: IClassificationEntry): ClassificationValue[] {
    return entry.valueSet;
  }

  // Maps selectedValueIDs against values, preserving AUTHORED order — the
  // field the deferred compact display will consume without fetching the
  // vocabulary separately (research D-5).
  @ResolveField('selectedValues', () => [ClassificationValue], {
    nullable: false,
    description:
      'The selected values resolved against `values`, in authored order.',
  })
  selectedValues(@Parent() entry: IClassificationEntry): ClassificationValue[] {
    const selected = new Set(entry.selectedValueIDs);
    return entry.valueSet.filter(value => selected.has(value.id));
  }
}
