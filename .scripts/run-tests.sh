#!/bin/bash
set -ev
bundle exec rake:units
if [ "${TRAVIS_EVENT_TYPE}" = "push" ]; then
  npm run test:ci
fi