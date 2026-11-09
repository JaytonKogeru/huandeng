Option Explicit
Dim shell, command, index, value, result
If WScript.Arguments.Count <> 3 Then WScript.Quit 2
Set shell = CreateObject("WScript.Shell")
shell.Environment("Process")("ELECTRON_RUN_AS_NODE") = "1"
command = ""
For index = 0 To 2
  value = WScript.Arguments(index)
  If InStr(value, Chr(34)) > 0 Then WScript.Quit 2
  If index = 2 Then command = command & " --config"
  command = command & " " & Chr(34) & value & Chr(34)
Next
On Error Resume Next
result = shell.Run(Trim(command), 0, True)
If Err.Number <> 0 Then WScript.Quit 1
WScript.Quit result
