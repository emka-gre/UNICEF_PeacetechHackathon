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

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', uk: 'Ukrainian', pl: 'Polish' };

export async function factCheck(history: ChatTurn[], lang = 'en'): Promise<FactCheckAnswer> {
  if (!hasCredentials()) return demoAnswer(history[history.length - 1], lang);
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
      system: `${SYSTEM}\n- The app is set to ${LANGUAGE_NAMES[lang] ?? 'English'}. Use that language when the user's own language is unclear, for example when they only send a screenshot.`,
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
      text: cannedText(lang).refusal,
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

/** Fixed texts in each app language: demo answers (no API key) and the refusal message. */
const CANNED_TEXT = {
  en: {
    image: `I can't check images in demo mode. Things to look for yourself: blurry or warped edges around the face, lighting that doesn't match, and whether the same picture appears elsewhere online with a different story (try a reverse image search). If this image is being used to shame or threaten someone, please report it.`,
    media: `Images and videos about women are often edited or taken out of context to shame them. Check if the image appeared earlier with a different caption, whether the account that posted it is new, and whether any trusted news outlet reports the same thing. Until then, treat it as unverified and don't share it.`,
    scandal: `Claims like this are a common way to discredit women in public life. I found no reliable source in demo mode. Look for the same story in established news outlets, and be careful with posts that only cite "sources say" or anonymous accounts.`,
    other: `Demo mode: the AI assistant isn't connected, so I can't search the web. Tips: check who first posted it, whether trusted outlets report it, and whether the post uses emotional language to push you to share quickly. You can send this to a Laaha reviewer below.`,
    refusal: "I can't help with this one. You can still send it to a Laaha reviewer below.",
  },
  uk: {
    image: `У демо-режимі я не можу перевіряти зображення. На що звернути увагу самостійно: розмиті чи викривлені краї навколо обличчя, освітлення, яке не збігається, і чи не з’являлося це фото деінде в мережі з іншою історією (спробуйте зворотний пошук зображень). Якщо це фото використовують, щоб присоромити когось чи погрожувати, будь ласка, повідомте про це.`,
    media: `Фото й відео про жінок часто редагують або виривають з контексту, щоб присоромити їх. Перевірте, чи не з’являлося це зображення раніше з іншим підписом, чи новий акаунт, який його опублікував, і чи пишуть про це надійні медіа. Доти вважайте це непідтвердженим і не поширюйте.`,
    scandal: `Такі твердження — поширений спосіб дискредитувати жінок у публічному житті. У демо-режимі я не знайшов надійних джерел. Пошукайте цю історію у відомих медіа й обережно ставтеся до дописів, які посилаються лише на «джерела кажуть» або на анонімні акаунти.`,
    other: `Демо-режим: ШІ-помічника не підключено, тож я не можу шукати в інтернеті. Поради: перевірте, хто першим це опублікував, чи пишуть про це надійні медіа і чи не тисне допис на емоції, щоб ви швидше ним поділилися. Нижче можна надіслати це фахівцю Laaha.`,
    refusal: 'Тут я не можу допомогти. Ви все одно можете надіслати це фахівцю Laaha нижче.',
  },
  pl: {
    image: `W trybie demo nie mogę sprawdzać zdjęć. Na co zwrócić uwagę samodzielnie: rozmyte lub zniekształcone krawędzie wokół twarzy, niepasujące oświetlenie i to, czy to samo zdjęcie pojawia się gdzie indziej w sieci z inną historią (spróbuj wyszukiwania obrazem). Jeśli to zdjęcie służy do zawstydzania lub zastraszania kogoś, zgłoś je.`,
    media: `Zdjęcia i filmy przedstawiające kobiety są często przerabiane lub wyrywane z kontekstu, by je zawstydzić. Sprawdź, czy zdjęcie pojawiło się wcześniej z innym podpisem, czy konto, które je opublikowało, jest nowe i czy piszą o tym wiarygodne media. Do tego czasu traktuj je jako niezweryfikowane i nie udostępniaj go.`,
    scandal: `Takie twierdzenia to częsty sposób na dyskredytowanie kobiet w życiu publicznym. W trybie demo nie znalazłem wiarygodnego źródła. Poszukaj tej historii w uznanych mediach i uważaj na posty, które powołują się tylko na „źródła” lub anonimowe konta.`,
    other: `Tryb demo: asystent AI nie jest podłączony, więc nie mogę przeszukiwać sieci. Wskazówki: sprawdź, kto pierwszy to opublikował, czy piszą o tym wiarygodne media i czy post gra na emocjach, żeby skłonić cię do szybkiego udostępnienia. Poniżej możesz wysłać to do weryfikatora Laaha.`,
    refusal: 'Tu nie mogę pomóc. Nadal możesz wysłać to do weryfikatora Laaha poniżej.',
  },
};
type CannedLang = keyof typeof CANNED_TEXT;
const cannedText = (lang: string) => CANNED_TEXT[(lang in CANNED_TEXT ? lang : 'en') as CannedLang];

/** Canned answers so the demo works without an API key. Keywords cover English, Ukrainian and Polish. */
function demoAnswer(last: ChatTurn | undefined, lang: string): FactCheckAnswer {
  const q = (last?.text ?? '').toLowerCase();
  const text = cannedText(lang);
  const base = { demo: true, sources: [] as FactCheckAnswer['sources'] };
  if (last?.image) {
    return { ...base, verdict: 'Unverified', confidence: 'low', text: text.image };
  }
  if (/(photo|image|picture|video|deepfake|edited|фото|зображ|світлин|відео|діпфейк|zdjęci|obraz|wideo|film|przerobion)/.test(q)) {
    return { ...base, verdict: 'Misleading', confidence: 'low', text: text.media };
  }
  if (/(arrest|scandal|affair|fired|caught|leaked|арешт|заарешт|скандал|роман|звільн|злив|aresztow|skandal|romans|zwolnion|wyciek)/.test(q)) {
    return { ...base, verdict: 'Unverified', confidence: 'low', text: text.scandal };
  }
  return { ...base, verdict: 'Unverified', confidence: 'low', text: text.other };
}
