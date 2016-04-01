#!/bin/bash

# Usage: ./run_one.sh 172.23.105.98 default index-bucket test-name
# ./run_one.sh cbs-ipaddr bucket-1 bucket-2 cbl-replication.js

  python ./upgrade_test/create_buckets.py $1 $2
  sleep 10
  python ./upgrade_test/create_buckets.py $1 $3
  sleep 15
  echo $file
  node ./tests/$4 | tee -a results.tap
  sleep 5
  rm -rf *.pindex
  python ./upgrade_test/delete_buckets.py $1 $2
  python ./upgrade_test/delete_buckets.py $1 $3

