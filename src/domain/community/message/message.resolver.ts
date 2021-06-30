import {
  ObjectType,
  Field,
  ID,
  Resolver,
  Subscription,
  Query,
  Float,
} from '@nestjs/graphql';
import { PubSub } from 'apollo-server-express';

const date = new Date();
const closure = (date: Date, offset: number) => {
  const newDate = new Date(date);
  newDate.setMilliseconds(offset);
  return newDate;
};

const messages = [
  {
    content: 'Hey! It is us! The alkemio developers!',
    left: false,
    delay: 1000,
    date: closure(date, 1000),
  },
  {
    content: 'Hi! Nice to meet you!',
    left: true,
    delay: 2500,
    date: closure(date, 3500),
  },
  {
    content: 'When can I expect the messaging system to be up and running?',
    left: true,
    delay: 2000,
    date: closure(date, 5500),
  },
  {
    content: 'Pretty soon! We are working hard to make this available for You.',
    left: false,
    delay: 3000,
    date: closure(date, 8500),
  },
  {
    content: 'Will you let me know when it is ready?',
    left: true,
    delay: 2000,
    date: closure(date, 10500),
  },
  {
    content: 'Of course! Do not forget to check your email! :)',
    left: false,
    delay: 2000,
    date: closure(date, 12500),
  },
];

@ObjectType()
export class Message {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  reciever!: string;

  @Field(() => String)
  sender!: string;

  @Field(() => Float)
  timestamp!: number;

  @Field(() => String)
  message!: string;
}

@Resolver()
export class MessageResolver {
  pubSub = new PubSub();

  async sendMessages(mList: Message[]) {
    for (const m of mList) {
      await this.sendMessage(m, Math.random() * 10000);
    }
  }

  sendMessage(m: Message, delay: number) {
    return new Promise(resolve => {
      setTimeout(() => {
        this.pubSub.publish('messageReceived', {
          messageReceived: {
            ...m,
          },
        });
        resolve();
      }, delay);
    });
  }

  @Query(() => [Message])
  messages(): Message[] {
    const messsgeList = messages.map(toMessage);
    // const futureMessages = messsgeList.slice(2);
    // setTimeout(() => {
    //   this.sendMessages(futureMessages);
    // }, 2000);
    return messsgeList;
  }

  @Subscription(() => Message)
  messageReceived() {
    return this.pubSub.asyncIterator('messageReceived');
  }
}

const toMessage = (
  m: {
    content: string;
    left: boolean;
    delay: number;
    date: Date;
  },
  i: number
) => ({
  id: `${i}`,
  reciever: m.left ? 'pesho@pehso.com' : 'acho@acho.com',
  sender: m.left ? 'acho@acho.com' : 'pesho@pehso.com',
  message: m.content,
  timestamp: m.date.getTime() / 1000,
});
