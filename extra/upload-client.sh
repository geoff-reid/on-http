#!/bin/bash
set -ex

#index-servers =
#  pypi
#  pypitest

#[pypi]
#repository=https://pypi.python.org/pypi
#username=
#password=

pwd ~

if [ -f ~/.testfile ]
then
  cat ~/.testfile
else
  touch ~/.testfile
fi

echo "hi" >> ~/.testfile

cat ~/.testfile
