# GAP-0022 button routing record

Every visible reference navigation item now resolves to a permission-gated route. Data import, daily summary, backups, notifications, global search, recycle-bin actions, and PWA installation have working destinations and API behavior.

Removed the old disabled navigation placeholders from the sidebar. The separate “financial reports” placeholder was a duplicate entry: the report center and its financial-report card already provide the real destination at `/reports/financial`. The data placeholders now point to `/data/import` and `/data/daily-summary`.

No restore action is exposed for database backups. This follows the default restore policy in GAP-0018; the recycle bin has its own confirmed restore and permanent-delete operations.
