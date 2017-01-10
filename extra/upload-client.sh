#!/bin/bash
set -ex

#PYPI_USER="user"
#PYPI_PASS="password"

cat << EOF > ~/.pypirc
[distutils]
index-servers =
  pypi

[pypi]
repository=https://testpypi.python.org/pypi
username=${PYPI_USER}
password=${PYPI_PASS}
EOF



cat ~/.pypirc
pwd
ls
cd on-http-api1.1

pwd
python setup.py sdist upload

