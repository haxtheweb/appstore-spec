appstore-spec documents the HAX appstore specification: the schema that defines external media providers, upload targets, reusable stax templates, and autoloaded elements for the HAX editor.

An appstore payload is typically returned by a backend endpoint (for example `generateAppStore`) or loaded from a static JSON file. HAX reads these keys at the top level via `HaxStore._loadAppStoreData` in webcomponents `elements/hax-body/lib/hax-store.js`. A payload wrapped in `{ "data": { ... } }` is ignored.

Root structure
--------------

An appstore payload usually looks like:

<a11y-collapse heading-button="heading-button"><h2 slot="heading">Top-level keys</h2><div slot="content"><ul><li><strong>status</strong> — numeric status code (typically <code>200</code>).</li><li><strong>apps</strong> — array of app provider definitions (<code>hax-app</code> data).</li><li><strong>stax</strong> — array of reusable content stacks (<code>hax-stax</code> data).</li><li><strong>autoloader</strong> — object or array of custom element imports to preload.</li></ul></div></a11y-collapse>

`example.json` in the repository has a representative payload derived from current HAX integrations, and the `examples/` directory has more, including an `invalid/` subfolder of mistakes the validator catches.

Machine-readable schema and validation
--------------------------------------

`schema/appstore.schema.json` is JSON Schema draft 2020-12 with the behavior notes in this documentation embedded as descriptions. `scripts/validate.js` adds checks a schema cannot express, including:

*   credentials committed in `data` / `headers`
*   `search` keys HAX ignores
*   select options that all share one value
*   `gizmo.type` written as a literal instead of a path
*   `_url_source` without a `gizmo.id`
*   duplicate app titles

From npm, without installing anything:

From a clone of this repository: