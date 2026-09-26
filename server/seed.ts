import type { Guide, Helpline, Partner } from '../src/shared.ts';

// Demo data only. Organisation names are fictional.
export const partners: Partner[] = [
  {
    id: 'p1',
    name: 'Demo Legal Aid Centre',
    services: ['Legal aid'],
    address: 'Rainbow St 12, Amman',
    lat: 31.9515,
    lng: 35.9239,
    hours: 'Sun–Thu 9:00–17:00',
    languages: ['Arabic', 'English'],
    phone: '+962 6 000 0001',
    email: 'help@legal-demo.example',
    demo: true,
    translations: {
      uk: { name: 'Демо-центр правової допомоги', address: 'вул. Рейнбоу, 12, Амман', hours: 'Нд–Чт 9:00–17:00' },
      pl: { name: 'Demo Centrum Pomocy Prawnej', address: 'Rainbow St 12, Amman', hours: 'Nd–Czw 9:00–17:00' },
    },
  },
  {
    id: 'p2',
    name: 'Demo Women’s Counselling Service',
    services: ['Counselling', 'Medical'],
    address: 'Al-Madina St 40, Amman',
    lat: 31.9632,
    lng: 35.8889,
    hours: 'Every day 8:00–20:00',
    languages: ['Arabic', 'English', 'French'],
    phone: '+962 6 000 0002',
    demo: true,
    translations: {
      uk: { name: 'Демо-служба психологічної підтримки жінок', address: 'вул. Аль-Мадіна, 40, Амман', hours: 'Щодня 8:00–20:00' },
      pl: { name: 'Demo Poradnia Wsparcia dla Kobiet', address: 'Al-Madina St 40, Amman', hours: 'Codziennie 8:00–20:00' },
    },
  },
  {
    id: 'p3',
    name: 'Demo Safe House',
    services: ['Shelter', 'Counselling'],
    address: 'Location shared by phone only',
    hours: '24/7 hotline',
    languages: ['Arabic'],
    phone: '+962 6 000 0003',
    demo: true,
    translations: {
      uk: { name: 'Демо-притулок', address: 'Адресу повідомляють лише телефоном', hours: 'Цілодобова гаряча лінія' },
      pl: { name: 'Demo Schronisko', address: 'Adres podawany tylko telefonicznie', hours: 'Całodobowa infolinia' },
    },
  },
  {
    id: 'p4',
    name: 'Demo Digital Safety Clinic',
    services: ['Digital-safety clinic'],
    address: 'Remote only',
    hours: 'Mon–Fri 10:00–18:00',
    languages: ['Arabic', 'English', 'Kurdish'],
    email: 'clinic@digital-demo.example',
    website: 'https://digital-demo.example',
    demo: true,
    translations: {
      uk: { name: 'Демо-клініка цифрової безпеки', address: 'Лише дистанційно', hours: 'Пн–Пт 10:00–18:00' },
      pl: { name: 'Demo Poradnia Bezpieczeństwa Cyfrowego', address: 'Tylko zdalnie', hours: 'Pon–Pt 10:00–18:00' },
    },
  },
  {
    id: 'p5',
    name: 'Demo Legal Clinic North',
    services: ['Legal aid', 'Digital-safety clinic'],
    address: 'University St 3, Irbid',
    lat: 32.5556,
    lng: 35.85,
    hours: 'Sun–Wed 10:00–16:00',
    languages: ['Arabic', 'English'],
    phone: '+962 2 000 0005',
    demo: true,
    translations: {
      uk: { name: 'Демо-юридична клініка «Північ»', address: 'вул. Університетська, 3, Ірбід', hours: 'Нд–Ср 10:00–16:00' },
      pl: { name: 'Demo Klinika Prawna Północ', address: 'University St 3, Irbid', hours: 'Nd–Śr 10:00–16:00' },
    },
  },
];

