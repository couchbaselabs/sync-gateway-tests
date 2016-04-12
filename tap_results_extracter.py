import re
import unittest
import sys
import argparse
import os
import urllib2
import xmlrunner


class TestSequence(unittest.TestCase):
    pass

def test_generator(b):
    def test(self):
        self.assertTrue(b)
    return test

def tap_it(file):
    tests_count = 0
    tests_passed = 0
    tests_failed = 0

    with open (file, 'r') as f:
        content = f.read()

    match_objects = re.findall(r"^\d+\.+\d+\n+#\s+tests\s+(\d+)\n#\s+pass\s+(\d+)",content,re.MULTILINE)

    for obj in match_objects:
        tests_count += int(obj[0])
        tests_passed += int(obj[1]) 
        print obj

    tests_failed = tests_count - tests_passed
    print "Total sets:",len(match_objects)
    print "Total tests count:",tests_count
    print "Total tests passed:", tests_passed
    print "Total tests failed:", tests_failed

    for t in xrange(0, tests_passed):
        test_name = 'test_pass_%s' % t
        test = test_generator(True)
        setattr(TestSequence, test_name, test)

    for t in range(0, tests_failed):
        test_name = 'test_failed_%s' % t
        test = test_generator(False)
        setattr(TestSequence, test_name, test)

    del sys.argv[1:]    
    unittest.main(testRunner=xmlrunner.XMLTestRunner(output='test-reports'))



# Usage: python tap_results_extracter.py mobile_results.log 

if len(sys.argv) != 2:
    print "Usage tap_results_extractor.py results.tap"
    exit(1)


tap_it(file=sys.argv[1])
