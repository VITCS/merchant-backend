REM ECHO OFF
set ROOT=d:\infville\merchant-backend



cmd/c "cd %ROOT%\Store && sam build && sam deploy --config-env dev --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed
cmd/c "cd %ROOT%\StorePayments && sam build && sam deploy --config-env dev --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed
cmd/c "cd %ROOT%\merchantaccount && sam build && sam deploy --config-env dev --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed
cmd/c "cd %ROOT%\MerchantUser && sam build && sam deploy --config-env dev --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed
cmd/c "cd %ROOT%\MerchantUserStore && sam build && sam deploy --config-env dev --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed


cmd/c "cd %ROOT%\merchant-api && sam build && sam deploy --config-env dev --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed


cmd/c "cd %ROOT%\merchant-api\datasources\Store  && sam build -t Store.yaml && sam deploy -t Store.yaml --config-env dev --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed
cmd/c "cd %ROOT%\merchant-api\datasources\StorePayments  && sam build -t StorePayments.yaml && sam deploy -t StorePayments.yaml --config-env dev --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed
cmd/c "cd %ROOT%\merchant-api\datasources\MerchantAccount && sam build -t MerchantAccount.yaml && sam deploy -t MerchantAccount.yaml --config-env dev --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed
cmd/c "cd %ROOT%\merchant-api\datasources\MerchantUser && sam build -t MerchantUser.yaml && sam deploy -t MerchantUser.yaml --config-env dev --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed
cmd/c "cd %ROOT%\merchant-api\datasources\MerchantUserStore && sam build -t MerchantUserStore.yaml && sam deploy -t MerchantUserStore.yaml --config-env dev --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed


cmd/c "cd %ROOT%\merchant-api\datasources\Store  && sam build -t Store_dep.yaml && sam deploy -t Store_dep.yaml --config-env devdep --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed
cmd/c "cd %ROOT%\merchant-api\datasources\StorePayments  && sam build -t StorePayments_dep.yaml && sam deploy -t StorePayments_dep.yaml --config-env devdep --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed
cmd/c "cd %ROOT%\merchant-api\datasources\MerchantAccount && sam build -t MerchantAccount_dep.yaml && sam deploy -t MerchantAccount_dep.yaml --config-env devdep --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed
cmd/c "cd %ROOT%\merchant-api\datasources\MerchantUser && sam build -t MerchantUser_dep.yaml && sam deploy -t MerchantUser_dep.yaml --config-env devdep --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed
cmd/c "cd %ROOT%\merchant-api\datasources\MerchantUserStore && sam build -t MerchantUserStore_dep.yaml && sam deploy -t MerchantUserStore_dep.yaml --config-env devdep --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed

:completed
echo %ERRORLEVEL%
cd %ROOT%
EXIT /B %ERRORLEVEL%