export const guides: Guide[] = [
  {
    id: 'g1',
    title: 'Someone posted a fake story about me',
    summary: 'First steps when false content about you is spreading.',
    body: `1. Don't reply to the post in anger. It can make it spread further.
2. Take screenshots that show the post, the account name and the date.
3. Save the link to the post.
4. Report the post to the platform using its "report" button.
5. Report it to Laaha so we can document the pattern.
6. Tell someone you trust. You don't have to deal with this alone.`,
    translations: {
      uk: {
        title: 'Хтось опублікував про мене вигадану історію',
        summary: 'Перші кроки, коли про вас поширюють неправдивий контент.',
        body: `1. Не відповідайте на допис зі злості. Це може поширити його ще більше.
2. Зробіть скриншоти, на яких видно допис, назву акаунта і дату.
3. Збережіть посилання на допис.
4. Поскаржтеся на допис платформі за допомогою кнопки «Поскаржитися».
5. Повідомте про нього Laaha, щоб ми могли задокументувати закономірність.
6. Розкажіть людині, якій довіряєте. Вам не потрібно впоратися з цим самим.`,
      },
      pl: {
        title: 'Ktoś opublikował o mnie zmyśloną historię',
        summary: 'Pierwsze kroki, gdy krążą o tobie fałszywe treści.',
        body: `1. Nie odpowiadaj na post w złości. To może sprawić, że rozejdzie się dalej.
2. Zrób zrzuty ekranu pokazujące post, nazwę konta i datę.
3. Zapisz link do posta.
4. Zgłoś post platformie przyciskiem „Zgłoś”.
5. Zgłoś go do Laaha, żebyśmy mogli udokumentować ten schemat.
6. Powiedz o tym komuś zaufanemu. Nie musisz radzić sobie z tym w pojedynkę.`,
      },
    },
  },
  {
    id: 'g2',
    title: 'How to spot a manipulated image',
    summary: 'Quick checks you can do before sharing.',
    body: `- Look for blurry edges, odd shadows or warped backgrounds.
- Run a reverse image search to find where the image first appeared.
- Check if the account that posted it is new or has few followers.
- If in doubt, don't share it. Report it instead.`,
    translations: {
      uk: {
        title: 'Як розпізнати змінене зображення',
        summary: 'Швидкі перевірки перед тим, як поширювати.',
        body: `- Шукайте розмиті краї, дивні тіні чи викривлений фон.
- Скористайтеся зворотним пошуком зображень, щоб знайти, де фото з’явилося вперше.
- Перевірте, чи акаунт, який його опублікував, новий або має мало підписників.
- Якщо сумніваєтеся, не поширюйте. Краще поскаржтеся.`,
      },
      pl: {
        title: 'Jak rozpoznać zmanipulowane zdjęcie',
        summary: 'Szybkie sprawdzenie przed udostępnieniem.',
        body: `- Szukaj rozmytych krawędzi, dziwnych cieni lub zniekształconego tła.
- Użyj wyszukiwania obrazem, aby znaleźć, gdzie zdjęcie pojawiło się po raz pierwszy.
- Sprawdź, czy konto, które je opublikowało, jest nowe lub ma mało obserwujących.
- Jeśli masz wątpliwości, nie udostępniaj. Zamiast tego zgłoś.`,
      },
    },
  },
  {
    id: 'g3',
    title: 'Lock down your accounts',
    summary: 'Five settings that make it harder to target you.',
    body: `1. Turn on two-factor authentication.
2. Make your profile private and hide your friend list.
3. Turn off location tagging on posts.
4. Check which apps have access to your accounts.
5. Use a different password for each account.`,
    translations: {
      uk: {
        title: 'Захистіть свої акаунти',
        summary: 'П’ять налаштувань, які ускладнять атаки на вас.',
        body: `1. Увімкніть двофакторну автентифікацію.
2. Зробіть профіль приватним і приховайте список друзів.
3. Вимкніть позначення місцеперебування в дописах.
4. Перевірте, які застосунки мають доступ до ваших акаунтів.
5. Використовуйте окремий пароль для кожного акаунта.`,
      },
      pl: {
        title: 'Zabezpiecz swoje konta',
        summary: 'Pięć ustawień, które utrudniają ataki na ciebie.',
        body: `1. Włącz uwierzytelnianie dwuskładnikowe.
2. Ustaw profil jako prywatny i ukryj listę znajomych.
3. Wyłącz oznaczanie lokalizacji w postach.
4. Sprawdź, które aplikacje mają dostęp do twoich kont.
5. Używaj innego hasła do każdego konta.`,
      },
    },
  },
];

// Demo helplines with fictional numbers. Replace with real national hotlines before any pilot.
export const helplines: Helpline[] = [
  {
    id: 'h1',
    name: 'Women’s Helpline',
    description: 'Talk to a trained counsellor about violence, threats or harassment. Confidential.',
    phone: '+962 6 000 0100',
    hours: '24/7',
    languages: ['Arabic', 'English'],
    free: true,
    demo: true,
    translations: {
      uk: {
        name: 'Жіноча гаряча лінія',
        description: 'Поговоріть із навченою консультанткою про насильство, погрози чи домагання. Конфіденційно.',
        hours: 'Цілодобово',
      },
      pl: {
        name: 'Telefon zaufania dla kobiet',
        description: 'Porozmawiaj z przeszkoloną konsultantką o przemocy, groźbach lub nękaniu. Poufnie.',
        hours: 'Całodobowo',
      },
    },
  },
  {
    id: 'h2',
    name: 'Online Harm Helpline',
    description: 'Help with fake accounts, leaked photos, and getting harmful posts taken down.',
    phone: '+962 6 000 0101',
    hours: 'Sun–Thu 9:00–17:00',
    languages: ['Arabic', 'English', 'French'],
    free: true,
    demo: true,
    translations: {
      uk: {
        name: 'Гаряча лінія з онлайн-шкоди',
        description: 'Допомога з фейковими акаунтами, злитими фото та видаленням шкідливих дописів.',
        hours: 'Нд–Чт 9:00–17:00',
      },
      pl: {
        name: 'Infolinia ds. krzywdy w sieci',
        description: 'Pomoc przy fałszywych kontach, wyciekach zdjęć i usuwaniu szkodliwych postów.',
        hours: 'Nd–Czw 9:00–17:00',
      },
    },
  },
  {
    id: 'h3',
    name: 'Legal Advice Line',
    description: 'Free advice on your rights, defamation and reporting to the police.',
    phone: '+962 6 000 0102',
    hours: 'Sun–Thu 10:00–16:00',
    languages: ['Arabic'],
    free: true,
    demo: true,
    translations: {
      uk: {
        name: 'Лінія юридичних консультацій',
        description: 'Безкоштовні консультації щодо ваших прав, наклепу та звернення до поліції.',
        hours: 'Нд–Чт 10:00–16:00',
      },
      pl: {
        name: 'Infolinia porad prawnych',
        description: 'Bezpłatne porady dotyczące twoich praw, zniesławienia i zgłaszania sprawy na policję.',
        hours: 'Nd–Czw 10:00–16:00',
      },
    },
  },
];
