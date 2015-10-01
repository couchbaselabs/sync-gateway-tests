import os
import subprocess
import sys

from optparse import OptionParser


def install_keys(key_name, user_name):

    if not key_name or not user_name:
        print "Make sure to specify a public key with --key-name and user with --remote-user"
        sys.exit(1)

    ips = []
    with open(os.environ["INVENTORY"]) as f:
        for line in f:
            pattern = "ansible_host="
            if pattern in line:
                start_idx = line.find(pattern)
                ip = line[start_idx + len(pattern):len(line) - 1]
                ips.append(ip)
    print "Are you sure you would like to copy public key {0} to vms: {1}".format(
        key_name, ips
    )

    validate = raw_input("Enter 'y' to continue or 'n' to exit: ")
    if validate != "y":
        print "Exiting..."
        sys.exit(1)

    print "Using ssh-copy-id..."
    for ip in ips:
        subprocess.call([
            "ssh-copy-id",
            "-n",
            "-i",
            "{0}/.ssh/{1}".format(os.environ["HOME"], key_name),
            "{0}@{1}".format(user_name, ip)
        ])

if __name__ == "__main__":

    usage = "usage: python install_keys.py --key-name=<public_key_name> --remote-user=<ssh_user_name>"
    parser = OptionParser(usage=usage)

    parser.add_option(
        "", "--key-name",
        action="store",
        type="string",
        dest="key_name",
        help="name of public key to install on ansible hosts"
    )

    parser.add_option(
        "", "--remote-user",
        action="store",
        type="string",
        dest="remote_user",
        help="name of ssh user"
    )

    cmd_args = sys.argv[1:]
    (opts, args) = parser.parse_args(cmd_args)

    install_keys(opts.key_name, opts.remote_user)
