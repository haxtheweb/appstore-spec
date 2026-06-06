# appstore-spec
Documentation for the HAX appstore specification, the schema that defines external media providers, upload targets, reusable stax templates, and autoloaded elements for the HAX editor.

The appstore spec is typically returned by a backend endpoint (for example `generateAppStore`) or loaded from a static JSON file.

An appstore payload usually looks like:

- `status` - numeric status code (typically `200`)
- `apps` - array of app provider definitions (`hax-app` data)
- `stax` - array of reusable content stacks (`hax-stax` data)
- `autoloader` - object or array of custom element imports to preload

`example.json` has a representative payload derived from current HAX integrations.

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
- `url` - provider host
- `headers` - optional request headers
- `data` - default query/body values
- `operations` - map of operation definitions (`browse`, `add`, optionally `read`, `edit`, `delete`)

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
- `endPoint` - endpoint path appended to `connection.url`
- `pagination` - paging style and response mappings
- `search` - searchable form fields exposed in HAX
- `data` - default request payload/query values
- `resultMap` - path mappings from provider response into HAX preview/gizmo data

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

- `items` - path to array of result records
- `preview` - fields shown in listing UI (`title`, `details`, `image`, `id`)
- `gizmo` - fields used when inserting selected media into content
- `_url_source` - templated URL composition using `<%= id %>` style replacement

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
- object map (`tagName -> importPath`)
- array of tag names (legacy format)

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
- For HAXCMS local file integrations, values like `__HAXJWT__` and `__HAXAPPENDUPLOADENDPOINT__` are recognized conventions used by upload/list operations.
