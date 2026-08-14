$migrations = @(
  "001_profiles.sql",
  "002_products.sql", 
  "003_transactions.sql",
  "004_market_data.sql",
  "005_backtests.sql",
  "006_trades.sql",
  "007_carts.sql",
  "008_chat_sessions.sql",
  "009_chat_messages.sql",
  "010_knowledge_documents.sql",
  "011_indexes.sql",
  "012_rls_policies.sql"
)

$migDir = "c:\Users\POOJAN\OneDrive\Desktop\Depstar\Enterprise-Intelligence-Platform-Unified-Analytics-AI-Assistant\supabase\migrations"

foreach ($file in $migrations) {
    $path = Join-Path $migDir $file
    Write-Host "Running $file..."
    & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d postgres -f $path -h 127.0.0.1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR in $file - exit code: $LASTEXITCODE"
        exit 1
    }
    Write-Host "$file completed."
}

Write-Host "All migrations complete!"
