import sys
import subprocess
import time

from optparse import OptionParser

# jython imports
from com.android.monkeyrunner import MonkeyRunner, MonkeyDevice

if __name__ == '__main__':

    print('Waiting for device "emulator-5554"')
    device = MonkeyRunner.waitForConnection(timeout=300, deviceId="emulator-5554")

    print('Unlocking emulator ...')
    device.press('KEYCODE_MENU', MonkeyDevice.DOWN_AND_UP)