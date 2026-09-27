Add-Type -AssemblyName System.Security

$segura = Read-Host "Cole a chave da IA (Gemini: AIza...  |  Anthropic: sk-ant-...)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($segura)
try {
    $chave = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr).Trim()
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

if ($chave.StartsWith("AIza")) {
    $arquivo = ".gemini-key.dpapi"; $entropia = "lume-gemini-v1"; $nome = "Google Gemini (gratis)"
} elseif ($chave.StartsWith("sk-ant-")) {
    $arquivo = ".anthropic-key.dpapi"; $entropia = "lume-anthropic-v1"; $nome = "Anthropic (Claude)"
} else {
    Write-Host "Nao reconheci a chave. Ela deve comecar com AIza (Gemini) ou sk-ant- (Anthropic). Nada foi salvo." -ForegroundColor Red
    exit 1
}

$cifrada = [Security.Cryptography.ProtectedData]::Protect(
    [Text.Encoding]::UTF8.GetBytes($chave), [Text.Encoding]::UTF8.GetBytes($entropia), "CurrentUser")
$destino = Join-Path (Split-Path $PSScriptRoot -Parent) $arquivo
[IO.File]::WriteAllText($destino, [Convert]::ToBase64String($cifrada))

Write-Host "Chave do $nome salva e criptografada em $arquivo. Reinicie o servidor (npm run dev)." -ForegroundColor Green
