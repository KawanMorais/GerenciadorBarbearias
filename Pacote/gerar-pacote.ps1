# Gera Pacote\Barbearia-teste.zip: API com .NET embutido + site pronto (só precisa de MySQL).
$ErrorActionPreference = "Stop"
$raiz = Split-Path $PSScriptRoot
$saida = Join-Path $PSScriptRoot "Barbearia-teste"
$zip = Join-Path $PSScriptRoot "Barbearia-teste.zip"

if (Test-Path $saida) { Remove-Item $saida -Recurse -Force }

Write-Host "1/3 Gerando o site (FrontEnd)..." -ForegroundColor Cyan
Push-Location (Join-Path $raiz "FrontEnd")
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install falhou" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build falhou" }
Pop-Location

Write-Host "2/3 Compilando a API (BackEnd)..." -ForegroundColor Cyan
dotnet publish (Join-Path $raiz "BackEnd\BarbeariaApi") -c Release -r win-x64 --self-contained true `
    -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o $saida
if ($LASTEXITCODE -ne 0) { throw "dotnet publish falhou" }

# Fotos locais e config de desenvolvimento ficam de fora.
Get-ChildItem (Join-Path $saida "wwwroot\uploads") -Exclude ".gitkeep" -ErrorAction SilentlyContinue | Remove-Item -Force
Remove-Item (Join-Path $saida "*.pdb"), (Join-Path $saida "appsettings.Development.json") -ErrorAction SilentlyContinue

Copy-Item (Join-Path $raiz "FrontEnd\dist\*") (Join-Path $saida "wwwroot") -Recurse -Force
Copy-Item (Join-Path $PSScriptRoot "Iniciar.bat") $saida
Copy-Item (Join-Path $PSScriptRoot "LEIA-ME.txt") $saida

# Leva junto a conta de e-mail do User Secrets, para o envio funcionar no PC de quem testa.
# Atenção: quem tiver o zip consegue ler essa senha.
$segredos = dotnet user-secrets list --project (Join-Path $raiz "BackEnd\BarbeariaApi")
$usuario = ($segredos | Where-Object { $_ -like "Email:Smtp:Usuario = *" }) -replace "^Email:Smtp:Usuario = ", ""
$senha = ($segredos | Where-Object { $_ -like "Email:Smtp:Senha = *" }) -replace "^Email:Smtp:Senha = ", ""
if ($usuario -and $senha) {
    @{ Email = @{ Smtp = @{ Usuario = $usuario; Senha = $senha } } } | ConvertTo-Json -Depth 5 |
        Set-Content (Join-Path $saida "appsettings.Production.json") -Encoding UTF8
    Write-Host "E-mail real incluído no pacote ($usuario)." -ForegroundColor Yellow
} else {
    Write-Host "Sem e-mail no User Secrets: no pacote os e-mails ficam simulados." -ForegroundColor Yellow
}

Write-Host "3/3 Compactando..." -ForegroundColor Cyan
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $saida "*") -DestinationPath $zip

Write-Host ""
Write-Host "Pronto: $zip" -ForegroundColor Green
Write-Host "Mande esse arquivo para quem vai testar."
