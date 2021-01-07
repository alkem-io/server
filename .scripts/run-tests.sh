#!/bin/bash
set -ev
if [ "${TRAVIS_EVENT_TYPE}" = "cron" ];
then
  npm run test:nightly
else
  npm run test:ci
fi