import requests
import json
from lib.user import User


# Admin
# GET /
# GET /_all_dbs
# PUT /db/
# DELETE /db/
# POST /DB/_compact
# POST /DB/_resync


class Admin:

    def __init__(self, sync_gateway):
        self.admin_url = "http://{}:4985".format(sync_gateway.ip)
        self.users = {}

    def register_user(self, target, db, name, channels, password="password"):

        headers = {"Content-Type": "application/json"}
        data = {"name": name, "password": password, "admin_channels": channels}
        r = requests.put("{0}/{1}/_user/{2}".format(self.admin_url, db, name), headers=headers, data=json.dumps(data))
        r.raise_for_status()

        self.users[name] = User(target, db, name, password, channels)

    def get_users(self):
        return self.users


