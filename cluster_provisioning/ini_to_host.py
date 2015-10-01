import sys
from optparse import OptionParser

def main():
    # this program consumes existing .ini files and outputs a host file that is readable by ansible
    usage = "usage: python init_to_host.py -i <ini_file> -h <host_file>"
    parser = OptionParser(usage=usage)

    parser.add_option(
        "-i", "--ini-file",
        action="store",
        type="string",
        dest="ini_file",
        help=".ini file to convert"
    )

    parser.add_option(
        "-h", "--host-file",
        action="store",
        type="string",
        dest="host_file",
        help="name of hostfile to output"
    )

    cmd_args = sys.argv[1:]
    (opts, args) = parser.parse_args(cmd_args)

    ini_file = opts.ini_file
    host_file = opts.host_file



if __name__ == "__main__":
    main()