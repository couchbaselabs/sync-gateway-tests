import time

import pytest
import concurrent.futures

from lib.admin import Admin

from cluster_setup import cluster
from cluster_setup import simple_users_with_channels

@pytest.mark.extendedsanity
def test_multiple_db_single_data_bucket_single_index_bucket(cluster, simple_users_with_channels):

    cluster.reset(config="sync_gateway_multiple_dbs_distributed_index.json")

    admin = Admin(cluster.sync_gateways[0])

    #admin.register_user(target=cluster.sync_gateways[0], db="db", name="seth", channels=["ABC", "CBS", "NBC", "FOX"])
    #admin.register_user(target=cluster.sync_gateways[0], db="db2", name="ashvinder", channels=["ABC", "CBS", "NBC", "FOX"])

    for user in simple_users_with_channels:
        admin.register_user(target=cluster.sync_gateways[0], db=user["db"], name=user["name"], channels=user["channels"])

    users = admin.get_users().values()
    print(users)

    # Round robin
    count = 1
    num_sgs = len(cluster.sync_gateways)
    while count <= 20:
        for user in users:
            user.add_docs(100, uuid_names=True, bulk=True)
            user.target = cluster.sync_gateways[(count + 1) % num_sgs]
        count += 1

    all_cache_ids = [key for user in users for key in user.cache.keys()]
    print(all_cache_ids)

    for user in users:
        print(user)
        assert len(user.cache) == 2000
        change_doc_ids = user.get_doc_ids_from_changes()
        assert len(change_doc_ids) == len(all_cache_ids)
        assert set(change_doc_ids) == set(all_cache_ids)


def test_multiple_db_single_data_bucket_unique_index_bucket(cluster, simple_users_with_channels):
    pass


def test_multiple_db_unique_data_bucket_single_index_bucket(cluster, simple_users_with_channels):
    pass


def test_multiple_db_unique_data_bucket_unique_index_bucket(cluster, simple_users_with_channels):
    pass


def test_multiple_db_single_data_bucket_different_sync_functions(cluster, simple_users_with_channels):
    pass