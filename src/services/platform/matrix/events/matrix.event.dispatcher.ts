import { Disposable } from '@interfaces/disposable.interface';
import { EventEmitter } from 'events';
import { fromEvent, Observable, Observer, Subscription } from 'rxjs';
import { MatrixClient } from '../types/matrix.client.type';
import { MatrixEventHandler } from '../types/matrix.event.handler.type';
export interface IMatrixEventDispatcher {
  syncMonitor?: Observable<{ syncState: string; oldSyncState: string }>;
  roomMonitor?: Observable<any>;
  roomTimelineMonitor?: Observable<any>;
  roomMemberMembershipMonitor?: Observable<{ event: any; member: any }>;
  groupMyMembershipMonitor?: Observable<{ group: any }>;
}

export interface IMatrixEventHandler {
  id: string;
  syncMonitor?: Observer<{ syncState: string; oldSyncState: string }>;
  roomMonitor?: Observer<any>;
  roomTimelineMonitor?: Observer<any>;
  roomMemberMembershipMonitor?: Observer<{ event: any; member: any }>;
  groupMyMembershipMonitor?: Observer<{ group: any }>;
}

export class MatrixEventDispatcher
  implements Disposable, IMatrixEventDispatcher {
  private _emmiter = new EventEmitter();
  private _disposables: (() => void)[] = [];
  private _subscriptions: Record<string, Subscription[]> = {};

  syncMonitor!: Observable<{ syncState: string; oldSyncState: string }>;
  roomMonitor!: Observable<any>;
  roomTimelineMonitor!: Observable<any>;
  roomMemberMembershipMonitor!: Observable<{ event: any; member: any }>;
  groupMyMembershipMonitor!: Observable<{ group: any }>;

  constructor(private _client: MatrixClient) {
    this.init();
  }

  private init() {
    this.initMonitor<{ syncState: string; oldSyncState: string }>(
      'sync',
      'syncMonitor',
      this._syncMonitor
    );
    this.initMonitor<any>('Room', 'roomMonitor', this._roomMonitor);
    this.initMonitor<any>(
      'Room.timeline',
      'roomTimelineMonitor',
      this._roomTimelineMonitor
    );
    this.initMonitor<{ event: any; member: any }>(
      'RoomMember.membership',
      'roomMemberMembershipMonitor',
      this._roomMemberMembershipMonitor
    );
    this.initMonitor<{ group: any }>(
      'Group.myMembership',
      'groupMyMembershipMonitor',
      this._groupMyMembershipMonitor
    );
  }

  private initMonitor<T>(
    event: string,
    handler: keyof IMatrixEventDispatcher,
    monitor: MatrixEventHandler
  ) {
    monitor = monitor.bind(this);
    this._client.on(event, monitor);

    this[handler] = fromEvent<T>(this._emmiter, handler) as any;
    this._disposables.push(() => this._client.off(event, monitor));
  }

  private _syncMonitor(syncState: string, oldSyncState: string) {
    this._emmiter.emit('syncMonitor', { syncState, oldSyncState });
  }

  private _roomMonitor(event: any) {
    this._emmiter.emit('roomMonitor', event);
  }

  private _roomTimelineMonitor(event: any) {
    this._emmiter.emit('roomTimelineMonitor', event);
  }

  private _roomMemberMembershipMonitor(event: any, member: any) {
    this._emmiter.emit('roomMemberMembershipMonitor', { event, member });
  }

  private _groupMyMembershipMonitor(group: any) {
    this._emmiter.emit('groupMyMembershipMonitor', { group });
  }

  attach(handler: IMatrixEventHandler) {
    this.detach(handler.id);

    const subscriptions = [];
    if (handler.syncMonitor) {
      subscriptions.push(this.syncMonitor.subscribe(handler.syncMonitor));
    }
    if (handler.roomMonitor) {
      subscriptions.push(this.roomMonitor.subscribe(handler.roomMonitor));
    }
    if (handler.roomTimelineMonitor) {
      subscriptions.push(
        this.roomTimelineMonitor.subscribe(handler.roomTimelineMonitor)
      );
    }
    if (handler.roomMemberMembershipMonitor) {
      subscriptions.push(
        this.roomMemberMembershipMonitor.subscribe(
          handler.roomMemberMembershipMonitor
        )
      );
    }
    if (handler.groupMyMembershipMonitor) {
      subscriptions.push(
        this.groupMyMembershipMonitor.subscribe(
          handler.groupMyMembershipMonitor
        )
      );
    }

    this._subscriptions[handler.id] = subscriptions;
  }

  detach(id: string) {
    const subscriptions = this._subscriptions[id];
    subscriptions?.forEach(s => s.unsubscribe());

    delete this._subscriptions[id];
  }

  dispose(): void {
    Object.keys(this._subscriptions).forEach(this.detach);
    this._disposables.forEach(d => d());
  }
}
