import os
import requests
import tarfile
import sys

from optparse import OptionParser

def install_local_sync_gateway(version):

        print("Installing {} sync_gateway".format(version))

        version_parts = version.split("-")

        if len(version_parts) != 2:
            print("Your version string must follow the format: 1.2.0-79")
            sys.exit(1)

        version_number = version_parts[0]
        build_number = version_parts[1]

        print("Version: {}".format(version_number))

        if version_number == "1.1.1":
            # http://latestbuilds.hq.couchbase.com/couchbase-sync-gateway/release/1.1.0/1.1.0-28/couchbase-sync-gateway-enterprise_1.1.0-28_x86_64.tar.gz
            url = "http://latestbuilds.hq.couchbase.com/couchbase-sync-gateway/release/{}/{}/couchbase-sync-gateway-enterprise_{}_x86_64.tar.gz".format(
                version_number,
                version,
                version
            )
        else:
            url = "http://latestbuilds.service.couchbase.com/builds/latestbuilds/sync_gateway/{0}/{1}".format(
                version_number,
                build_number
            )

        print os.getcwd()

        os.chdir("binaries/")

        r = requests.get(url)

        file_name = "sync_gateway.tar.gz"

        with open(file_name, "wb") as f:
            f.write(r.content)

        with tarfile.open(file_name) as tar_f:
            tar_f.extractall()

        os.chdir("../")

if __name__ == '__main__':

    usage = "usage: install_sync_gateway.py --version=1.2.0-79"
    parser = OptionParser(usage=usage)

    parser.add_option(
        "", "--version",
        action="store",
        type="string",
        dest="version",
        help="sync_gateway version to install and run tests against",
        default=None
    )

    cmd_args = sys.argv[1:]
    (opts, args) = parser.parse_args(cmd_args)

    if opts.version is None:
        print("You must provide a version of sync_gateway to download (ex. 1.2.0-79)")
        sys.exit(1)

    install_local_sync_gateway(opts.version)

