#!/usr/bin/env node
const { chromium } = require('playwright');
const readline = require('readline');

const BASE = 'https://internshala.com';

const FIRST = [
  'A5RT', 'Rizky', 'Budi', 'Sari',
  'Dewi', 'Andi', 'Putri', 'Eko'
];

const LAST = [
  'Doe', 'Santoso', 'Wijaya',
  'Pratama', 'Lestari', 'Nugroho'
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore',
  'Jakarta', 'Surabaya', 'Bandung'
];

const GENDERS = ['Male', 'Female', 'Others'];

const LANGS = [
  'English', 'Hindi', 'Telugu',
  'Tamil', 'Marathi', 'French', 'Japanese'
];

const TYPES = [
  'College student',
  'Fresher',
  'Working professional',
  'School student',
  'Woman returning to work'
];

const INTERESTS = [
  'Sales',
  'Data Entry',
  'Digital Marketing',
  'Web Development',
  'Graphic Design',
  'Marketing',
  'Human Resources (HR)',
  'General Management',
  'Social Media Marketing',
  'Finance',
  'Software Development',
  'Telecalling',
  'Content Writing',
  'Accounts',
  'Project Management',
  'Operations',
  'Client Servicing',
  'Programming',
  'Teaching',
  'Data Science',
  'UI/UX Design',
  'Software Testing'
];

const LOOKING = ['Jobs', 'Internships'];
const MODES = ['In-office', 'Work from home'];

const GOALS = [
  'Get an online degree from a premium institute in India',
  'Go for study abroad',
  'Enroll in job bootcamp (paid training to get a job)',
  'Prepare for government exams'
];

function pick(a) {
  return a[Math.floor(Math.random() * a.length)];
}

function pickMany(a, min, max) {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const c = a.slice().sort(() => Math.random() - 0.5);
  return c.slice(0, n);
}

function phone() {
  let s = '';
  let i;
  for (i = 0; i < 10; i++) {
    s += Math.floor(Math.random() * 10);
  }
  return s;
}

