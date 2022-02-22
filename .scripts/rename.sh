#!/bin/sh

find . -name "*ecoverse*.*" | sed -e "p;s/ecoverse/hub/" | xargs -n2 mv
