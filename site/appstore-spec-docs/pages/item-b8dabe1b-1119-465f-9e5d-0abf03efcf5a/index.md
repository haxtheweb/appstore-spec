`resultMap` maps upstream API response data into HAX item previews and final gizmo values.

<a11y-collapse heading-button="heading-button"><h2 slot="heading">resultMap fields</h2><div slot="content"><ul><li><strong>items</strong> — dot path to the array of result records. If it doesn't resolve, the whole response is used as the array.</li><li><strong>preview</strong> — fields shown in result cards: <code>title</code>, <code>details</code> (HTML stripped) and <code>id</code> are required; <code>image</code> is optional, with <code>resultMap.image</code> as a fixed fallback.</li><li><strong>gizmo</strong> — target value to dot path mappings. These become the inserted element's properties via <code>guessGizmo</code>.</li><li><strong>defaultGizmoType</strong> — gizmo type for every result (<code>image</code>, <code>video</code>, <code>audio</code>, <code>pdf</code>, <code>document</code>, <code>content</code>, <code>wikipedia</code>, ...).</li><li><strong>gizmo.type</strong> / <strong>gizmo.mimetype</strong> — <em>paths</em> whose resolved value picks the gizmo type per result (e.g. <code>"type": "data.0.media_type"</code>). Writing <code>"type": "video"</code> looks up <code>result.video</code> instead of using the literal.</li><li><strong>_url_source</strong> — URL template; the first <code>&lt;%= id %&gt;</code> is replaced by the mapped <code>gizmo.id</code>, and the result becomes <code>source</code> and <code>url</code>.</li></ul></div></a11y-collapse>

Any `preview` or `gizmo` value can use the split rule to take one piece of a string:

See `examples/split-id.json` in the repository for a full working example.

`add` result maps use `item` (a path to the uploaded record, e.g. `data.file`) instead of `items`.

Special request values
----------------------

<a11y-collapse heading-button="heading-button"><h2 slot="heading">Recognized special values</h2><div slot="content"><ul><li><strong>site_token</strong> / <strong>siteToken</strong> in <code>data</code> — sent as the <code>X-HAXCMS-Site-Token</code> header, never in the query string.</li><li><strong>__HAXAPPENDUPLOADENDPOINT__: true</strong> — prepends <code>HaxStore.connectionRewrites.appendUploadEndPoint</code> to the query (used for HAXcms local files).</li><li>Array values repeat the parameter; <code>null</code> sends the bare key.</li><li>A HAXcms session JWT, when present, is sent as <code>Authorization: Bearer &lt;jwt&gt;</code> unless you set <code>Authorization</code> yourself. The older <code>__HAXJWT__</code> placeholder is no longer read.</li></ul></div></a11y-collapse>