function cap(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function nameFromEmail(mail) {
  const local = (mail.split('@')[0] || '').toLowerCase();
  const letters = local.replace(/[^a-z]/g, '');
  if (!letters) return null;
  if (letters.length >= 6) {
    const mid = Math.floor(letters.length / 2);
    return {
      first: cap(letters.slice(0, mid)),
      last: cap(letters.slice(mid))
    };
  }
  return { first: cap(letters), last: pick(LAST) };
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (q) => new Promise((r) => rl.question(q, r));
const log = (s) => console.log(s);

async function fill(page, sels, val) {
  let i;
  for (i = 0; i < sels.length; i++) {
    try {
      await page.fill(sels[i], val, { timeout: 3000 });
      log('  [text] ' + sels[i]);
      return true;
    } catch (e) {}
  }
  return false;
}

async function clickText(page, t) {
  const vs = [
    'text="' + t + '"',
    'label:has-text("' + t + '")',
    'button:has-text("' + t + '")'
  ];
  let i;
  for (i = 0; i < vs.length; i++) {
    try {
      await page.click(vs[i], { timeout: 2000 });
      log('  [click] ' + t);
      return true;
    } catch (e) {}
  }
  log('  [!] gagal: ' + t);
  return false;
}

async function check(page, v) {
  const ss = [
    'input[type="checkbox"][value="' + v + '"]',
    'input[type="radio"][value="' + v + '"]',
    'input[type="checkbox"][value="' + v.toLowerCase() + '"]',
    'input[type="radio"][value="' + v.toLowerCase() + '"]'
  ];
  let i;
  for (i = 0; i < ss.length; i++) {
    try {
      await page.check(ss[i], { timeout: 2000 });
      log('  [check] ' + v);
      return true;
    } catch (e) {}
  }
  return await clickText(page, v);
}

async function next(page) {
  const ss = [
    'button[type="submit"]',
    'button:has-text("Next")',
    'button:has-text("Continue")',
    'button:has-text("Submit")'
  ];
  let i;
  for (i = 0; i < ss.length; i++) {
    try {
      await page.click(ss[i], { timeout: 2000 });
      log('  [next] ' + ss[i]);
      return true;
    } catch (e) {}
  }
  await page.keyboard.press('Enter');
  return false;
}

(async () => {
  log('');
  log('=== Internshala Auto Register ===');
  log('');
  const email = (await ask('Email Gmail: ')).trim();
  const pass = (await ask('Password: ')).trim();

  const fe = nameFromEmail(email);
  const first = fe ? fe.first : pick(FIRST);
  const last = fe ? fe.last : pick(LAST);

  const hp = phone();
  const city = pick(CITIES);
  const gen = pick(GENDERS);
  const langs = pickMany(LANGS, 1, 3);
  const type = pick(TYPES);
  const ints = pickMany(INTERESTS, 2, 5);
  const lk = pick(LOOKING);
  const md = pick(MODES);
  const gl = pick(GOALS);

  log('');
  log('[i] Data random:');
  log('  Nama   : ' + first + ' ' + last);
  log('  Email  : ' + email);
  log('  Phone  : +91' + hp);
  log('  City   : ' + city);
  log('  Gender : ' + gen);
  log('  Bahasa : ' + langs.join(', '));
  log('  Tipe   : ' + type);
  log('  Minat  : ' + ints.join(', '));
  log('  Cari   : ' + lk);
  log('  Mode   : ' + md);
  log('  Goal   : ' + gl);
  log('');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  log('[*] STEP 1 - Register');
  await page.goto(BASE + '/registration/student', {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForTimeout(3500);

  await fill(page, [
    'input[name="first_name"]',
    'input[placeholder*="First" i]'
  ], first);

  await fill(page, [
    'input[name="last_name"]',
    'input[placeholder*="Last" i]'
  ], last);

  await fill(page, [
    'input[name="email"]',
    'input[type="email"]'
  ], email);

  await fill(page, [
    'input[name="password"]',
    'input[type="password"]'
  ], pass);

  await fill(page, [
    'input[name="mobile"]',
    'input[name="phone"]',
    'input[type="tel"]'
  ], hp);

  try {
    const cs = 'input[name="city"]';
    await page.click(cs, { timeout: 3000 });
    await page.type(cs, city, { delay: 100 });
    await page.waitForTimeout(1800);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    log('  [auto] city = ' + city);
  } catch (e) {
    log('  [!] city gagal');
  }

  await check(page, gen);
  let i;
  for (i = 0; i < langs.length; i++) {
    await check(page, langs[i]);
  }
  await check(page, type);
  await next(page);
  await page.waitForTimeout(4500);

  log('[*] STEP 2 - Preferences');
  for (i = 0; i < ints.length; i++) {
    await check(page, ints[i]);
  }
  await next(page);
  await page.waitForTimeout(4500);

  log('[*] STEP 3 - Career Goal');
  await check(page, lk);
  await check(page, md);
  await check(page, gl);
  await next(page);
  await page.waitForTimeout(4500);

  log('');
  log('=== OTP dikirim ke email ===');
  const otp = (await ask('Masukkan OTP: ')).trim();

  if (otp) {
    try {
      await page.fill('input[type="tel"]', otp, { timeout: 5000 });
      await next(page);
    } catch (e) {
      const ins = await page.$$('input');
      let j;
      for (j = 0; j < ins.length; j++) {
        if (await ins[j].isVisible()) {
          const v = await ins[j].inputValue();
          if (!v) {
            await ins[j].fill(otp);
            break;
          }
        }
      }
      await next(page);
    }
    await page.waitForTimeout(6000);
  }

  log('[*] Cari link Gemini...');
  await page.waitForLoadState('networkidle');
  const links = await page.$$eval('a', (els) =>
    els.map((e) => ({
      text: (e.innerText || '').trim(),
      href: e.href
    }))
  );

  const gem = [];
  for (i = 0; i < links.length; i++) {
    const t = links[i].text.toLowerCase();
    const h = links[i].href.toLowerCase();
    if (t.includes('gemini') || h.includes('gemini')) {
      gem.push(links[i]);
    }
  }

  log('');
  log('=== Hasil ===');
  if (gem.length) {
    for (i = 0; i < gem.length; i++) {
      log('- ' + gem[i].text + ' -> ' + gem[i].href);
    }
  } else {
    log('Tidak ada link Gemini di halaman ini.');
  }

  await ask('Enter untuk tutup...');
  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error('[!] ' + e.message);
  process.exit(1);
});
