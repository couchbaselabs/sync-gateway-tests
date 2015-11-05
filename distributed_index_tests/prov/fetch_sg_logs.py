import os.path
import shutil
import time
import logging
logging.basicConfig(format='%(asctime)s %(message)s', datefmt='%m/%d/%Y %I:%M:%S %p', level=logging.INFO)


from ansible_runner import run_ansible_playbook


def fetch_sync_gateway_logs(prefix):

    logging.info("Pulling logs")
    # fetch logs from sync_gateway instances
    run_ansible_playbook("fetch-sync-gateway-logs.yml")

    # zip logs and timestamp
    if os.path.isdir("/tmp/sg_logs"):
        date_time = time.strftime("%Y-%m-%d-%H-%M-%S")
        name = "/tmp/{}-{}-sglogs".format(prefix, date_time)

        shutil.make_archive(name, "zip", "/tmp/sg_logs")

        shutil.rmtree("/tmp/sg_logs")
        logging.info("sync_gateway logs copied here {}".format(name))


if __name__ == "__main__":
    fetch_sync_gateway_logs()
