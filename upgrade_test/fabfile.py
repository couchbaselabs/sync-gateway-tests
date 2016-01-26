from __future__ import with_statement
from fabric.api import env,roles,local, settings, abort, run, cd,put,get
import urllib2
from lxml import etree
from io import StringIO, BytesIO

#env.hosts = ['localhost']

env.roledefs = {'mac': ['macbuild.hq.couchbase.com'],
				'nginx': ['lb.sc.couchbase.com']}


c = {"base_url" : "http://latestbuilds.hq.couchbase.com",
	  "cbl_ios" : "couchbase-lite-ios",	 
		  "ios" : "couchbase-lite-ios" ,
 		   "sg" : "couchbase-sync-gateway",
 	 "iosBuild" : "couchbase-lite-ios-enterprise_",
  "macosxBuild" : "couchbase-lite-macosx-enterprise_",
      "sgBuild" : "couchbase-sync-gateway-enterprise_",
 	   "master" : "0.0.0",
 	   "1.1"    : "1.1.0",
 	   "1.1.1"  : "1.1.1",
 	   "1.2.0"  : "1.2.0",  
 	   "centos" : "rpm",
 	   "ubuntu" : "deb",
 	  "windows" : "exe",
 	   "macosx" : "tar.gz"}

def url_append(url_strings):
	url = ''
	for element in url_strings:
		url = url + element + "/"
	return url

def get_latest_version(url):
	previous_version = '0'
	version = '0'
	response = urllib2.urlopen(url)
	html = response.read()
	parser = etree.HTMLParser()
	tree   = etree.parse(BytesIO(html), parser)

	result = etree.tostring(tree.getroot(),pretty_print=True, method="html")
	
	for row in tree.iter('td'):
		if row is not None and row.xpath('a/@href'):
			build_num = row.xpath('a/@href')[0]
			previous_version = build_num[-4:-1]
			if previous_version != 'way' and previous_version!= "0.0" and int(previous_version) >= int(version):
				version = previous_version

	return version


def compose_sg_url(product,version,platform):

	default_version = 'master'
	build_name = ''

	#build_url = url_append([ c["base_url"] , c[product] , c[version] ])

	build_url = url_append([ c["base_url"] , c[product] ])

	if not version or version == 'master' or version == 'latest' or version == '0.0.0':
		build_url = build_url + url_append([c[default_version] ])
		latest_version = get_latest_version(build_url)
		build_folder = c[default_version] + '-' + latest_version
		build_url = build_url + url_append([build_folder]) 
		build_name = c[product+'Build'] + c[default_version] + '-' +latest_version + "_x86_64" +"." + c[platform]
		build_url = build_url + build_name

	elif version and '0.0.0' in version:
		build_url = build_url + url_append([c[default_version],version ])
		build_name = c[product+'Build'] + version + "_x86_64" +"." + c[platform]
		build_url = build_url + build_name
		
	elif version and '1.1.0' in version:
		build_url = build_url + url_append(['release','1.1.0' , version ])
		build_name = c[product+'Build'] + version + "_x86_64" +"." + c[platform]
		build_url = build_url + build_name

	elif version and '1.1.1' in version:
		build_url = build_url + url_append(['release','1.1.1' , version ])
		build_name = c[product+'Build'] + version + "_x86_64" +"." + c[platform]
		build_url = build_url + build_name

	elif version and '1.2.0' in version:
		build_url = build_url + url_append(['1.2.0' , version ])
		build_name = c[product+'Build'] + version + "_x86_64" +"." + c[platform]
		build_url = build_url + build_name
			
	else:
		print "Error: Should not have landed here. No Sync Gateway version found"
	
	return build_url,build_name


