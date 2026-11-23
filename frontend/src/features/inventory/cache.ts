import type { QueryClient } from '@tanstack/react-query';

/** Refresh every projection and list that can change after a stock posting. */
export function invalidateInventoryQueries(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ['/inventory'] }),
    client.invalidateQueries({ queryKey: ['/inventory/balances'] }),
    client.invalidateQueries({ queryKey: ['/inventory/summary'] }),
    client.invalidateQueries({ queryKey: ['/inventory/movements'] }),
    client.invalidateQueries({ queryKey: ['/inventory/returns'] }),
    client.invalidateQueries({ queryKey: ['/inventory/minimum-stock'] }),
    client.invalidateQueries({ queryKey: ['/inventory/counts'] }),
    client.invalidateQueries({ queryKey: ['/products'] }),
    client.invalidateQueries({ queryKey: ['/warehouses'] }),
    client.invalidateQueries({ queryKey: ['/warehouse-returns'] }),
    client.invalidateQueries({ queryKey: ['/warehouse-returns/candidates'] }),
  ]);
}
