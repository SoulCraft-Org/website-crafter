# Page roles

Copy this file into your site repo, such as `docs/page-roles.md`, and keep one row per page. The craft-site skill's rule 1: each page has one role and one signature move, written down before its layout. The four example rows show the shape; replace them with your pages.

| Page | Path | Who arrives | Role, in one line | Signature move | Guarded by |
| --- | --- | --- | --- | --- | --- |
| Home | `/` | A stranger from a link | Learns what this is, and where next | One hero that shows it working | All four page tests |
| Product | `/product/` | A buyer comparing options | Decides whether this product fits | One live demo of the product | `budget`, `motion` |
| Pricing | `/pricing/` | A buyer ready to choose | Compares the plans and picks one | One comparison table | `words` |
| Guide | `/guide/` | A user with a task | Finishes the task | One example they can copy and run | `words` |

| Column | Write |
| --- | --- |
| Who arrives | The visitor and where they came from |
| Role | What they leave with, in one line |
| Signature move | The one thing they remember. A second move gets its own page |
| Guarded by | The page tests that open it: list its path in `PAGES` in `tests/e2e/site.ts` |

A page whose role you cannot write in one line is two pages, or none.