def compose_cbl_url(product,version,platform):
	
	default_version = 'master'
	build_name = ''

	if platform == 'macosx':
		build_url = url_append([ c["base_url"] , c['ios'] ])
	else:
		build_url = url_append([ c["base_url"] , c[platform] ])	

	if not version or version == 'master' or version == 'latest' or version == '0.0.0':
		build_url = build_url + url_append([c[default_version] , platform ])
		latest_version = get_latest_version(build_url)
		build_folder = c[default_version] + '-' + latest_version
		build_name = c[platform+'Build'] + c[default_version] + '-' +latest_version + ".zip"
		build_url = build_url + url_append([build_folder]) + build_name

	elif version and '0.0.0' in version:
		build_url = build_url + url_append([c[default_version] , platform , version ])
		build_name = c[platform+'Build'] + version + ".zip"
		build_url = build_url + build_name
		
	elif version and '1.1.0' in version:
		build_url = build_url + url_append(['release','1.1.0' , platform , version ])
		build_name = c[platform+'Build'] + version + ".zip"
		build_url = build_url + build_name

	elif version and '1.1.1' in version:
		build_url = build_url + url_append(['release','1.1.1' , platform , version ])
		build_name = c[platform+'Build'] + version + ".zip"
		build_url = build_url + build_name

	elif version and '1.2.0' in version:
		build_url = build_url + url_append(['release','1.2.0' , platform , version ])
		build_name = c[platform+'Build'] + version + ".zip"
		build_url = build_url + build_name

	else:
		print "Error: Should not have landed here. No CBL version found"
	
	return build_url,build_name


def get_build(product="",version="latest",platform=""):

	if product == 'cbl':
		build_url = compose_cbl_url(product,version,platform)
	elif product == 'sg':
		build_url = compose_sg_url(product,version,platform)
	return build_url

@roles("mac")
def deploy_cbl(user,password,version,platform):
	env.user = user
	env.password = password
	code_dir = '/tmp/cblios'
	url,file_name = get_build("cbl",version,platform)
	wget_build = "wget " + url
	unzip_build = "tar -xzf " + file_name + " -C " + code_dir;
	run("mkdir -p " + code_dir )
	with cd(code_dir):
		run("rm -rf *")
		run("ls -lh")
		run(wget_build)
		run(unzip_build)
		run("ls -lh")


def deploy_sg(user,password,version,platform):
	env.user = user
	env.password = password
	code_dir = '/tmp/sg'
	url,file_name = get_build("sg",version,platform)
	wget_build = "wget " + url
	unzip_build = "tar -xzf " + file_name + " -C " + code_dir;
	sgPID = run('ps aux | grep sync_gateway | grep -v grep |awk \'{ print $2}\'')
	if sgPID:
		run('kill -9 ' + sgPID)
	if platform == 'centos':
		output = ''
		with settings(warn_only=True):
			output = run('rpm -qa | grep couchbase-sync-gateway')
		if 'couchbase-sync-gateway' in output:
			run('rpm -e couchbase-sync-gateway')
	run("mkdir -p " + code_dir )
	with cd(code_dir):
		run("rm -rf *")
		run("ls -lh")
		run(wget_build)
		if platform == 'centos':
			run("rpm -i " + file_name)
			run("initctl stop sync_gateway")
		elif platform == 'macosx':
			run(unzip_build)
			run("ls ./couchbase-sync-gateway/*")


def launch_sg(user,password,sgConfig,platform):		
	env.user = user
	env.password = password
	code_dir = '/tmp/sg'
	sg_log = code_dir + "/sgoutput.log"
	sgConfigPath = '../config/' + sgConfig
	with settings(use_glob=False):
		put(sgConfigPath,code_dir)
	with cd(code_dir):
		if platform == 'macosx':
			run("nohup bash -c \"/tmp/sg/couchbase-sync-gateway/bin/sync_gateway " + sgConfig + " &\" > " + sg_log)
		else:
			run("nohup bash -c \"/opt/couchbase-sync-gateway/bin/sync_gateway " + sgConfig + " &\" > " + sg_log)


@roles("nginx")
def reload_nginx(file_name,user="root",password="couchbase"):
	env.user = user
	env.password = password
	file_path = "/etc/nginx/" + file_name
	run("/bin/cp " + file_path + " /etc/nginx/conf.d/sync_gateway.conf")
	run("nginx -s reload")
	

def getOSName(user,password):
	env.user = user
	env.password = password
	with cd('/tmp'):
		output = run ('python -c "import platform; print platform.system()"')
		print "Here is output-->>",output
		put('/tmp/foo.bar','/tmp/foo.bar',mode=0755)
		get('/tmp/hey.txt','.')
		#run("ls -lh")



