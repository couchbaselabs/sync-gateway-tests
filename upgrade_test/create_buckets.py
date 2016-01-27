import requests
import time
import sys

def create_bucket(ip,name):
    ip_addr = 'http://'+ip+':8091/pools/default/buckets'
    payload = {"name":name,"ramQuotaMB":"1024","authType":"none","proxyPort":11217,"bucketType":"couchbase"}
    r = requests.post(ip_addr, data = payload,auth=('Administrator', 'password'))
    
    if r.status_code == 202:
        print "Success: Created the bucket with Default name"
    else:
        sys.exit(1)

ip = sys.argv[1]
name = sys.argv[2]
create_bucket(ip,name)