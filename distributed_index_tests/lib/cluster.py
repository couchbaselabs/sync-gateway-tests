from lib.syncgateway import SyncGateway
from conf.ini_to_ansible_host import ini_to_ansible_host
from orch import clusteractions
import logging

class Cluster:

    def __init__(self, ini_file):

        sgs, cbs = ini_to_ansible_host(ini_file)

        self.sync_gateways = [SyncGateway(sg) for sg in sgs]
        self.servers = cbs

    def reset(self, config):
        clusteractions.reset(config)

    def __str__(self):
        with open("temp_ansible_hosts", "r") as f:
            return f.read()







