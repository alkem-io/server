import {
  AfterLoad,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { ICanvas } from './canvas.interface';
import { Visual } from '@domain/common/visual/visual.entity';
import { CanvasCheckout } from '../canvas-checkout/canvas.checkout.entity';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { deflateSync, inflateSync } from 'zlib';
import { Buffer } from 'buffer';
import { promisify } from 'util';

@Entity()
export class Canvas extends NameableEntity implements ICanvas {
  constructor(name?: string, value?: string) {
    super();
    this.displayName = name || '';
    this.value = value || '';
  }

  @AfterLoad()
  async decompressValue() {
    if (this.value) {
      // console.log(
      //   '\n\n\n============= Canvas Value in DB ===========\n',
      //   this.value,
      //   '\n========================\n\n\n'
      // );
      // const decompressedValue = inflateSync(this.value);
      // // const decompressedValue = inflateSync(
      // //   Buffer.from(this.value, 'base64').toString()
      // // );
      // console.log(
      //   '\n\n\n============ Decompressed Value ============\n',
      //   decompressedValue.toString().slice(0, 100),
      //   '\n========================\n\n\n'
      // );
      // this.value = decompressedValue.toString();
      const input = 'GeeksforGeeks';
      // Calling deflateSync method
      const deflated = deflateSync(input);

      // Calling inflateSync method
      const inflated = inflateSync(deflated.toString());

      console.log(
        '\n\n\n============ Inflated ============\n',
        inflated,
        '\n========================\n\n\n'
      );
    }
  }

  @Column('longtext', { nullable: false })
  value!: string;

  @Column('varchar', { length: 36, nullable: true })
  createdBy!: string;

  @ManyToOne(() => Callout, callout => callout.canvases, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  callout?: Callout;

  @OneToOne(() => CanvasCheckout, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  checkout?: CanvasCheckout;

  @OneToOne(() => Visual, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  preview?: Visual;
}
