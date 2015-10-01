import os
import subprocess
import sys

from optparse import OptionParser


def kill_sync_gateway(target):
    os.chdir("ansible/")
    subprocess.call([
        "ansible-playbook", "-i", os.path.expandvars("$INVENTORY"),
        "kill-sync-gateway.yml", "--limit", target
    ])

if __name__ == "__main__":
    usage = "usage: python kill_sync_gateway -n <node_name>"
    parser = OptionParser(usage=usage)

    parser.add_option(
        "-n", "--vm-name",
        action="store",
        type="string",
        dest="vm_name",
        help="name of vm to kill sync_gateway on"
    )

    cmd_args = sys.argv[1:]
    (opts, args) = parser.parse_args(cmd_args)

    vm_name = opts.vm_name

    kill_sync_gateway(vm_name)
