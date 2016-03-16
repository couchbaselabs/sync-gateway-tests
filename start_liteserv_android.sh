#!/usr/bin/env bash

listenport=$1

adb shell am force-stop com.couchbase.liteservandroid
adb shell pm clear com.couchbase.liteservandroid
adb shell am start -a android.intent.action.MAIN -n com.couchbase.liteservandroid/com.couchbase.liteservandroid.MainActivity --ei listen_port $listenport --es username none --es password none
adb forward tcp:$listenport tcp:$listenport