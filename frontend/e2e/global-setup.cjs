/* global require, module, process */
/* eslint-disable @typescript-eslint/no-require-imports */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

module.exports = async function globalSetup() {
  const backend = path.resolve(process.cwd(), '../backend');
  const phpBinary = process.env.PHP83_BIN || 'php';
  const environment = {
    ...process.env,
    DB_CONNECTION: 'mysql_test',
    DB_TEST_DATABASE: 'erp_acceptance_tests',
    DB_DATABASE: 'erp_acceptance_tests',
  };
  const seed = (seeder, prefix, target) => {
    const output = execFileSync(
      phpBinary,
      ['artisan', 'db:seed', `--class=Database\\Seeders\\${seeder}`, '--no-interaction'],
      { cwd: backend, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], env: environment },
    );
    const fixtureLine = output.split(/\r?\n/).find((line) => line.startsWith(`${prefix}=`));
    if (!fixtureLine) throw new Error(`${seeder} did not emit fixture IDs.`);
    process.env[target] = fixtureLine.slice(prefix.length + 1);
  };

  seed('OrderReservationAcceptanceSeeder', 'RESERVATION_E2E_FIXTURE', 'RESERVATION_E2E_FIXTURE');
  seed('SalesWorkflowAcceptanceSeeder', 'SALES_E2E_FIXTURE', 'SALES_E2E_FIXTURE');
  seed('AccountingAcceptanceSeeder', 'ACCOUNTING_E2E_FIXTURE', 'ACCOUNTING_E2E_FIXTURE');
  seed('FinanceWorkflowAcceptanceSeeder', 'FINANCE_E2E_FIXTURE', 'FINANCE_E2E_FIXTURE');
  seed('CustomerWorkflowAcceptanceSeeder', 'CUSTOMER_E2E_FIXTURE', 'CUSTOMER_E2E_FIXTURE');
  seed('InventoryWorkflowAcceptanceSeeder', 'INVENTORY_E2E_FIXTURE', 'INVENTORY_E2E_FIXTURE');
};
