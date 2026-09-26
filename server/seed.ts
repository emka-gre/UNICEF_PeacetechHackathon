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
  },
  {
    id: 'g2',
    title: 'How to spot a manipulated image',
    summary: 'Quick checks you can do before sharing.',
    body: `- Look for blurry edges, odd shadows or warped backgrounds.
- Run a reverse image search to find where the image first appeared.
- Check if the account that posted it is new or has few followers.
- If in doubt, don't share it. Report it instead.`,
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
  },
];
