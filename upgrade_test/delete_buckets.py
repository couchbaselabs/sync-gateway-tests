import requests
import time
import sys

def delete_bucket(ip,name):
    ip_addr = 'http://'+ip+':8091/pools/default/buckets/' + name
    r = requests.delete(ip_addr,auth=('Administrator', 'password'))
    if r.status_code == 200:
        print "Success: Deleted the bucket", name
    else:
        print "Error: Could not delete bucket, got", r.status_code ,"response"
        sys.exit(1)

ip = sys.argv[1]
name = sys.argv[2]
delete_bucket(ip,name)