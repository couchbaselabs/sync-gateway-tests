#!/bin/bash

# Usage: ./run_all.sh 172.23.105.98 default index-bucket
# ./run_all.sh 172.23.105.98 bucket-1 bucket-2

for file in ./tests/*
do
  python ./upgrade_test/create_buckets.py $1 $2
  sleep 10
  python ./upgrade_test/create_buckets.py $1 $3
  sleep 15
  echo $file
  node "$file" | tee results.tap 
  sleep 5
  rm -rf *.pindex
  python ./upgrade_test/delete_buckets.py $1 $2
  python ./upgrade_test/delete_buckets.py $1 $3
done
