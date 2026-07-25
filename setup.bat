echo 'prepare Windows preinstall'
echo 'Installing Python dependencies for OCR...'
python -m venv .venv
.venv\Scripts\pip install markitdown pypdf pdfminer.six pdfplumber youtube-transcript-api
echo 'Finished installing Python dependencies'
