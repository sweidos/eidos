import * as fs from 'fs'
import * as path from 'path'
import type { OpenAPISpec } from './types'

export function loadSpec(filePath: string): OpenAPISpec {
  const abs = path.resolve(filePath)
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`)
  }

  const raw = fs.readFileSync(abs, 'utf-8')
  const ext = path.extname(abs).toLowerCase()

  if (ext === '.json') {
    return JSON.parse(raw) as OpenAPISpec
  }

  if (ext === '.yaml' || ext === '.yml') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const yaml = require('js-yaml') as { load(s: string): unknown }
    return yaml.load(raw) as OpenAPISpec
  }

  // Sniff — try JSON first, then YAML
  try {
    return JSON.parse(raw) as OpenAPISpec
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const yaml = require('js-yaml') as { load(s: string): unknown }
    return yaml.load(raw) as OpenAPISpec
  }
}

/** Convert OpenAPI `{param}` path segments to Eidos `:param` style. */
export function convertPath(openApiPath: string): string {
  return openApiPath.replace(/\{([^}]+)\}/g, ':$1')
}

/** Extract the bare schema name from a $ref string like '#/components/schemas/Product'. */
export function refName(ref: string): string {
  return ref.split('/').pop() ?? 'unknown'
}
