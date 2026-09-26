import Anthropic from '@anthropic-ai/sdk';
import { VERDICTS, type ChatTurn, type FactCheckAnswer, type Verdict } from '../src/shared.ts';

const MODEL = 'claude-opus-5';

const SYSTEM = `You are the fact-check assistant in Laaha, an app that helps women deal with gendered misinformation and online harm.

A user shares a claim, a link, or a screenshot (often a post about a woman or about women). Help her judge whether it is true, false, misleading, or unverified.

How to answer:
- Search the web when it helps. Prefer reputable fact-checkers, established news outlets, and official sources.
- Start your answer with exactly two lines:
  VERDICT: one of ${VERDICTS.join(' | ')}
  CONFIDENCE: low | medium | high
- Then explain in 3 to 6 short sentences, in plain language, what you found and why. Mention the signs of manipulation you see, if any (edited images, missing context, fake accounts, recycled old content).
- Use "Unverified" when you cannot find good evidence either way. Never present a guess as fact. You can be wrong, and you say so when evidence is thin.
- If the content targets a specific woman, be respectful: do not repeat sexualised or degrading details, and do not speculate about her private life.
- If the user seems to be the target, or seems distressed or unsafe, acknowledge it briefly and suggest she can talk to a Laaha partner (the "Find help" tab) or report the post.
- Answer in the language the user writes in.`;

function hasCredentials() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

let client: Anthropic | null = null;

function toMessages(history: ChatTurn[]): Anthropic.Beta.BetaMessageParam[] {
  return history.map((turn) => {
    if (turn.role === 'assistant') return { role: 'assistant', content: turn.text };
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    const m = turn.image?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (m) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: m[1] as 'image/jpeg' | 'image/png' | 'image/webp', data: m[2] },
      });
    }
    content.push({ type: 'text', text: turn.text || 'Is this true?' });
    return { role: 'user', content };
  });
}

function parse(text: string, sources: FactCheckAnswer['sources']): FactCheckAnswer {
  const verdictMatch = text.match(/VERDICT:\s*(.+)/i);
  const confMatch = text.match(/CONFIDENCE:\s*(low|medium|high)/i);
  const verdict =
    VERDICTS.find((v) => verdictMatch?.[1].toLowerCase().includes(v.toLowerCase())) ?? ('Unverified' as Verdict);
  const body = text
    .replace(/^.*VERDICT:.*$/im, '')
    .replace(/^.*CONFIDENCE:.*$/im, '')
    .trim();
  return {
    verdict,
    confidence: (confMatch?.[1].toLowerCase() as FactCheckAnswer['confidence']) ?? 'low',
    text: body,
    sources,
  };
}

export async function factCheck(history: ChatTurn[]): Promise<FactCheckAnswer> {
  if (!hasCredentials()) return demoAnswer(history[history.length - 1]);
  client ??= new Anthropic();

  const messages = toMessages(history);
  let response: Anthropic.Beta.BetaMessage | undefined;

  // Web search can pause a long turn; resume a few times if it does.
  for (let i = 0; i < 3; i++) {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: SYSTEM,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }],
      messages,
    });
    if (response.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: response.content });
  }
  if (!response) throw new Error('No response');

  if (response.stop_reason === 'refusal') {
    return {
      verdict: 'Unverified',
      confidence: 'low',
      text: "I can't help with this one. You can still send it to a Laaha reviewer below.",
      sources: [],
    };
  }

  let text = '';
  const cited = new Map<string, string>();
  const searched = new Map<string, string>();
  for (const block of response.content) {
    if (block.type === 'text') {
      text += block.text;
      for (const c of block.citations ?? []) {
        if (c.type === 'web_search_result_location') cited.set(c.url, c.title ?? c.url);
      }
    } else if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const r of block.content) searched.set(r.url, r.title);
    }
  }
  const sourceMap = cited.size > 0 ? cited : searched;
  const sources = [...sourceMap].slice(0, 5).map(([url, title]) => ({ url, title }));
  return parse(text, sources);
}

/** Canned answers so the demo works without an API key. */
function demoAnswer(last: ChatTurn | undefined): FactCheckAnswer {
  const q = (last?.text ?? '').toLowerCase();
  const base = { demo: true, sources: [] as FactCheckAnswer['sources'] };
  if (last?.image) {
    return {
      ...base,
      verdict: 'Unverified',
      confidence: 'low',
      text: `I can't check images in demo mode. Things to look for yourself: blurry or warped edges around the face, lighting that doesn't match, and whether the same picture appears elsewhere online with a different story (try a reverse image search). If this image is being used to shame or threaten someone, please report it.`,
    };
  }
  if (/(photo|image|picture|video|deepfake|edited)/.test(q)) {
    return {
      ...base,
      verdict: 'Misleading',
      confidence: 'low',
      text: `Images and videos about women are often edited or taken out of context to shame them. Check if the image appeared earlier with a different caption, whether the account that posted it is new, and whether any trusted news outlet reports the same thing. Until then, treat it as unverified and don't share it.`,
    };
  }
  if (/(arrest|scandal|affair|fired|caught|leaked)/.test(q)) {
    return {
      ...base,
      verdict: 'Unverified',
      confidence: 'low',
      text: `Claims like this are a common way to discredit women in public life. I found no reliable source in demo mode. Look for the same story in established news outlets, and be careful with posts that only cite "sources say" or anonymous accounts.`,
    };
  }
  return {
    ...base,
    verdict: 'Unverified',
    confidence: 'low',
    text: `Demo mode: the AI assistant isn't connected, so I can't search the web. Tips: check who first posted it, whether trusted outlets report it, and whether the post uses emotional language to push you to share quickly. You can send this to a Laaha reviewer below.`,
  };
}
