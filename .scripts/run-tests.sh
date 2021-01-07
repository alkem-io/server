#!/bin/bash
set -ev
if [ "${TRAVIS_EVENT_TYPE}" = "push" ]; then
  npm run test:ci
fi