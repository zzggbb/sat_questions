#!/bin/sh
for f in scrapes/*.json; do
  b=$(basename $f)
  diff -s scrapes/$b scrapes/testing/$b
done
