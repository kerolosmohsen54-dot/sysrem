@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Python 3 was not found. Install Python 3 and enable the py launcher.
  pause
  exit /b 1
)
start "Precision Slate ERP local server (close this window to stop)" /min py -3 -m http.server 8000 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8000/precision-slate-erp-final__5_%20%281%29.html"
echo The local server is running in its minimized window. Close it to stop the demo.
