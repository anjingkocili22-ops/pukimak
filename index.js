#!/usr/bin/env node
const { chromium } = require('playwright');
const readline = require('readline');

const BASE = 'https://internshala.com';

const FIRST = ['A5RT','Rizky','Budi','Sari','Dewi','Andi','Putri','Eko'];
const LAST  = ['Doe','Santoso','Wijaya','Pratama','Lestari','Nugroho'];
const CITIES = ['Mumbai','Delhi','Bangalore','Jakarta','Surabaya'];
const GENDERS = ['Male','Female'];
const LANGS = ['English','Hindi','Telugu','Tamil'];
const TYPES = ['Fresher','College student','Working professional'];
const COURSES = ['B.Tech','BE','B.Com','MBA','B.A'];
const STREAMS = ['Computer Science','Information Technology','Commerce'];
const YEARS = ['2020','2021','2022','2023','2024'];
const INTERESTS = ['Sales','Data Entry','Digital Marketing','Web Development','Marketing','Finance','Software Development','Programming'];
const LOOKING = ['Jobs','Internships'];
const MODES = ['In-office','Work from home'];
const GOALS = ['Get an online degree from a premium institute in India','Go for study abroad','Prepare for government exams'];
const COLLEGES = ['BITS Pilani','BIT Sindri','IIT Delhi','IIT Bombay','NIT Trichy'];

function pick(a){return a[Math.floor(Math.random()*a.length)];}
function pickMany(a,min,max){const n=min+Math.floor(Math.random()*(max-min+1));return a.slice().sort(()=>Math.random()-0.5).slice(0,n);}
function phone(){let s='';for(let i=0;i<10;i++)s+=Math.floor(Math.random()*10);return s;}
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s;}
function nameFromEmail(mail){
  const l=(mail.split('@')[0]||'').toLowerCase().replace(/[^a-z]/g,'');
  if(!l)return null;
  if(l.length>=6){const m=Math.floor(l.length/2);return{first:cap(l.slice(0,m)),last:cap(l.slice(m))};}
  return{first:cap(l),last:pick(LAST)};
}

const rl = readline.createInterface({input:process.stdin,output:process.stdout});
const ask = (q) => new Promise((r) => rl.question(q,r));
const log = (s) => console.log(s);

// Isi text field dengan fallback selector
async function fillField(page, sels, val, label) {
  for (const s of sels) {
    try {
      await page.fill(s, val, { timeout: 3000 });
      log('  [text] ' + (label||s) + ' = ' + val);
      return true;
    } catch(e){}
  }
  log('  [!] gagal text: ' + (label||sels[0]));
  return false;
}

// Klik pill/button berdasarkan teks (buat Gender, Language, Type, Course, dll)
async function clickPill(page, text) {
  // Prioritas: exact match di button/label/div yang mengandung teks
  const sels = [
    'button:has-text("' + text + '")',
    'label:has-text("' + text + '")',
    'div[role="button"]:has-text("' + text + '")',
    'span:has-text("' + text + '")',
    'text="' + text + '"',
  ];
  for (const s of sels) {
    try {
      const el = await page.$(s);
      if (el) {
        await el.scrollIntoViewIfNeeded();
        await el.click({ timeout: 2000 });
        log('  [pill] ' + text);
        return true;
      }
    } catch(e){}
  }
  log('  [!] gagal pill: ' + text);
  return false;
}

// Checkbox berdasarkan teks label
async function clickCheckbox(page, text) {
  // Coba cari input checkbox yang berdekatan dengan label text
  try {
    const handle = await page.evaluateHandle((t) => {
      const labels = Array.from(document.querySelectorAll('label'));
      for (const l of labels) {
        if (l.innerText.trim().includes(t)) {
          const inp = l.querySelector('input[type="checkbox"]');
          if (inp) return inp;
          // kalau label punya atribut for
          if (l.htmlFor) {
            const el = document.getElementById(l.htmlFor);
            if (el) return el;
          }
        }
      }
      return null;
    }, text);
    const el = handle.asElement();
    if (el) {
      await el.scrollIntoViewIfNeeded();
      await el.check({ timeout: 2000 });
      log('  [check] ' + text);
      return true;
    }
  } catch(e){}
  log('  [!] gagal check: ' + text);
  return false;
}

