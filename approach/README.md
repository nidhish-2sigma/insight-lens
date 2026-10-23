# Approach

How pages of the mock can be worked out from the database: what each needs and why, the SQL, and how well it does on the real class the mock uses (section 218). Each folder holds a summary, the data sources, the method, the schemas, the evaluation, the SQL, and a backtest that reruns every number.

| Folder | Page | What it covers |
|---|---|---|
| [on-pace/](on-pace/README.md) | On pace | "Will each student reach the target unit's key skills by the goal date?" A projection method that misses by about half as much as the page's today, and why. |
| [drifting/](drifting/README.md) | Drifting | "Who is drifting, and since when?" The page's rule as SQL, checked against the page on every day of the term, how it behaved, and one proposed fix. |
