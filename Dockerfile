FROM node:20.15.1-alpine


# Create app directory
WORKDIR /usr/src/app

# Define graphql server port
ARG GRAPHQL_ENDPOINT_PORT_ARG=4000
ARG ENV_ARG=production

# Install pnpm globally
RUN npm i -g pnpm@10.17.1

# Install app dependencies
# A wildcard is used to ensure both package.json AND pnpm-lock.yaml are copied
# where available (pnpm@9+)
COPY package*.json pnpm-lock.yaml ./

RUN pnpm install

# If you are building your code for production
# RUN pnpm install --prod

# Bundle app source & config files for TypeORM & TypeScript
COPY ./src ./src
COPY ./tsconfig.json .
COPY ./tsconfig.build.json .
COPY ./alkemio.yml .

RUN pnpm run build

## Add the wait script to the image
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.7.3/wait /wait
RUN chmod +x /wait

ENV GRAPHQL_ENDPOINT_PORT=${GRAPHQL_ENDPOINT_PORT_ARG}
ENV NODE_ENV=${ENV_ARG}

EXPOSE ${GRAPHQL_ENDPOINT_PORT_ARG}
CMD ["/bin/sh", "-c", "pnpm run start:prod NODE_OPTIONS=--max-old-space-size=2048"]
