import requests
import concurrent.futures
import json
import pprint
import copy_reg
import types
import time


def _pickle_method(m):
    if m.im_self is None:
        return getattr, (m.im_class, m.im_func.func_name)
    else:
        return getattr, (m.im_self, m.im_func.func_name)


copy_reg.pickle(types.MethodType, _pickle_method)


class Sg_user:
	def __init__(self,sg_url,name='test',db='db',body_format={},channels=[]):
		self.url = sg_url
		self.name = name
		self.headers = {'Content-Type': 'application/json'}
		self.body = body_format.copy()
		self.body['count'] = 0
		self.db = db
		self.doc_ids = []
		
		if channels:
			self.channels = list(channels)
			self.body['channels'] = list(channels)
	

	def add_doc(self,num):
		doc_id = self.url + '/' + self.db + '/doc-' + self.name + '-' + str(num)
		body = json.dumps(self.body)
		resp = requests.put(doc_id,headers=self.headers,data=body)
		if resp.status_code == 201:
			self.doc_ids.append(doc_id)
		#print resp.json()
		resp.raise_for_status()
		return doc_id


	def add_num_docs(self,count):
		doc_names = [ str(i) for i in range(0,count)]
		doc_id = None
		with concurrent.futures.ProcessPoolExecutor() as executor:
			future_to_docs = {executor.submit(self.add_doc, doc): doc for doc in doc_names}
			
			for future in concurrent.futures.as_completed(future_to_docs):
				doc = future_to_docs[future]
				try:
					doc_id = future.result()
				except Exception as exc:
					print('%s generated an exception on doc_id:%s %s' % (self.name, doc_id, exc))
				else:
					#print(doc_id)
					self.doc_ids.append(doc_id)
		
				

	def update_doc(self,doc_name,num_revision=1):
		for i in range(num_revision):
			doc_url = self.url + '/' + self.db + '/' + doc_name
			doc_url = doc_name
			resp = requests.get(doc_url)
	
			if resp.status_code == 200:
				data = resp.json()
				data['count'] = int(data['count']) + 1
				#payload['_rev'] = data['_rev']
				body = json.dumps(data)
				put_resp = requests.put(doc_url,headers=self.headers,data=body)
				if put_resp.status_code == 201:
					print "Got response: ", put_resp.status_code	
				put_resp.raise_for_status()
			resp.raise_for_status()


	def update_all_docs(self,num_revision=1):
		doc_id = None
		print "In update_all_docs"
		with concurrent.futures.ProcessPoolExecutor() as executor:
			future_to_docs = {executor.submit(self.update_doc, doc_id,num_revision): doc_id for doc_id in self.doc_ids}
			
			for future in concurrent.futures.as_completed(future_to_docs):
				doc = future_to_docs[future]
				try:
					doc_id = future.result()
				except Exception as exc:
					print('%s generated an exception on doc_id:%s %s' % (self.name, doc_id, exc))
				else:
					print doc
			

	def del_doc():
		pass
		
	def verify_num_docs(count):
		pass

	def verify_doc_revisions(doc_url,num_revision):
		pass

	def __del__(self):
		pass

	def __enter__(self):
		pass

	def __exit__(self):
		pass
