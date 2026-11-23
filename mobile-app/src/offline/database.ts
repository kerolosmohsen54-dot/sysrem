import { open } from 'react-native-nitro-sqlite';
import { SqliteOutboxStore } from './outbox';

const database = open({ name: 'erp-companion.sqlite' });
export const outboxStore = new SqliteOutboxStore(database);
