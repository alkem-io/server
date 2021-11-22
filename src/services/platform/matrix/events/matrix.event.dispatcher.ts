import { Disposable } from '@interfaces/disposable.interface';
import { EventEmitter } from 'events';
import { MatrixEvent } from 'matrix-js-sdk';
import { first, fromEvent, Observable, Observer, Subscription } from 'rxjs';
import { MatrixRoom } from '../adapter-room/matrix.room';
import { MatrixClient } from '../types/matrix.client.type';
import { MatrixEventHandler } from '../types/matrix.event.handler.type';
export interface IMatrixEventDispatcher {
  syncMonitor?: Observable<{ syncState: string; oldSyncState: string }>;
  roomMonitor?: Observable<{ room: MatrixRoom }>;
  roomTimelineMonitor?: Observable<RoomTimelineEvent>;
  roomMemberMembershipMonitor?: Observable<{ event: any; member: any }>;
  groupMyMembershipMonitor?: Observable<{ group: any }>;
}

export interface IMatrixEventHandler {
  id: string;
  syncMonitor?: Observer<{ syncState: string; oldSyncState: string }>;
  roomMonitor?: Observer<{ room: MatrixRoom }>;
  roomTimelineMonitor?: Observer<RoomTimelineEvent>;
  roomMemberMembershipMonitor?: Observer<{ event: any; member: any }>;
  groupMyMembershipMonitor?: Observer<{ group: any }>;
}

export interface IConditionalMatrixEventHandler {
  id: string;
  roomMemberMembershipMonitor?: {
    observer?: Observer<{ event: any; member: any }>;
    condition: (value: { event: any; member: any }) => boolean;
  };
}

export type RoomTimelineEvent = {
  event: MatrixEvent;
  room: MatrixRoom;
  toStartOfTimeline: boolean;
  removed: boolean;
};

export class MatrixEventDispatcher
  implements Disposable, IMatrixEventDispatcher
{
  private _emmiter = new EventEmitter();
  private _disposables: (() => void)[] = [];
  private _subscriptions: Record<string, Subscription[]> = {};

  syncMonitor!: Observable<{ syncState: string; oldSyncState: string }>;
  roomMonitor!: Observable<{ room: MatrixRoom }>;
  roomTimelineMonitor!: Observable<RoomTimelineEvent>;
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
    this.initMonitor<RoomTimelineEvent>(
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

  private _roomMonitor(event: MatrixEvent) {
    this._emmiter.emit('roomMonitor', { event });
  }

  private _roomTimelineMonitor(
    event: MatrixEvent,
    room: MatrixRoom,
    toStartOfTimeline: boolean,
    removed: boolean
  ) {
    this._emmiter.emit('roomTimelineMonitor', {
      event,
      room,
      toStartOfTimeline,
      removed,
    });
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

  attachOnceConditional(handler: IConditionalMatrixEventHandler) {
    this.detach(handler.id);

    const subscriptions = [];
    if (handler.roomMemberMembershipMonitor) {
      subscriptions.push(
        this.roomMemberMembershipMonitor
          // will only fire once when the condition is met
          .pipe(first(handler.roomMemberMembershipMonitor.condition))
          .subscribe(handler.roomMemberMembershipMonitor.observer)
      );
    }
  }

  detach(id: string) {
    const subscriptions = this._subscriptions[id];
    subscriptions?.forEach(s => s.unsubscribe());

    delete this._subscriptions[id];
  }

  dispose(): void {
    Object.keys(this._subscriptions).forEach(this.detach.bind(this));
    this._disposables.forEach(d => d());
  }
}
