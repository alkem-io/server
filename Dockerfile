FROM node:16.15.0-alpine


#install CLI mariadb/mysql client
RUN apk add --update mariadb-client && apk add python3 && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /usr/src/app

# Define graphql server port
ARG GRAPHQL_ENDPOINT_PORT_ARG=4000
ARG ENV_ARG=production

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm i -g npm@8.5.5
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

ADD .scripts/create_db.sh /create_db.sh
RUN chmod +x /create_db.sh


EXPOSE ${GRAPHQL_ENDPOINT_PORT_ARG}
CMD ["/bin/sh", "-c", "/create_db.sh && npm run migration:run && npm run start:prod"]
