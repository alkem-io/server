import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { PromptGrapDataStruct } from './dto/prompt.graph.dto';
import { PromptGraphDataPoint } from './dto/prompt.graph.dto';

@Resolver(() => PromptGrapDataStruct)
export class PromptGrapDataStructResolver {
  @ResolveField(() => [PromptGraphDataPoint], { nullable: true })
  properties(
    @Parent() dataStruct: PromptGrapDataStruct
  ): PromptGraphDataPoint[] | undefined {
    // @ts-ignore-next-line
    return Object.entries(dataStruct.properties).map(
      //@ts-ignore-next-line
      ([key, value]) => ({ name: key, ...value })
    );
  }
}
