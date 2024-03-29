import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICalloutGroup } from './callout.group.interface';

@Injectable()
export class CalloutGroupsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public getGroups(groupsStr: string): ICalloutGroup[] {
    const groups: ICalloutGroup[] = this.deserializeGroups(groupsStr);
    return groups;
  }

  public getGroupNames(groupsStr: string): string[] {
    const groups = this.getGroups(groupsStr);
    return groups.map(group => group.displayName);
  }

  public serializeGroups(groups: ICalloutGroup[]): string {
    return JSON.stringify(groups);
  }

  private deserializeGroups(groupsStr: string): ICalloutGroup[] {
    return JSON.parse(groupsStr);
  }
}
