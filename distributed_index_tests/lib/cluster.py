from lib.syncgateway import SyncGateway
from conf.ini_to_ansible_host import ini_to_ansible_host
from prov.ansible_runner import run_ansible_playbook
import os

class Cluster:

    def __init__(self, ini_file):

        sgs, cbs = ini_to_ansible_host(ini_file)

        self.sync_gateways = [SyncGateway(sg) for sg in sgs]
        self.servers = cbs

    def reset(self, config):
        conf_path = os.path.abspath("conf/" + config)

        print("> Restarting sync_gateway with configuration: {}".format(conf_path))

        run_ansible_playbook(
            "reset-sync-gateway.yml",
            extra_vars="sync_gateway_config_filepath={0}".format(conf_path)

    def __str__(self):
        with open("temp_ansible_hosts", "r") as f:
            return f.read()







