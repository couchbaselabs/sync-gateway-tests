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

                results = '<testsuites tests="{}" failures="{}" disabled="0" errors="0" time="1" name="AllTests"></testsuites>'.format(
                    total_tests,
                    failed
                )

                with open("results.xml", "w") as f:
                    f.write(results)


if __name__ == '__main__':
    tap_junit_xml()