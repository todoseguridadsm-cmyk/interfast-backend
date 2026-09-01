@echo off
set "URL=%~1"
powershell -NoProfile -WindowStyle Hidden -Command ^
  "$raw = '%URL%'.Replace('winbox://', ''); "^
  "$parts = $raw -split '\?'; "^
  "$ip = $parts[0].Replace('/', ''); "^
  "if ((-not $ip.Contains(':')) -and ($ip -match '[a-zA-Z]')) { $ip = $ip + ':8293' }; "^
  "$user = 'admin'; $pass = 'Bran5570'; "^
  "if ($parts.Length -gt 1) { "^
  "  $qs = $parts[1] -split '&'; "^
  "  foreach ($q in $qs) { "^
  "    if ($q -match 'user=(.*)') { $user = $matches[1] } "^
  "    if ($q -match 'pass=(.*)') { $pass = $matches[1] } "^
  "  } "^
  "} "^
  "Start-Process -FilePath 'C:\Users\MATIAS BRANDI\Desktop\winBox.exe' -ArgumentList $ip, $user, $pass"