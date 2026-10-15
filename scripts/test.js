#!/usr/bin/env node
/**
 * Self-test: valid examples pass without warnings; the invalid fixture
 * produces the expected errors and warnings.
 */
const fs = require('fs')
const path = require('path')
const { buildValidator, validateDoc } = require('./validate.js')

const root = path.join(__dirname, '..')
const validate = buildValidator()
let failures = 0

const check = (file, expectValid, expectErrors = [], expectWarnings = []) => {
  const r = validateDoc(JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')), validate)
  const errText = r.errors.map((e) => `${e.path}: ${e.message}`).join('\n')
  const warnText = r.warnings.map((w) => `${w.path}: ${w.message}`).join('\n')
  const okValid = expectValid ? r.errors.length === 0 && r.warnings.length === 0 : r.errors.length > 0
  const missing = expectErrors.filter((m) => !errText.includes(m))
    .concat(expectWarnings.filter((m) => !warnText.includes(m)).map((m) => `warning: ${m}`))
  if (!okValid || missing.length) {
    failures++
    console.log(`FAIL ${file}\n  errors:\n    ${errText.split('\n').join('\n    ')}\n  warnings:\n    ${warnText.split('\n').join('\n    ')}`)
    for (const m of missing) console.log(`  missing expected: ${m}`)
  } else console.log(`ok   ${file}`)
}

check('example.json', true)
check('examples/minimal.json', true)
check('examples/local-files.json', true)
check('examples/split-id.json', true)
const B = '/apps/0/connection'
check('examples/invalid/common-mistakes.json', false, [
  '/: must NOT have additional properties ("data"',
  `${B}/url: url must not include the protocol`,
  `${B}/operations/browse/endPoint: endPoint must not start with "/"`,
  `${B}/operations/browse/resultMap/preview: must have required property 'id'`,
  `${B}/operations/browse/resultMap/gizmo/_url_source: _url_source needs a "<%= id %>" placeholder`,
  `${B}/operations/add: must have required property 'acceptsGizmoTypes'`,
  '/autoloader/1: must match pattern'
], [
  `${B}/data/api_key: looks like a real credential`,
  `${B}/operations/browse/search: HAX only uses the first search key ("q")`,
  `${B}/operations/browse/search/rating: select options repeat the same value`,
  `${B}/operations/browse/resultMap/gizmo/type: gizmo.type is a path`,
  '_url_source needs gizmo.id'
])
process.exitCode = failures ? 1 : 0
