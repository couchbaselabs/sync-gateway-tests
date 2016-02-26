import requests
import time
import sys

def create_bucket(ip,name):
    ip_addr = 'http://'+ip+':8091/pools/default/buckets'
    payload = {"name":name,"ramQuotaMB":"1024","authType":"sasl","proxyPort":"11211","bucketType":"couchbase","replicaNumber":"2"}
    r = requests.post(ip_addr, data = payload,auth=('Administrator', 'password'))
    
    if r.status_code == 202:
        print "Success: Created the bucket with Default name"
    else:
	print "Bucket creation failed!", r.status_code
        sys.exit(1)

ip = sys.argv[1]
name = sys.argv[2]
create_bucket(ip,name)
