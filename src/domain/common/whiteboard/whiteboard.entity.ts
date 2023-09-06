import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { IWhiteboard } from './whiteboard.interface';
import { WhiteboardCheckout } from '../whiteboard-checkout/whiteboard.checkout.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { compressText, decompressText } from '@common/utils/compression.util';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';

export const EMPTY_WHITEBOARD_CONTENT =
  '{\n  "type": "excalidraw",\n  "version": 2,\n  "source": "",\n  "elements": [],\n  "appState": {\n    "gridSize": 20,\n    "viewBackgroundColor": "#ffffff"\n  },\n  "files": {}\n}';

@Entity()
export class Whiteboard extends NameableEntity implements IWhiteboard {
  constructor(content?: string) {
    super();
    this.content = content || '';
  }

  @BeforeInsert()
  @BeforeUpdate()
  async compressContent() {
    if (this.content !== '') {
      this.content = await compressText(this.content);
    }
  }
  @AfterInsert()
  @AfterUpdate()
  @AfterLoad()
  async decompressContent() {
    if (this.content !== '') {
      this.content = await decompressText(this.content);
    }
  }

  @Column('longtext', { nullable: false })
  content!: string;

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;

  @ManyToOne(() => Callout, callout => callout.whiteboards, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  callout?: Callout;

  @OneToOne(() => WhiteboardCheckout, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  checkout?: WhiteboardCheckout;
}
