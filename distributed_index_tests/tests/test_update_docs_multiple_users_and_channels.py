import time

from lib.user import User
from lib.admin import Admin

from cluster_setup import cluster

def test_update_docs_multiple_users_and_channels(cluster):

    num_docs = 100
    num_revisions = 10
    admin = Admin(sgs[0])
    num_channels = 10

    cluster.reset()

    start = time.time()
    sgs = cluster.sync_gateways

    all_channels = ["channel-" + i for i in xrange(1, num_channels + 1)]
    one_channels = list(all_channels[0])
    two_channels = all_channels[0:2]

    # Add users

    # Register users 1-10 to channel-1
    [admin.register_user(target=sgs[0], db="db", name="User-" + i, password="password", channels=one_channels) \
     for i in range(1, 11)]

    # Register users 11-20 to channel-1 and channel-2
    [admin.register_user(target=sgs[0], db="db", name="User-" + i, password="password", channels=two_channels) \
     for i in range(11, 21)]

    # Register users 21-30 to Channels-1, 2 and 3
    [admin.register_user(target=sgs[0], db="db", name="User-" + i, password="password", channels=all_channels) \
     for i in range(21, 31)]

    users = admin.get_users()

    [users[user].add_docs(num_docs) for user in users]

    [users[user].update_docs(num_revisions) for user in users]

    [assert len(users[user].docs_info) == num_docs for user in users]

    time.sleep(7)

    [assert users[user].verify_all_docs_from_changes_feed(num_revisions,"test-") for user in users]

    end = time.time()
    print("TIME:{}s".format(end - start))



