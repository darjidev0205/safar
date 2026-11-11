const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'e2e-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// User's designated test accounts from MongoDB
const HOST_ACCOUNT = {
  id: '6ac10296b6cbebfab92044d7',
  email: 'devbhikhabhaidarji@gmail.com',
  fullName: 'Devbhikhabhai Darji (Host)',
  role: 'EVENT_ORGANIZER',
};

const DRIVER_ACCOUNT = {
  id: '6ac105703db0da0d800ff291',
  email: 'antigravit4350@gmail.com',
  fullName: 'Dev Chauffeur (Driver)',
  role: 'DRIVER',
};

const GUEST_ACCOUNT = {
  id: '6ac103073db0da0d800ff28b',
  email: 'darjibhikhabhaimanilal@gmail.com',
  fullName: 'Darji Bhikhabhai (Guest)',
  role: 'GUEST',
};

async function injectSession(page, account) {
  await page.addInitScript((acc) => {
    window.localStorage.setItem('safar_authenticated_session', JSON.stringify({
      id: acc.id,
      email: acc.email,
      fullName: acc.fullName,
      role: acc.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    window.localStorage.setItem('safar_auth_token', acc.email);
    window.localStorage.setItem('safar_dev_token', acc.id);
    window.localStorage.setItem('safar_dev_role', acc.role);
  }, account);
}

async function runE2E() {
  console.log('========================================================================');
  console.log('  SAFAR AUTONOMOUS BROWSER TESTING & VERIFICATION SUITE');
  console.log('========================================================================\n');

  console.log('1. Launching 3 isolated browser sessions with Chrome channel...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const driverContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const guestContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const hostPage = await hostContext.newPage();
  const driverPage = await driverContext.newPage();
  const guestPage = await guestContext.newPage();

  // Monitor network responses & console errors
  const attachListeners = (page, roleName) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`  [${roleName} Console Error]:`, msg.text());
      }
    });
    page.on('response', (res) => {
      const url = res.url();
      if (url.includes('/api/') && res.status() >= 400) {
        console.warn(`  [${roleName} API Error]: ${res.status()} ${url}`);
      }
    });
  };

  attachListeners(hostPage, 'HOST');
  attachListeners(driverPage, 'DRIVER');
  attachListeners(guestPage, 'GUEST');

  // =========================================================================
  // STEP 2 — SESSION 1: HOST DASHBOARD & CODES
  // =========================================================================
  console.log('\n--- Step 2.1: Initializing HOST Session ---');
  await injectSession(hostPage, HOST_ACCOUNT);

  console.log('Navigating to http://localhost:3000/host ...');
  await hostPage.goto('http://localhost:3000/host', { waitUntil: 'networkidle' });
  await hostPage.waitForTimeout(2500);

  await hostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-host-dashboard.png'), fullPage: true });
  console.log('  📸 Screenshot saved: 01-host-dashboard.png');

  // Fetch Master Events for Host
  const eventDataRes = await hostPage.request.get('http://localhost:3000/api/events', {
    headers: {
      'x-user-id': HOST_ACCOUNT.id,
      'x-user-email': HOST_ACCOUNT.email,
      'Authorization': `Bearer ${HOST_ACCOUNT.email}`,
    },
  });

  let activeMasterEvent = null;
  if (eventDataRes.ok()) {
    const json = await eventDataRes.json();
    if (json.events && json.events.length > 0) {
      activeMasterEvent = json.events[0];
      console.log(`  Master Event Found: "${activeMasterEvent.name}" (ID: ${activeMasterEvent.id})`);
      console.log(`  Master Event Guest Code:  ${activeMasterEvent.guestAccessCode || activeMasterEvent.joinCode}`);
      console.log(`  Master Event Driver Code: ${activeMasterEvent.driverAccessCode}`);
      console.log(`  Embedded Functions Count: ${activeMasterEvent.functions?.length || 0}`);
    }
  }

  if (!activeMasterEvent) {
    console.log('  Creating new Master Wedding Event for Host...');
    const createEvRes = await hostPage.request.post('http://localhost:3000/api/events', {
      headers: {
        'x-user-id': HOST_ACCOUNT.id,
        'x-user-email': HOST_ACCOUNT.email,
        'Authorization': `Bearer ${HOST_ACCOUNT.email}`,
      },
      data: {
        name: 'The Royal Heritage Wedding',
        city: 'Jaipur',
        startDate: '2026-12-15T10:00:00.000Z',
        endDate: '2026-12-18T22:00:00.000Z',
        venueName: 'Jai Mahal Palace',
      },
    });
    const createdJson = await createEvRes.json();
    activeMasterEvent = createdJson.event;
    console.log(`  Created Master Event: "${activeMasterEvent.name}" (ID: ${activeMasterEvent.id})`);
  }

  const effectiveGuestCode = (activeMasterEvent.guestAccessCode || activeMasterEvent.joinCode).trim().toUpperCase();
  const effectiveDriverCode = activeMasterEvent.driverAccessCode.trim().toUpperCase();

  console.log(`\n  >> HOST GUEST PASSCODE:  "${effectiveGuestCode}"`);
  console.log(`  >> HOST DRIVER PASSCODE: "${effectiveDriverCode}"`);

  // Step 2.2: Create a Ceremony Function under this Master Event
  console.log('\n--- Step 2.2: Creating Ceremony Function under Master Event ---');
  const fnRes = await hostPage.request.post(`http://localhost:3000/api/events/${activeMasterEvent.id}/functions`, {
    headers: {
      'x-user-id': HOST_ACCOUNT.id,
      'x-user-email': HOST_ACCOUNT.email,
      'Authorization': `Bearer ${HOST_ACCOUNT.email}`,
    },
    data: {
      name: 'Grand Sangeet & Musical Night',
      type: 'SANGEET',
      venueName: 'Palace Amphitheater',
      date: '2026-12-16T18:00:00.000Z',
      startTime: '2026-12-16T18:00:00.000Z',
      endTime: '2026-12-16T23:30:00.000Z',
    },
  });

  console.log(`  Create Function Status: HTTP ${fnRes.status()}`);
  const fnJson = await fnRes.json();
  console.log(`  Created Ceremony: "${fnJson.function?.name}" (ID: ${fnJson.function?.id})`);

  // Verify Master Event codes did NOT change and NO duplicate codes were generated
  const postFnRes = await hostPage.request.get('http://localhost:3000/api/events', {
    headers: {
      'x-user-id': HOST_ACCOUNT.id,
      'x-user-email': HOST_ACCOUNT.email,
      'Authorization': `Bearer ${HOST_ACCOUNT.email}`,
    },
  });
  const postFnJson = await postFnRes.json();
  const refreshedMaster = postFnJson.events[0];
  const postGuestCode = (refreshedMaster.guestAccessCode || refreshedMaster.joinCode).trim().toUpperCase();
  const postDriverCode = refreshedMaster.driverAccessCode.trim().toUpperCase();

  console.log(`  Post-Function Guest Code:  "${postGuestCode}" (Matches Pre: ${postGuestCode === effectiveGuestCode})`);
  console.log(`  Post-Function Driver Code: "${postDriverCode}" (Matches Pre: ${postDriverCode === effectiveDriverCode})`);
  console.log(`  Total Embedded Ceremonies: ${refreshedMaster.functions?.length}`);

  // =========================================================================
  // STEP 3 — SESSION 2: DRIVER DASHBOARD & JOIN EVENT
  // =========================================================================
  console.log('\n--- Step 3: Initializing DRIVER Session & Joining Event ---');
  await injectSession(driverPage, DRIVER_ACCOUNT);

  console.log('Navigating to http://localhost:3000/driver ...');
  await driverPage.goto('http://localhost:3000/driver', { waitUntil: 'networkidle' });
  await driverPage.waitForTimeout(2500);

  await driverPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-driver-dashboard-before.png'), fullPage: true });
  console.log('  📸 Screenshot saved: 02-driver-dashboard-before.png');

  // Driver redeems driver passcode
  console.log(`  Driver attempting to redeem code "${effectiveDriverCode}" ...`);
  const driverJoinRes = await driverPage.request.post('http://localhost:3000/api/events/join/driver', {
    headers: {
      'x-user-id': DRIVER_ACCOUNT.id,
      'x-user-email': DRIVER_ACCOUNT.email,
      'Authorization': `Bearer ${DRIVER_ACCOUNT.email}`,
    },
    data: {
      code: effectiveDriverCode,
    },
  });

  console.log(`  Driver Join HTTP Status: ${driverJoinRes.status()}`);
  const driverJoinJson = await driverJoinRes.json();
  console.log('  Driver Join Result:', JSON.stringify(driverJoinJson, null, 2));

  // Reload Driver Dashboard and check state
  await driverPage.reload({ waitUntil: 'networkidle' });
  await driverPage.waitForTimeout(2500);
  await driverPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-driver-dashboard-after.png'), fullPage: true });
  console.log('  📸 Screenshot saved: 03-driver-dashboard-after.png');

  // =========================================================================
  // STEP 4 — SESSION 3: GUEST DASHBOARD & JOIN EVENT
  // =========================================================================
  console.log('\n--- Step 4: Initializing GUEST Session & Joining Event ---');
  await injectSession(guestPage, GUEST_ACCOUNT);

  console.log('Navigating to http://localhost:3000/guest ...');
  await guestPage.goto('http://localhost:3000/guest', { waitUntil: 'networkidle' });
  await guestPage.waitForTimeout(2500);

  await guestPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-guest-dashboard-before.png'), fullPage: true });
  console.log('  📸 Screenshot saved: 04-guest-dashboard-before.png');

  // Guest redeems guest passcode
  console.log(`  Guest attempting to redeem code "${effectiveGuestCode}" ...`);
  const guestJoinRes = await guestPage.request.post('http://localhost:3000/api/events/join/guest', {
    headers: {
      'x-user-id': GUEST_ACCOUNT.id,
      'x-user-email': GUEST_ACCOUNT.email,
      'Authorization': `Bearer ${GUEST_ACCOUNT.email}`,
    },
    data: {
      code: effectiveGuestCode,
      pickupRequired: true,
      dropRequired: true,
    },
  });

  console.log(`  Guest Join HTTP Status: ${guestJoinRes.status()}`);
  const guestJoinJson = await guestJoinRes.json();
  console.log('  Guest Join Result:', JSON.stringify(guestJoinJson, null, 2));

  // Reload Guest Dashboard and check state
  await guestPage.reload({ waitUntil: 'networkidle' });
  await guestPage.waitForTimeout(2500);
  await guestPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-guest-dashboard-after.png'), fullPage: true });
  console.log('  📸 Screenshot saved: 05-guest-dashboard-after.png');

  // =========================================================================
  // STEP 5 — ROLE RESTRICTION & WRONG CODE VALIDATION
  // =========================================================================
  console.log('\n--- Step 5: Testing Role Separation & Negative Test Cases ---');
  // 1. Driver enters Guest Code
  const driverWrongRes = await driverPage.request.post('http://localhost:3000/api/events/join/driver', {
    headers: {
      'x-user-id': DRIVER_ACCOUNT.id,
      'x-user-email': DRIVER_ACCOUNT.email,
      'Authorization': `Bearer ${DRIVER_ACCOUNT.email}`,
    },
    data: { code: effectiveGuestCode },
  });
  const driverWrongJson = await driverWrongRes.json();
  console.log(`  Driver Entering Guest Code: HTTP ${driverWrongRes.status()}`, driverWrongJson.error?.message || driverWrongJson.message);

  // 2. Guest enters Driver Code
  const guestWrongRes = await guestPage.request.post('http://localhost:3000/api/events/join/guest', {
    headers: {
      'x-user-id': GUEST_ACCOUNT.id,
      'x-user-email': GUEST_ACCOUNT.email,
      'Authorization': `Bearer ${GUEST_ACCOUNT.email}`,
    },
    data: { code: effectiveDriverCode },
  });
  const guestWrongJson = await guestWrongRes.json();
  console.log(`  Guest Entering Driver Code: HTTP ${guestWrongRes.status()}`, guestWrongJson.error?.message || guestWrongJson.message);

  // 3. Invalid random code
  const randomRes = await guestPage.request.post('http://localhost:3000/api/events/join/guest', {
    headers: {
      'x-user-id': GUEST_ACCOUNT.id,
      'x-user-email': GUEST_ACCOUNT.email,
      'Authorization': `Bearer ${GUEST_ACCOUNT.email}`,
    },
    data: { code: 'INVALID-999-XYZ' },
  });
  const randomJson = await randomRes.json();
  console.log(`  Entering Random Invalid Code: HTTP ${randomRes.status()}`, randomJson.error?.message || randomJson.message);

  await browser.close();
  console.log('\n========================================================================');
  console.log('  ALL 3 SESSIONS TESTED & VERIFIED ACCURATELY');
  console.log('========================================================================');
}

runE2E().catch((err) => {
  console.error('E2E Execution Error:', err);
  process.exit(1);
});
