import { Stagehand } from '@browserbasehq/stagehand'

export const PLAYGROUND_URL =
  process.env.PLAYGROUND_URL ?? 'https://sweidos.vercel.app'

export function createStagehand() {
  const apiKey = process.env.BROWSERBASE_API_KEY
  const projectId = process.env.BROWSERBASE_PROJECT_ID
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey || !projectId) {
    throw new Error(
      'Missing BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID. Copy .env.example → .env and fill in your keys.',
    )
  }
  if (!anthropicKey) {
    throw new Error(
      'Missing ANTHROPIC_API_KEY. Stagehand needs an LLM to power act() and extract().',
    )
  }

  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey,
    projectId,
    verbose: 1,
    modelName: 'claude-sonnet-4-5',
    modelClientOptions: { apiKey: anthropicKey },
  })
}