// Autocomplete: ketik, tunggu dropdown, klik opsi yang cocok
async function autocomplete(page, sel, query, matchFirst) {
  try {
    const inp = await page.$(sel);
    if (!inp) { log('  [!] field autocomplete tidak ada: ' + sel); return false; }
    await inp.scrollIntoViewIfNeeded();
    await inp.click();
    await inp.fill('');
    await inp.type(query, { delay: 80 });
    await page.waitForTimeout(2000); // tunggu dropdown muncul

    // Cari opsi dropdown yang visible
    const options = await page.$$('li, [role="option"], .pac-item, [class*="suggestion"], [class*="option"]');
    let clicked = false;
    for (const opt of options) {
      try {
        if (!(await opt.isVisible())) continue;
        const txt = (await opt.innerText()).trim();
        if (!txt) continue;
        if (matchFirst || txt.toLowerCase().includes(query.toLowerCase().slice(0,3))) {
          await opt.click({ timeout: 1500 });
          log('  [auto] ' + query + ' -> ' + txt.slice(0,40));
          clicked = true;
          break;
        }
      } catch(e){}
    }
    if (!clicked) {
      // fallback: Enter
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      log('  [auto-enter] ' + query);
    }
    return true;
  } catch(e) {
    log('  [!] autocomplete gagal: ' + query);
    return false;
  }
}

// Klik Next/Submit berdasarkan teks
async function clickNext(page, texts) {
  for (const t of texts) {
    try {
      const btn = await page.$('button:has-text("' + t + '"), a:has-text("' + t + '")');
      if (btn) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ timeout: 3000 });
        log('  [next] ' + t);
        return true;
      }
    } catch(e){}
  }
  return false;
}

