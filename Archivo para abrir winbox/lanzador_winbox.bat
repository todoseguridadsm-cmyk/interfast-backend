@echo off
set "URL=%~1"
set "IP=%URL:winbox://=%"
set "IP=%IP:/=%"
start "" "C:\Users\MATIAS BRANDI\Desktop\winBox.exe" %IP% admin Bran5570