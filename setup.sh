#!/bin/bash

echo 'prepare Unix preinstall'
echo 'Installing Python dependencies for OCR...'
python3 -m venv .venv
.venv/bin/pip install markitdown pypdf pdfminer.six youtube-transcript-api
echo 'Finished installing Python dependencies'
