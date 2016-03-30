import sys
import subprocess
import time

from optparse import OptionParser

# jython imports
from com.android.monkeyrunner import MonkeyRunner, MonkeyDevice

if __name__ == '__main__':

    print('Waiting for device "emulator-5554"')
    device = MonkeyRunner.waitForConnection(timeout=300, deviceId="emulator-5554")

    package_name = "com.couchbase.liteservandroid"

    print('Removing previous LiteServ')
    device.removePackage(package_name)

    device.press('KEYCODE_MENU', MonkeyDevice.DOWN_AND_UP)

    print('Installing app')
    device.installPackage('../sync-gateway-tests-deps/couchbase-lite-android-liteserv/couchbase-lite-android-liteserv/build/outputs/apk/couchbase-lite-android-liteserv-debug.apk')

    print('Launching LiteServ!')
    output = device.shell('am start -a android.intent.action.MAIN -n com.couchbase.liteservandroid/com.couchbase.liteservandroid.MainActivity --ei listen_port 8081 --es username none --es password none')
    print(output)