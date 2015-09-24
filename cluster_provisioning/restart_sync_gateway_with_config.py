import os
import subprocess
import sys

from optparse import OptionParser


def main():
    usage = "usage: python restart_sync_gateway_with_config.py -c <config_name> -n <node_name>"
    parser = OptionParser(usage=usage)

    parser.add_option(
        "-c", "--config-name",
        action="store",
        type="string",
        dest="config_name",
        help="sync_gateway config to run (relative to sync-gateway-tests/config/ folder)"
    )

    parser.add_option(
        "-n", "--vm-name",
        action="store",
        type="string",
        dest="vm_name",
        help="name of vm to restart with new configuration"
    )

    cmd_args = sys.argv[1:]
    (opts, args) = parser.parse_args(cmd_args)

    config_name = opts.config_name
    vm_name = opts.vm_name

    os.chdir("ansible/")
    subprocess.call([
        "ansible-playbook", "-i", os.path.expandvars("$INVENTORY"),
        "restart-sync-gateway-with-config.yml", "--limit", vm_name,
        "--extra-vars",
        "sync_gateway_config_file_name={}".format(config_name)
    ])

if __name__ == "__main__":
    main()