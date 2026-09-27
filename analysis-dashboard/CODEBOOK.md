# Theme codebook

Rules used to label negative posts about Ukrainian women and girls. A post can carry several themes.
Labels in `data/labels_seed.csv` use the fine-grained names in brackets; `config.THEMES` merges them into six.

Labels were produced by Claude against these rules and have not been validated by a human annotator.

## Sexualisation (`sexualisation`, `gold_digging`, `cultural_threat`)

**Yes** when the post implies Ukrainian women are sexually available, sell sex, or trade sex or relationships for money, status, residence or a foreign man. This includes:
- euphemisms and innuendo: "древнейшая профессия", "под поляком или немцем", "вышла в тираж", "на панель", "ищут спонсора", "за Оксанкой есть кому присмотреть 🤣";
- women "taking" or seducing other women's husbands (the Karkadym "homewrecker" story), or showing off for local men;
- mocking or denying reports of sexual violence ("изнасилованные и довольные", "изнасилованные хохлушки появляются на наших глазах").

**No** when:
- the post reports sexual violence, trafficking or exploitation without mocking the women: label it **victim**, not a theme;
- the post mocks women abroad for money, benefits or complaints with no sexual or relationship angle: that is burden or contempt.

## Criminality (`criminalisation`)

**Yes** when the post presents Ukrainian women as thieves, fraudsters, violent, or dangerous, **and** uses the case to mock or generalise ("хохлушка украла…", "одичалая украинка напала…", "хорошо, что посадили", refugees "обворовывают" hosts), including arrests framed as typical of Ukrainian women.

**No** when:
- it is plain crime news about one woman with no mocking, slur or generalisation: the post is **neutral** (not negative at all);
- police appear only as background to another story (a relationship drama, an eviction): label the main theme instead.

## Tie-breakers

- Label every theme that applies; don't force a single one.
- If the only negative content is a slur or insult, the theme is contempt.
- A slur quoted from an attacker or harasser is not hostility by the post's author.
