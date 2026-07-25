#!/bin/bash

echo 'prepare Unix preinstall'
echo 'Installing Python dependencies for OCR and Audio...'
python3 -m venv .venv
.venv/bin/pip install markitdown pypdf pdfminer.six pdfplumber SpeechRecognition imageio-ffmpeg youtube-transcript-api
echo 'Finished installing Python dependencies'
