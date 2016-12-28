Configs used in server upgrade testing. Need to be manually uploaded to /etc/nginx/ if load balancer vm goes down


To fix error like:
curl http://172.23.108.186/db
<html>
<head><title>502 Bad Gateway</title></head>
<body bgcolor="white">
<center><h1>502 Bad Gateway</h1></center>
<hr><center>nginx/1.6.3</center>
</body>
</html>

we need (http://serverfault.com/questions/634294/nodejs-nginx-error-13-permission-denied-while-connecting-to-upstream):

  $ yum install policycoreutils-python
  $ semanage port --add --type http_port_t --proto tcp 4984