import pytest

from lib.cluster import Cluster
from prov.fetch_sg_logs import fetch_sync_gateway_logs

import logging

@pytest.fixture
def simple_users_with_channels():
    users = [
        {"db": "db", "name": "seth", "channels": ["ABC", "CBS", "NBC", "FOX"]},
        {"db": "db2", "name": "ashvinder", "channels": ["ABC", "CBS", "NBC", "FOX"]}
    ]
    return users

@pytest.fixture
def cluster(request):

    logging.basicConfig(format='%(asctime)s %(levelname)s: %(message)s', level=logging.DEBUG)

    def fetch_logs():

        # Fetch logs if a test fails
        if request.node.rep_call.failed:
            # example nodeid: tests/test_single_user_multiple_channels.py::test_1
            remove_slash = request.node.nodeid.replace("/", "-")
            test_id_elements = remove_slash.split("::")
            log_zip_prefix = "{0}-{1}".format(test_id_elements[0], test_id_elements[1])
            fetch_sync_gateway_logs(log_zip_prefix)

    c = Cluster("conf/hosts.ini")
    print(c)

    request.addfinalizer(fetch_logs)
    return c







