import { Stagehand } from '@browserbasehq/stagehand'

export const PLAYGROUND_URL =
  process.env.PLAYGROUND_URL ?? 'https://playground-iamadi11s-projects.vercel.app'

export function createStagehand() {
  const apiKey = process.env.BROWSERBASE_API_KEY
  const projectId = process.env.BROWSERBASE_PROJECT_ID

  if (!apiKey || !projectId) {
    throw new Error(
      'Missing BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID. Copy .env.example → .env and fill in your keys.',
    )
  }

  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey,
    projectId,
    verbose: 1,
  })
}
