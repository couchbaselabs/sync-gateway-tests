import unittest
import xmlrunner

class TestSequence(unittest.TestCase):
    pass

def test_generator(b):
    def test(self):
        self.assertTrue(b)
    return test

def tap_junit_xml():
    with open("results.tap", "r") as f:
        lines = f.readlines()

        for line in lines:

            if line.startswith("not ok"):
                print("TEST FAILURES!!!")
                print(line)

            if line.startswith("total"):
                total_results = line.split()[2]
                print(total_results)
                total_parts = total_results.split("/")

                total_tests = int(total_parts[1])
                passed = int(total_parts[0])
                failed = total_tests - passed

                print("TOTAL: {}".format(total_tests))
                print("PASSED: {}".format(passed))
                print("FAILED: {}".format(failed))

                for t in xrange(0, passed):
                    test_name = 'test_pass_%s' % t
                    test = test_generator(True)
                    setattr(TestSequence, test_name, test)

                for t in range(0, failed):
                    test_name = 'test_failed_%s' % t
                    test = test_generator(False)
                    setattr(TestSequence, test_name, test)

                unittest.main(testRunner=xmlrunner.XMLTestRunner(output='test-reports'))


if __name__ == '__main__':
    tap_junit_xml()