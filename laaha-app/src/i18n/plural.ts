type Forms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/** Returns a picker for the language's plural forms, e.g. Ukrainian 1 звіт / 2 звіти / 5 звітів. */
export function makePlural(locale: string) {
  const rules = new Intl.PluralRules(locale);
  return (n: number, forms: Forms) => forms[rules.select(n)] ?? forms.other;
}
