#!/usr/bin/env node
/**
 * Validate HAX appstore payloads (apps, stax, autoloader).
 *
 * Usage:
 *   node scripts/validate.js [--json] [--strict] <appstore.json> [...]
 *
 * --json    machine-readable report (one object per file)
 * --strict  treat warnings as errors
 * Exit code: 0 when every file is valid, 1 otherwise.
 */
const fs = require('fs')
const path = require('path')
const Ajv2020 = require('ajv/dist/2020')

const SCHEMA = path.join(__dirname, '..', 'schema', 'appstore.schema.json')
const GIZMO_TYPES = new Set(['image', 'video', 'audio', 'pdf', 'svg', 'document', 'csv', 'content', 'wikipedia', 'archive', 'markdown', 'html', 'text', 'link', 'gif', 'media'])
const SECRET_KEY = /(^|_)(key|api_?key|token|access_?token|secret|client_?secret|password)$/i
const PLACEHOLDER = /^\{\{[A-Z0-9_]+\}\}$|^__HAX[A-Z]+__$/

function buildValidator () {
  const ajv = new Ajv2020({ allErrors: true, strict: false })
  return ajv.compile(JSON.parse(fs.readFileSync(SCHEMA, 'utf8')))
}

function formatAjv (errors) {
  const out = []
  const seen = new Set()
  for (const e of errors || []) {
    if (['oneOf', 'anyOf', 'allOf', 'if'].includes(e.keyword)) continue
    let msg = e.message
    if (e.params && e.params.additionalProperty) msg += ` ("${e.params.additionalProperty}"; prefix custom keys with "x-")`
    if (e.params && e.params.allowedValues) msg += `: ${e.params.allowedValues.join(', ')}`
    if (/\/endPoint$/.test(e.instancePath) && e.keyword === 'pattern') msg = 'endPoint must not start with "/" (HAX joins url + "/" + endPoint, giving "//")'
    if (/\/connection\/url$/.test(e.instancePath) && e.keyword === 'pattern') msg = 'url must not include the protocol; set it in connection.protocol'
    if (/\/_url_source$/.test(e.instancePath) && e.keyword === 'pattern') msg = '_url_source needs a "<%= id %>" placeholder'
    const key = `${e.instancePath}|${msg}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ path: e.instancePath || '/', message: msg })
  }
  return out
}

function secretWarnings (data, at) {
  const warnings = []
  if (!data || typeof data !== 'object') return warnings
  for (const [k, v] of Object.entries(data)) {
    if (SECRET_KEY.test(k) && typeof v === 'string' && v.trim() !== '' && !PLACEHOLDER.test(v)) {
      warnings.push({ path: `${at}/${k}`, message: 'looks like a real credential; use a "{{NAME}}" placeholder filled server-side, or broker the request through your backend' })
    }
  }
  return warnings
}

function behaviorChecks (doc) {
  const warnings = []
  if (!doc || typeof doc !== 'object') return warnings
  if (doc.data && typeof doc.data === 'object' && !doc.apps && !doc.autoloader) {
    warnings.push({ path: '/data', message: 'HAX reads apps / stax / autoloader at the top level; a "data" wrapper is ignored' })
  }
  const titles = new Map()
  ;(Array.isArray(doc.apps) ? doc.apps : []).forEach((app, i) => {
    const at = `/apps/${i}`
    if (!app || typeof app !== 'object') return
    const title = app.details && app.details.title
    if (typeof title === 'string') {
      const k = title.toLowerCase()
      if (titles.has(k)) warnings.push({ path: `${at}/details/title`, message: `"${title}" repeats app ${titles.get(k)}; Merlin search paths use the lowercased title, so titles must be unique` })
      else titles.set(k, i)
    }
    const c = app.connection || {}
    warnings.push(...secretWarnings(c.data, `${at}/connection/data`))
    warnings.push(...secretWarnings(c.headers, `${at}/connection/headers`))
    const ops = c.operations || {}
    for (const [opName, op] of Object.entries(ops)) {
      if (!op || typeof op !== 'object') continue
      const oat = `${at}/connection/operations/${opName}`
      warnings.push(...secretWarnings(op.data, `${oat}/data`))
      if (op.search && typeof op.search === 'object') {
        const keys = Object.keys(op.search)
        if (keys.length > 1) {
          warnings.push({ path: `${oat}/search`, message: `HAX only uses the first search key ("${keys[0]}") as the query; ${keys.slice(1).map((k) => `"${k}"`).join(', ')} ${keys.length > 2 ? 'are' : 'is'} ignored (move fixed values into data)` })
        }
        for (const [k, f] of Object.entries(op.search)) {
          if (!f || typeof f !== 'object') continue
          const opts = Array.isArray(f.items) ? f.items : Array.isArray(f.slot) ? f.slot : null
          if (opts) {
            const values = opts.map((o) => (o && typeof o === 'object' ? o.value : o))
            if (new Set(values).size !== values.length) warnings.push({ path: `${oat}/search/${k}`, message: 'select options repeat the same value (e.g. every option is "value"); each option needs a distinct value' })
          }
        }
      }
      const rm = op.resultMap || {}
      const g = rm.gizmo || {}
      if (typeof g.type === 'string' && GIZMO_TYPES.has(g.type)) {
        warnings.push({ path: `${oat}/resultMap/gizmo/type`, message: `gizmo.type is a path into each result, not a literal; "${g.type}" resolves to result.${g.type}. Use defaultGizmoType for a fixed type` })
      }
      if (typeof g._url_source === 'string' && (g._url_source.match(/<%= id %>/g) || []).length > 1) {
        warnings.push({ path: `${oat}/resultMap/gizmo/_url_source`, message: 'only the first "<%= id %>" is replaced' })
      }
      if (typeof g._url_source === 'string' && typeof g.id === 'undefined') {
        warnings.push({ path: `${oat}/resultMap/gizmo`, message: '_url_source needs gizmo.id to fill "<%= id %>"' })
      }
    }
  })
  ;(Array.isArray(doc.stax) ? doc.stax : []).forEach((s, i) => {
    ;((s && Array.isArray(s.stax)) ? s.stax : []).forEach((el, j) => {
      if (!el || !el.properties) return
      for (const k of Object.keys(el.properties)) {
        if (/^on[a-z]+$/i.test(k)) warnings.push({ path: `/stax/${i}/stax/${j}/properties/${k}`, message: 'event-handler attributes are stripped on insert' })
      }
    })
  })
  return warnings
}

function validateDoc (doc, validate) {
  validate(doc)
  return { errors: formatAjv(validate.errors), warnings: behaviorChecks(doc) }
}

function main (argv) {
  const args = argv.slice(2)
  let asJson = false
  let strict = false
  const files = []
  for (const a of args) {
    if (a === '--json') asJson = true
    else if (a === '--strict') strict = true
    else if (a === '-h' || a === '--help') {
      console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0])
      return 0
    } else files.push(a)
  }
  if (!files.length) {
    console.error('usage: validate.js [--json] [--strict] <appstore.json> [...]')
    return 2
  }
  const validate = buildValidator()
  const reports = files.map((file) => {
    let doc
    try {
      doc = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (e) {
      return { file, valid: false, errors: [{ path: '/', message: `cannot read JSON: ${e.message}` }], warnings: [] }
    }
    const r = validateDoc(doc, validate)
    return { file, ...r, valid: r.errors.length === 0 && (!strict || r.warnings.length === 0) }
  })
  if (asJson) console.log(JSON.stringify(reports, null, 2))
  else {
    for (const r of reports) {
      console.log(`${r.valid ? 'PASS' : 'FAIL'} ${r.file}`)
      for (const e of r.errors) console.log(`  error   ${e.path}: ${e.message}`)
      for (const w of r.warnings) console.log(`  warning ${w.path}: ${w.message}`)
    }
  }
  return reports.every((r) => r.valid) ? 0 : 1
}

module.exports = { buildValidator, validateDoc, behaviorChecks }

if (require.main === module) {
  process.exitCode = main(process.argv)
}
