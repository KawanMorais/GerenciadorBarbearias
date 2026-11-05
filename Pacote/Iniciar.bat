@echo off
chcp 65001 >nul
title Na Régua - versão de teste
cd /d "%~dp0"

echo ==================================================
echo   Na Régua - versão de teste
echo ==================================================
echo.
echo O MySQL 8 precisa estar instalado e rodando (porta 3306).
echo O banco "barbearia" é criado sozinho na primeira vez.
echo.
set "SENHA="
set /p "SENHA=Digite a senha do usuário root do MySQL e aperte Enter: "

rem Configuração só desta janela: nada fica gravado no computador.
set "ConnectionStrings__Banco=Server=localhost;Port=3306;Database=barbearia;User=root;Password='%SENHA%';"
for /f %%c in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')"') do set "Jwt__Chave=%%c"
set "SENHA="
set "ASPNETCORE_URLS=http://localhost:5222"
set "FrontEndUrl=http://localhost:5222"
set "CriarDadosDemo=true"
set "Backup__Ativo=false"

echo.
echo Iniciando... o site abre sozinho no navegador em alguns segundos.
echo Para encerrar, feche esta janela.
echo.
echo Login de teste da barbearia: demo@barbearia.com / demo1234
echo.
start "" cmd /c "timeout /t 6 >nul & start http://localhost:5222"
BarbeariaApi.exe

echo.
echo O programa parou.
echo Se apareceu "Access denied", a senha do MySQL estava errada: abra o Iniciar.bat de novo.
echo Se apareceu "Unable to connect", o MySQL não está rodando (Serviços do Windows, MySQL80, Iniciar).
pause
