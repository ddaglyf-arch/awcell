@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                  BOT STARTUP SCRIPT                            ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"
echo Diretório: %cd%
echo.

REM ===== VERIFICA NODEJS =====
echo [0/4] Verificando instalação do Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ ERRO: Node.js não está instalado!
    echo.
    echo Por favor, instale Node.js de: https://nodejs.org/
    echo Após instalar, reinicie este script.
    echo.
    pause
    exit /b 1
)
echo ✓ Node.js encontrado: && node --version
echo.

REM ===== VERIFICA PACKAGE.JSON =====
echo [1/4] Verificando estrutura do projeto...
if not exist "package.json" (
    echo.
    echo ❌ ERRO: package.json não encontrado!
    echo.
    pause
    exit /b 1
)
echo ✓ package.json encontrado
echo.

REM ===== INSTALA DEPENDÊNCIAS =====
echo [2/4] Instalando dependências npm...
echo.
if exist "node_modules" (
    echo ✓ node_modules já existe
    echo Atualizando dependências...
    call npm install --verbose
) else (
    echo Aguarde, isso pode levar alguns minutos...
    call npm install
)
if errorlevel 1 (
    echo.
    echo ❌ ERRO ao instalar npm!
    echo.
    pause
    exit /b 1
)
echo ✓ npm instalado/atualizado com sucesso!
echo.

REM ===== COMPILA TYPESCRIPT =====
echo [3/4] Compilando TypeScript...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ ERRO ao compilar TypeScript!
    echo.
    pause
    exit /b 1
)
echo ✓ TypeScript compilado com sucesso!
echo.

REM ===== VERIFICA .ENV =====
echo [4/4] Verificando arquivo .env...
if exist ".env" (
    echo ✓ Arquivo .env já existe
) else (
    echo ⚠️  .env não encontrado!
    echo Certifique-se de configurar as variáveis de ambiente.
)
echo.

REM ===== INICIA O BOT =====
echo ════════════════════════════════════════════════════════════════
echo ✨ Iniciando o bot...
echo ════════════════════════════════════════════════════════════════
echo.

call npm start

REM Se chegou aqui, o bot encerrou
echo.
echo.
echo ════════════════════════════════════════════════════════════════
echo ⚠️  Bot encerrado!
echo ════════════════════════════════════════════════════════════════
echo.
echo Possíveis problemas:
echo - TELEGRAM_BOT_TOKEN inválido no .env
echo - Erro de conexão com Supabase
echo - Falta de variáveis de ambiente
echo.
echo Pressione qualquer tecla para fechar...
pause
exit /b 1
