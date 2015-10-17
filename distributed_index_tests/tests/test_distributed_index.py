import sys


sys.path = ["..","lib"] + sys.path

# Local
# PUT /{db}/{local-doc-id}
# GET /{db}/{local-doc-id}
# DELETE /{db}/{local-doc-id}

from sync_gateway import SyncGateway
from user import User

import time
import uuid
import concurrent.futures

from concurrent.futures import ThreadPoolExecutor

def test_1():

    start = time.time()

    #sg_ips = [ "127.0.0.1" ]

    sg_ips = [
        "XXX.XX.XXX.XXX",
        "XXX.XX.XXX.XXX",
        "XXX.XX.XXX.XXX",
        "XXX.XX.XXX.XXX"
    ]

    sgs = [SyncGateway(sg_ip, "db") for sg_ip in sg_ips]

    for sg in sgs:
        r = sg.info()
        print(r.text)
        assert r.status_code == 200

    seth = User("seth", "password", ["ABC"])
    sgs[0].db.add_user(seth)

    docs = []
    channel_docs = []
    count = 0
    while count < 10000:

        doc = {}
        is_channel_doc = False

        if count % 2 == 0:
            is_channel_doc = True

        if is_channel_doc:
            doc["channels"] = ["ABC"]
            doc["arbitrary"] = [000, 111, 222]
            doc_name = uuid.uuid4()
            channel_docs.append(doc)
            docs.append({"name": doc_name, "doc_body": doc})
        else:
            doc["arbitrary"] = [333, 444, 555]
            doc_name = uuid.uuid4()
            docs.append({"name": doc_name, "doc_body": doc})

        count += 1

    with ThreadPoolExecutor(max_workers=300) as executor:

        future_to_doc = {}

        count = 0
        for doc in docs:
            sg_index = count % len(sgs)
            future_to_doc[executor.submit(sgs[sg_index].db.add_user_document, doc["name"], doc["doc_body"], seth)] = doc
            count += 1

        docs_done = 0
        reported_created = 0
        for future in concurrent.futures.as_completed(future_to_doc):
            doc = future_to_doc[future]
            try:
                r = future.result()
            except Exception as e:
                print("Generated an exception: doc:{} e:{}".format(doc, e))
            else:
                #print(docs_done)
                #print(r.status_code)
                if r.status_code == 201:
                    reported_created += 1
                if r.status_code != 201:
                    print("{}:{}".format(r.status_code, r.text))
                docs_done += 1

    assert reported_created == 10000
    assert len(channel_docs) == 5000

    c_r = sgs[0].db.get_user_changes(seth)
    number_of_changes = len(c_r["results"])

    print("CHANGES: {}".format(number_of_changes))
    assert number_of_changes == 5000

    end = time.time()
    print("TIME:{}s".format(end - start))

test_1()