(async () => {
  log('\n=== Internshala Auto Register ===\n');
  const email = (await ask('Email Gmail: ')).trim();
  const password = (await ask('Password (min 6): ')).trim();

  const fe = nameFromEmail(email);
  const first = fe ? fe.first : pick(FIRST);
  const last  = fe ? fe.last  : pick(LAST);

  const data = {
    phone: phone(),
    city: pick(CITIES),
    gender: pick(GENDERS),
    langs: pickMany(LANGS, 1, 2),
    type: pick(TYPES),
    course: pick(COURSES),
    college: pick(COLLEGES),
    stream: pick(STREAMS),
    startYear: pick(YEARS),
    endYear: pick(YEARS),
    interests: pickMany(INTERESTS, 2, 4),
    looking: pick(LOOKING),
    mode: pick(MODES),
    goal: pick(GOALS),
  };

  log('\n[i] Data random:');
  log('  Nama    : ' + first + ' ' + last);
  log('  Email   : ' + email);
  log('  Phone   : +91' + data.phone);
  log('  City    : ' + data.city);
  log('  Gender  : ' + data.gender);
  log('  Bahasa  : ' + data.langs.join(', '));
  log('  Tipe    : ' + data.type);
  log('  Course  : ' + data.course);
  log('  College : ' + data.college);
  log('  Stream  : ' + data.stream);
  log('  Minat   : ' + data.interests.join(', '));
  log('  Cari    : ' + data.looking);
  log('  Mode    : ' + data.mode);
  log('  Goal    : ' + data.goal);
  log('');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  const page = await ctx.newPage();

  // ================= STEP 1: Halaman awal -> Continue with Email =================
  log('[*] Buka halaman awal...');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 's1-home.png' });

  log('[*] Klik "Continue with Email"...');
  await clickNext(page, ['Continue with Email', 'Login', 'Sign up']);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 's2-signup.png' });

  // ================= STEP 2: Sign up form =================
  log('[*] Isi form sign up...');
  await fillField(page, ['input[name="email"]','input[type="email"]'], email, 'email');
  await fillField(page, ['input[name="password"]','input[type="password"]'], password, 'password');
  await fillField(page, ['input[name="first_name"]','input[placeholder*="John" i]'], first, 'first_name');
  await fillField(page, ['input[name="last_name"]','input[placeholder*="Doe" i]'], last, 'last_name');

  await page.screenshot({ path: 's3-signup-filled.png' });

  log('[*] Klik "Sign up"...');
  await clickNext(page, ['Sign up', 'Sign Up', 'Register']);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 's4-after-signup.png' });

  // ================= STEP 3: OTP =================
  log('\n=== OTP dikirim ke email ===');
  const otp = (await ask('Masukkan OTP: ')).trim();

  if (otp) {
    // Isi semua input kosong yang visible (OTP biasanya 4-6 kotak)
    const filled = await page.evaluate((code) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      let count = 0;
      for (const inp of inputs) {
        if (inp.offsetParent === null) continue;
        if (inp.value) continue;
        const type = inp.type || 'text';
        if (type === 'hidden' || type === 'submit' || type === 'checkbox' || type === 'radio') continue;
        inp.focus();
        inp.value = code.charAt(count) || code;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        count++;
        if (count >= code.length) break;
      }
      return count;
    }, otp);
    log('  [otp] diisi ke ' + filled + ' field');

    // kalau cuma 1 field, isi full OTP
    if (filled <= 1) {
      try {
        const inp = await page.$('input[type="tel"], input[inputmode="numeric"], input[name*="otp" i]');
        if (inp) { await inp.fill(otp); }
      } catch(e){}
    }

    await page.screenshot({ path: 's5-otp-filled.png' });
    await clickNext(page, ['Verify','Submit','Continue','Next']);
    await page.waitForTimeout(7000);
    await page.screenshot({ path: 's6-after-otp.png' });
  }

  // ================= STEP 4: Onboarding form 1 =================
  log('[*] Form onboarding 1...');
  await page.waitForTimeout(3000);

  // Phone number
  await fillField(page, [
    'input[name="mobile"]',
    'input[name="phone"]',
    'input[placeholder*="Mobile" i]',
  ], data.phone, 'phone');

  // City (autocomplete)
  await autocomplete(page,
    'input[placeholder*="location" i], input[placeholder*="city" i], input[name="city"]',
    data.city, true);

  // Gender pill
  await clickPill(page, data.gender);

  // Languages
  for (const l of data.langs) await clickPill(page, l);

  // Type
  await clickPill(page, data.type);

  // Course
  await clickPill(page, data.course);

  // College (autocomplete)
  await autocomplete(page,
    'input[placeholder*="BITS" i], input[placeholder*="college" i], input[name="college"]',
    data.college, true);

  // Stream
  await fillField(page, [
    'input[placeholder*="Computer Science" i]',
    'input[name="stream"]',
  ], data.stream, 'stream');

  // Start year & End year (dropdown)
  try {
    const selects = await page.$$('select');
    if (selects.length >= 2) {
      await selects[0].selectOption(data.startYear).catch(()=>{});
      await selects[1].selectOption(data.endYear).catch(()=>{});
      log('  [select] year');
    } else {
      // kalau custom dropdown, klik & pilih
      await clickPill(page, data.startYear);
      await page.waitForTimeout(500);
      await clickPill(page, data.endYear);
    }
  } catch(e){}

  await page.screenshot({ path: 's7-onboard1.png' });
  log('[*] Next...');
  await clickNext(page, ['Next','Continue','Save']);
  await page.waitForTimeout(5000);

  // ================= STEP 5: Preferences =================
  log('[*] Form onboarding 2 (preferences)...');
  await page.waitForTimeout(2000);

  for (const i of data.interests) {
    await clickPill(page, i);
  }

  await page.screenshot({ path: 's8-prefs.png' });
  await clickNext(page, ['Next','Continue','Save']);
  await page.waitForTimeout(5000);

  // ================= STEP 6: Career goal =================
  log('[*] Form onboarding 3 (career goal)...');
  await page.waitForTimeout(2000);

  await clickPill(page, data.looking);
  await clickPill(page, data.mode);
  await clickCheckbox(page, data.goal);

  await page.screenshot({ path: 's9-goal.png' });
  await clickNext(page, ['Find me opportunities','Find opportunities','Finish','Submit','Next']);
  await page.waitForTimeout(7000);

  // ================= STEP 7: Cari link Gemini =================
  log('[*] Cari link "Free Gemini Access"...');
  await page.waitForLoadState('networkidle').catch(()=>{});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 's10-dashboard.png', fullPage: true });

  const links = await page.$$eval('a', (els) =>
    els.map((e) => ({ text: (e.innerText||'').trim(), href: e.href }))
  );
  const gem = links.filter((l) =>
    l.text.toLowerCase().includes('gemini') ||
    l.href.toLowerCase().includes('gemini')
  );

  log('\n=== Hasil ===');
  if (gem.length) {
    for (const g of gem) log('- ' + g.text + ' -> ' + g.href);
  } else {
    log('Nggak ada link Gemini di halaman ini.');
    log('Cek s10-dashboard.png buat lihat dashboard.');
  }

  await ask('\nEnter untuk tutup...');
  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error('[!] ' + e.message);
  process.exit(1);
});
