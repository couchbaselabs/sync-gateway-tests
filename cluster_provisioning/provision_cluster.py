import sys
import os
import subprocess
import httplib

from urlparse import urlparse
from optparse import OptionParser


def provision_cluster(server_package_url, sync_gateway_package_url):

    if not "INVENTORY" in os.environ:
        print "Make sure $INVENTORY points to an ansible inventory"

    def base_url_and_package(url):
        partitioned = url.rpartition("/")
        return partitioned[0], partitioned[2]

    def package_exists(url):
        url_parts = urlparse(url)
        host = url_parts.hostname
        path = url_parts.path
        connection = httplib.HTTPConnection(host)
        connection.request("HEAD", path)
        return connection.getresponse().status == 200

    def print_inventory():
        inventory = open(os.environ["INVENTORY"], 'r')
        print "\n{}".format(inventory.read())



    # check that packages exist
    if not package_exists(opts.couchbase_server_package_url):
        print "Invalid server package url"
        sys.exit(1)

    if not package_exists(opts.sync_gateway_package_url):
        print "Invalid sync_gateway package url"
        sys.exit(1)

    # split full url into base and package name for ansible script
    cb_base_url, cb_package_name = base_url_and_package(opts.couchbase_server_package_url)
    sg_base_url, sg_package_name = base_url_and_package(opts.sync_gateway_package_url)

    print ">>> Provisioning cluster"
    print_inventory()

    print os.path.expandvars("$INVENTORY")

    os.chdir("ansible/")
    # $INVENTORY is the path your .ini file
    subprocess.call(["ansible-playbook", "-i", os.environ["INVENTORY"], "install-common-tools.yml", "-vvvv"])

    subprocess.call([
        "ansible-playbook", "-i", os.path.expandvars("$INVENTORY"),
        "install-couchbase-server.yml",
        "--extra-vars",
        "couchbase_server_package_base_url={0} couchbase_server_package_name={1}".format(cb_base_url, cb_package_name)
    ])

    subprocess.call([
        "ansible-playbook", "-i", os.path.expandvars("$INVENTORY"),
        "install-sync-gateway.yml",
        "--extra-vars",
        "sync_gateway_package_base_url={0} sync_gateway_package_name={1}".format(sg_base_url, sg_package_name)
    ])

if __name__ == "__main__":

    usage = "usage: python provision_cluster.py --couchbase-server-url=<package_url> --sync-gateway-url=<package_url>"
    parser = OptionParser(usage=usage)

    parser.add_option(
        "", "--couchbase-server-url",
        action="store",
        type="string",
        default="http://latestbuilds.hq.couchbase.com/couchbase-server/sherlock/4051/couchbase-server-enterprise-4.0.0-4051-centos7.x86_64.rpm",
        dest="couchbase_server_package_url",
        help="couchbase package to install"
    )

    parser.add_option(
        "", "--sync-gateway-url",
        action="store",
        type="string",
        default="http://latestbuilds.hq.couchbase.com/couchbase-sync-gateway/release/1.1.1/1.1.1-10/couchbase-sync-gateway-enterprise_1.1.1-10_x86_64.rpm",
        dest="sync_gateway_package_url",
        help="sync_gateway package to install"
    )

    cmd_args = sys.argv[1:]
    (opts, args) = parser.parse_args(cmd_args)

    provision_cluster(opts.couchbase_server_package_url, opts.sync_gateway_package_url)

