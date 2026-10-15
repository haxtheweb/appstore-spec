# appstore-spec
Documentation for the HAX appstore specification, the schema that defines external media providers, upload targets, reusable stax templates, and autoloaded elements for the HAX editor.

The appstore spec is typically returned by a backend endpoint (for example `generateAppStore`) or loaded from a static JSON file.

An appstore payload usually looks like:

- `status` - numeric status code (typically `200`)
- `apps` - array of app provider definitions (`hax-app` data)
- `stax` - array of reusable content stacks (`hax-stax` data)
- `autoloader` - object or array of custom element imports to preload

HAX reads these keys at the top level (`HaxStore._loadAppStoreData` in webcomponents `elements/hax-body/lib/hax-store.js`). A payload wrapped in `{ "data": { ... } }` is ignored.

`example.json` has a representative payload derived from current HAX integrations, and [`examples/`](examples) has more.

## Machine-readable schema and validation

[`schema/appstore.schema.json`](schema/appstore.schema.json) is JSON Schema draft 2020-12 with the behavior notes below embedded as descriptions. `scripts/validate.js` adds checks a schema cannot express:
- credentials committed in `data` / `headers`
- `search` keys HAX ignores
- select options that all share one value
- `gizmo.type` written as a literal instead of a path
- `_url_source` without a `gizmo.id`
- duplicate app titles

From npm (no install needed):

```bash
npx -p @haxtheweb/appstore-spec appstore-validate path/to/appstore.json
```

From a clone:

```bash
npm install
node scripts/validate.js example.json examples/*.json
node scripts/validate.js --json path/to/appstore.json
npm test
```

## Rules for tools and agents writing appstore payloads

1. **Keep keys at the top level** (`status`, `apps`, `stax`, `autoloader`). Custom keys must start with `x-`.
2. **Build URLs the way HAX does:** `protocol + "://" + url + "/" + endPoint`. So `connection.url` has no protocol, and `endPoint` has no leading slash.
3. **Never commit real credentials.** Use a `{{NAME}}` placeholder the backend fills in, or broker the request through your backend (HAXcms does this). `site_token` in `data` is sent as the `X-HAXCMS-Site-Token` header, and a HAXcms session JWT is added as `Authorization: Bearer` automatically.
4. **Put the text query first in `browse.search`.** Only the first key is used: Merlin sends what the user types as that parameter. Fixed filters belong in `data`.
5. **`resultMap` values are dot paths into each result**, including `gizmo.type` and `gizmo.mimetype`. Use `defaultGizmoType` for a fixed type. `preview.title`, `preview.details` and `preview.id` are required.
6. **`add` operations need `acceptsGizmoTypes`**, or the app is never offered as an upload target. `*` means "files HAX can't classify", not "everything".
7. **Validate** with `scripts/validate.js` before shipping a payload.

# Breaking down pieces of the specification

## Root structure
```json
{
  "status": 200,
  "apps": [],
  "stax": [],
  "autoloader": {}
}
```

## Apps
Each item in `apps` is a provider definition with `details` and `connection`.

### `details`
- `title` - provider display label
- `icon` - icon used in HAX UI
- `color` - accent color for provider card
- `author` - provider owner / source
- `description` - short description shown in UI
- `status` - provider state (commonly `available`)
- `tags` - searchable categorization terms
- `tos` - optional terms / policy links

