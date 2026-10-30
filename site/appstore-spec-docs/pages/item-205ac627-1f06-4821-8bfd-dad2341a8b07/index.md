Stax
----

`stax` is an array of named content stacks (HAX elements) users can insert as reusable patterns.

Autoloader
----------

`autoloader` declares custom elements that should be available to HAX. Two formats are supported:

*   An object map: `tagName -> importPath`, or `tagName -> { "import": path, "haxProperties": {...} }` to ship an element's HAX definition over the wire.
*   An array of tag names, each imported from `@haxtheweb/<tag>/<tag>.js`. This is what the HAXcms PHP and Node.js backends emit.

HAXcms filters the autoloader by `settings/enabledBlocks.json` when that file exists.

Integration notes
-----------------

*   Backends can serve appstore payloads from static JSON or dynamic endpoint generation.
*   In HAXCMS, provider search can be brokered through backend endpoints so API keys are not exposed to the browser.
*   For HAXCMS local file integrations, `__HAXAPPENDUPLOADENDPOINT__` and `site_token` are the recognized special values.

Rules for tools and agents writing appstore payloads
----------------------------------------------------

1.  Keep keys at the top level (`status`, `apps`, `stax`, `autoloader`). Custom keys must start with `x-`.
2.  Build URLs the way HAX does: `protocol + "://" + url + "/" + endPoint`. So `connection.url` has no protocol, and `endPoint` has no leading slash.
3.  Never commit real credentials. Use a `{{NAME}}` placeholder the backend fills in, or broker the request through your backend.
4.  Put the text query first in `browse.search`. Only the first key is used.
5.  `resultMap` values are dot paths into each result, including `gizmo.type` and `gizmo.mimetype`. Use `defaultGizmoType` for a fixed type. `preview.title`, `preview.details` and `preview.id` are required.
6.  `add` operations need `acceptsGizmoTypes`, or the app is never offered as an upload target.
7.  Validate with `scripts/validate.js` before shipping a payload.