Operations define how HAX talks to a provider. Each app's `connection.operations` object supports a required `browse` operation and an optional `add` operation.

<a11y-collapse heading-button="heading-button"><h2 slot="heading">Common operation fields</h2><div slot="content"><ul><li><strong>method</strong> — HTTP method (<code>GET</code>, <code>POST</code>, etc).</li><li><strong>endPoint</strong> — path appended to <code>connection.url</code> after a <code>/</code> (no leading slash).</li><li><strong>data</strong> — request query values, merged over <code>connection.data</code>.</li><li><strong>resultMap</strong> — path mappings from the provider response into HAX preview/gizmo data.</li></ul></div></a11y-collapse><a11y-collapse heading-button="heading-button"><h2 slot="heading">Browse-only fields</h2><div slot="content"><ul><li><strong>search</strong> — search inputs. Only the first key is used: Merlin's "Search &lt;app title&gt;" command sends the user's text as that query parameter. Further keys, and the legacy <code>format</code> / <code>items</code> / <code>slot</code> / <code>component</code> hints, are not rendered by current HAX, so put fixed filters in <code>data</code>.</li><li><strong>pagination</strong> — <code>{ style: "page" | "offset" | "link", props: {...} }</code>. Stored but not used by any HAX UI today.</li></ul></div></a11y-collapse>

Browse operation
----------------

`browse` is the standard operation for searching and selecting media.

Add operation
-------------

`add` is used for upload/create flows, for example local file upload in HAXCMS integrations.

An `add` operation needs `acceptsGizmoTypes`, or the app is never offered as an upload target. `*` means "files HAX can't classify," not "everything."