### `connection`
- `protocol` - `http` or `https`
- `url` - provider host and base path, **without** the protocol
- `headers` - optional request headers
- `data` - default query values sent with every operation (see [Special request values](#special-request-values))
- `auto` - optional boolean, default `true`: run the browse request as soon as the app is activated
- `operations` - `browse` (required) and optionally `add`. HAX does not read any other operation names.

When the HAXcms platform setting disables `onlineMedia`, only apps with an `add` operation are loaded.

```json
{
  "details": {
    "title": "Youtube",
    "icon": "mdi-social:youtube",
    "color": "red",
    "author": "Google, Youtube LLC",
    "description": "The most popular online video sharing and remix site.",
    "status": "available",
    "tags": ["video"]
  },
  "connection": {
    "protocol": "https",
    "url": "www.googleapis.com/youtube/v3",
    "data": {
      "key": "{{YOUTUBE_API_KEY}}"
    },
    "operations": {}
  }
}
```

## Operations
Operations define how HAX talks to a provider.

### Common operation fields
- `method` - HTTP method (`GET`, `POST`, etc)
- `endPoint` - path appended to `connection.url` after a `/` (no leading slash)
- `data` - request query values, merged over `connection.data`
- `resultMap` - path mappings from provider response into HAX preview/gizmo data

### Browse-only fields
- `search` - search inputs. **Only the first key is used**: Merlin's "Search <app title>" command sends the user's text as that query parameter. Further keys, and the legacy `format` / `items` / `slot` / `component` hints, are not rendered by current HAX, so put fixed filters in `data`.
- `pagination` - `{ style: "page" | "offset" | "link", props: {...} }`. Stored but not used by any HAX UI today.

### Browse operation
`browse` is the standard operation for searching/selecting media.

```json
{
  "browse": {
    "method": "GET",
    "endPoint": "search",
    "pagination": {
      "style": "page",
      "props": {
        "previous": "prevPageToken",
        "next": "nextPageToken",
        "total_items": "pageInfo.totalResults"
      }
    },
    "search": {
      "q": {
        "title": "Search",
        "type": "string"
      }
    },
    "data": {
      "part": "snippet",
      "type": "video",
      "maxResults": "20"
    },
    "resultMap": {
      "defaultGizmoType": "video",
      "items": "items",
      "preview": {
        "title": "snippet.title",
        "details": "snippet.description",
        "image": "snippet.thumbnails.default.url",
        "id": "id.videoId"
      },
      "gizmo": {
        "title": "snippet.title",
        "description": "snippet.description",
        "id": "id.videoId",
        "_url_source": "https://www.youtube.com/watch?v=<%= id %>",
        "caption": "snippet.description",
        "citation": "snippet.channelTitle"
      }
    }
  }
}
```

### Add operation
`add` is used for upload/create flows (for example local file upload in HAXCMS integrations).

```json
{
  "add": {
    "method": "POST",
    "endPoint": "system/saveFile",
    "acceptsGizmoTypes": ["image", "video", "audio", "pdf", "svg", "document", "csv"],
    "resultMap": {
      "item": "data.file",
      "defaultGizmoType": "image",
      "gizmo": {
        "source": "url",
        "id": "uuid"
      }
    }
  }
}
```

## `resultMap` conventions
`resultMap` maps upstream API response data into HAX item previews and final gizmo values.

- `items` - dot path to the array of result records. If it doesn't resolve, the whole response is used as the array.
- `preview` - fields shown in result cards: `title`, `details` (HTML stripped) and `id` are required; `image` is optional, with `resultMap.image` as a fixed fallback.
- `gizmo` - target value -> dot path. These become the inserted element's properties via `guessGizmo`.
- `defaultGizmoType` - gizmo type for every result (`image`, `video`, `audio`, `pdf`, `document`, `content`, `wikipedia`, ...).
- `gizmo.type` / `gizmo.mimetype` - **paths** whose resolved value picks the gizmo type per result (e.g. `"type": "data.0.media_type"`). Writing `"type": "video"` looks up `result.video`.
- `_url_source` - URL template; the first `<%= id %>` is replaced by the mapped `gizmo.id`, and the result becomes `source` and `url`.
- Split rule: any `preview` or `gizmo` value can be `{ "property": "uri", "op": "split", "delimiter": "/", "position": 2 }` to take one piece of a string (see [`examples/split-id.json`](examples/split-id.json)).
- `add` result maps use `item` (path to the uploaded record, e.g. `data.file`) instead of `items`.

## Special request values
- `site_token` / `siteToken` in `data` - sent as the `X-HAXCMS-Site-Token` header, never in the query string.
- `__HAXAPPENDUPLOADENDPOINT__: true` - prepends `HaxStore.connectionRewrites.appendUploadEndPoint` to the query (HAXcms local files).
- Array values repeat the parameter; `null` sends the bare key.
- A HAXcms session JWT, when present, is sent as `Authorization: Bearer <jwt>` unless you set `Authorization` yourself. (The older `__HAXJWT__` placeholder is no longer read.)

## Stax
`stax` is an array of named content stacks (HAX elements) users can insert as reusable patterns.

```json
{
  "details": {
    "title": "Two column Article",
    "author": "HAXTheWeb core team",
    "description": "Content with media to right",
    "status": "available",
    "tags": ["media"]
  },
  "stax": [
    {
      "tag": "grid-plate",
      "properties": {
        "layout": "2-1"
      },
      "content": "<p slot=\"col-1\">Example text</p><media-image slot=\"col-2\" source=\"https://example.org/image.jpg\"></media-image>"
    }
  ]
}
```

## Autoloader
`autoloader` declares custom elements that should be available to HAX.

Supported formats:
- object map: `tagName -> importPath`, or `tagName -> { "import": path, "haxProperties": {...} }` to ship an element's HAX definition over the wire
- array of tag names, each imported from `@haxtheweb/<tag>/<tag>.js`. This is what the HAXcms PHP and Node.js backends emit.

HAXcms filters the autoloader by `settings/enabledBlocks.json` when that file exists.

```json
{
  "autoloader": {
    "media-image": "@haxtheweb/media-image/media-image.js",
    "video-player": "@haxtheweb/video-player/video-player.js",
    "grid-plate": "@haxtheweb/grid-plate/grid-plate.js"
  }
}
```

## Integration notes
- Backends can serve appstore payloads from static JSON or dynamic endpoint generation.
- In HAXCMS, provider search can be brokered through backend endpoints so API keys are not exposed to the browser.
- For HAXCMS local file integrations, `__HAXAPPENDUPLOADENDPOINT__` and `site_token` are the recognized special values (see [Special request values](#special-request-values)).
