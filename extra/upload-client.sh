#!/bin/bash
set -ex

#PYPI_USER="user"
#PYPI_PASS="password"

cat << EOF > ~/.testfile3
index-servers =
  pypi
  pypitest

[pypi]
repository=https://pypi.python.org/pypi
username=${PYPI_USER}
password=${PYPI_PASS}
EOF



cat ~/.testfile3
