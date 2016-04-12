import os
import requests
import sys
import subprocess
import shutil
import time

from subprocess import CalledProcessError
from zipfile import ZipFile

from optparse import OptionParser


def remove_existing_couchbase_server():

    # Kill Archive
    try:
        output = subprocess.check_output("ps aux | grep Archive | awk '{print $2}' | xargs kill -9", shell=True)
        print(output)
    except CalledProcessError as e:
        print("No Archive process running: {}".format(e))

    # Kill Couchbase server
    try:
        subprocess.check_output("ps aux | grep '/Applications/Couchbase Server.app/Contents/MacOS/Couchbase Server' | awk '{print $2}' | xargs kill -9", shell=True)
        print(output)
    except CalledProcessError as e:
        print("No Couchbase Server process running: {}".format(e))

    output = subprocess.check_output("rm -rf binaries/couchbase-server*", shell=True)
    print("Removing previous packages: {}".format(output))

    if os.path.isdir("/Applications/Couchbase Server.app/"):
        shutil.rmtree("/Applications/Couchbase Server.app/")

    if os.path.isdir("~/Library/Application Support/Couchbase"):
        shutil.rmtree("~/Library/Application Support/Couchbase")

    if os.path.isdir("~/Library/Application Support/Membase"):
        shutil.rmtree("~/Library/Application Support/Membase")


def install_local_couchbase_server(version):

    # Remove previous install
    remove_existing_couchbase_server()

    if version == "4.0.0":
        url = "https://s3.amazonaws.com/packages.couchbase.com/releases/{}/couchbase-server-enterprise_{}-elcapitan_x86_64.zip".format(
            version,
            version
        )
    else:
        url = "https://s3.amazonaws.com/packages.couchbase.com/releases/{}/couchbase-server-enterprise_{}-macos_x86_64.zip".format(
            version,
            version
        )

    print("Installing Couchbase Server: {}".format(version))


    print os.getcwd()

    os.chdir("binaries/")

    # Download and save to .zip to disc
    r = requests.get(url)
    file_name = "couchbase-server.zip"
    with open(file_name, "wb") as f:
        f.write(r.content)

    # Extract and copy app to /Applications
    subprocess.check_call("open couchbase-server*.zip", shell=True)
    time.sleep(10)

    subprocess.check_call("mv couchbase-server*/Couchbase\ Server.app /Applications/", shell=True)

    os.chdir("../")

    # Launch Server
    subprocess.check_call("xattr -d -r com.apple.quarantine /Applications/Couchbase\ Server.app", shell=True)
    launch_server_output = subprocess.check_output("open /Applications/Couchbase\ Server.app", shell=True)
    print(launch_server_output)

if __name__ == '__main__':

    usage = "usage: install_couchbase_server.py --version=1.2.0-79"
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
        print("You must provide a version of Couchbase Server to download (ex. 4.1.0)")
        sys.exit(1)

    install_local_couchbase_server(opts.version)

