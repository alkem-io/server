FROM node:20.15.1-alpine


# Create app directory
WORKDIR /usr/src/app

# Define graphql server port
ARG GRAPHQL_ENDPOINT_PORT_ARG=4000
ARG ENV_ARG=production

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm i -g npm@10.1.0
RUN npm install -g rimraf
RUN npm install

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source & config files for TypeORM & TypeScript
COPY ./src ./src
COPY ./tsconfig.json .
COPY ./tsconfig.build.json .
COPY ./alkemio.yml .

RUN npm run build

## Add the wait script to the image
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.7.3/wait /wait
RUN chmod +x /wait

ENV GRAPHQL_ENDPOINT_PORT=${GRAPHQL_ENDPOINT_PORT_ARG}
ENV NODE_ENV=${ENV_ARG}

EXPOSE ${GRAPHQL_ENDPOINT_PORT_ARG}
CMD ["/bin/sh", "-c", "npm run start:prod NODE_OPTIONS=--max-old-space-size=2048"]
