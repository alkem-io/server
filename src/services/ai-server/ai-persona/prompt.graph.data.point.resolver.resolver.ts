import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { PromptGraphDataPoint } from './dto/prompt.graph.dto';

@Resolver(() => PromptGraphDataPoint)
export class PromptGraphDataPointResolver {
  @ResolveField('type', () => String, { nullable: true })
  type(@Parent() property: PromptGraphDataPoint): string | null {
    if (Array.isArray(property.type)) {
      return property.type.length > 0 ? property.type[0] : null;
    }
    return property.type ?? null;
  }

  @ResolveField('optional', () => Boolean, { nullable: false })
  optional(@Parent() property: PromptGraphDataPoint): boolean {
    return Array.isArray(property.type);
  }
}
