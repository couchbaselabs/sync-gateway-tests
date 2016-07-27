#!/usr/bin/env bash


dbPasswords="cblite-test:pass,cbl-database1:pass,cbl-database2:pass,cbl-database3:pass,un_derscore:pass,dollar\$ign:pass,left\(paren:pass,right\)paren:pass,c+plus+plus+:pass,t-minus1:pass,foward/slash:pass,cbl-document1:pass,cbl-document2:pass,cbl-document3:pass,bigtable:pass,large-revisions-compact:pass,large-revisions-not-continues:pass,large-revisions-revs_cache_size:pass,large-revisions:pass,api-test-once-push:pass,api-test-once-pull:pass,cbl-replication-attach1:pass,cbl-replication-attach2:pass,mismatch-gateways-one:pass,mismatch-gateways-two:pass,mismatch-restart-cb-one:pass,mismatch-restart-cb-two:pass,mismatch-restart-sg-one:pass,mismatch-restart-sg-two:pass,cbl-replication:pass,cbl-replication1:pass,cbl-replication2:pass,cbl-replication3:pass,cbl-replication4:pass,cbl-replication5:pass,cbl-replication6:pass,cbl-replication7:pass,cbl-replication8:pass,cbl-replication9:pass,api-revision-restart:pass,api-revisions:pass,simple-requests:pass,webhook_events:pass"

listenport=$1

echo $STORAGE_ENGINE
echo $listenport

adb shell am force-stop com.couchbase.liteservandroid
adb shell pm clear com.couchbase.liteservandroid

if [ "$STORAGE_ENGINE" == "SQLCipher" ]; then
    echo "Using SQLCipher!"
    echo $dbPasswords
    adb shell am start -a android.intent.action.MAIN -n com.couchbase.liteservandroid/com.couchbase.liteservandroid.MainActivity \
        --ei listen_port $listenport \
        --es username none --es password none \
        --es storage SQLite \
        --es dbpassword $dbPasswords
elif [ "$STORAGE_ENGINE" == "ForestDB+Encryption" ]; then
    echo "Using ForestDB+Encryption!"
    echo $dbPasswords
    adb shell am start -a android.intent.action.MAIN -n com.couchbase.liteservandroid/com.couchbase.liteservandroid.MainActivity \
        --ei listen_port $listenport \
        --es username none --es password none \
        --es storage ForestDB \
        --es dbpassword $dbPasswords
else
    echo "Using $STORAGE_ENGINE!"
    adb shell am start -a android.intent.action.MAIN -n com.couchbase.liteservandroid/com.couchbase.liteservandroid.MainActivity \
        --ei listen_port $listenport \
        --es username none --es password none \
        --es storage $STORAGE_ENGINE
fi

adb forward tcp:$listenport tcp:$listenport