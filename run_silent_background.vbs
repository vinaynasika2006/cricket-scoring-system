Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory & "\run_cricket_scorer.bat"
WshShell.Run chr(34) & strPath & chr(34), 0, False
Set WshShell = Nothing
