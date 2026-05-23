@echo off
:: Naviga alla cartella del progetto
cd /d "D:\Progetti\r3e-toolbox"
:: Avvia PowerShell, mantiene la finestra aperta e lancia claude
start /max powershell.exe -NoExit -Command "claude"
