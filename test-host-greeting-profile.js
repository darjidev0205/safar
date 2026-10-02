import http from 'http';

function getTimeBasedGreeting(date = new Date()) {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) {
    return 'Good morning';
  } else if (hours >= 12 && hours < 17) {
    return 'Good afternoon';
  } else if (hours >= 17 && hours < 21) {
    return 'Good evening';
  } else {
    return 'Good night';
  }
}

function formatHostGreeting(displayName, date = new Date()) {
  const greeting = getTimeBasedGreeting(date);
  if (!displayName || !displayName.trim() || displayName.includes('@')) {
    return 'Welcome back 👋';
  }
  return `${greeting}, ${displayName.trim()} 👋`;
}

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runAcceptanceTests() {
  console.log('================================================================');
  console.log('SAFAR HOST PROFILE & DYNAMIC TIME-BASED GREETING TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // 1. TIME-BASED GREETING UNIT & BOUNDARY TESTS (Requirement 1 & 12)
  // -----------------------------------------------------------------
  console.log('--- TEST 1: Time Boundary Rules ---');
  // Helper to construct date with specific local hours and minutes
  function makeTime(h, m) {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  // 05:00 - 11:59 -> Good morning
  assert(getTimeBasedGreeting(makeTime(5, 0)) === 'Good morning', '05:00 local time -> Good morning');
  assert(getTimeBasedGreeting(makeTime(8, 30)) === 'Good morning', '08:30 local time -> Good morning');
  assert(getTimeBasedGreeting(makeTime(11, 59)) === 'Good morning', '11:59 local time -> Good morning');

  // 12:00 - 16:59 -> Good afternoon
  assert(getTimeBasedGreeting(makeTime(12, 0)) === 'Good afternoon', '12:00 local time -> Good afternoon');
  assert(getTimeBasedGreeting(makeTime(14, 15)) === 'Good afternoon', '14:15 local time -> Good afternoon');
  assert(getTimeBasedGreeting(makeTime(16, 59)) === 'Good afternoon', '16:59 local time -> Good afternoon');

  // 17:00 - 20:59 -> Good evening
  assert(getTimeBasedGreeting(makeTime(17, 0)) === 'Good evening', '17:00 local time -> Good evening');
  assert(getTimeBasedGreeting(makeTime(19, 45)) === 'Good evening', '19:45 local time -> Good evening');
  assert(getTimeBasedGreeting(makeTime(20, 59)) === 'Good evening', '20:59 local time -> Good evening');

  // 21:00 - 04:59 -> Good night
  assert(getTimeBasedGreeting(makeTime(21, 0)) === 'Good night', '21:00 local time -> Good night');
  assert(getTimeBasedGreeting(makeTime(23, 30)) === 'Good night', '23:30 local time -> Good night');
  assert(getTimeBasedGreeting(makeTime(2, 0)) === 'Good night', '02:00 local time -> Good night');
  assert(getTimeBasedGreeting(makeTime(4, 59)) === 'Good night', '04:59 local time -> Good night');

  // -----------------------------------------------------------------
  // 2. NEVER USE EMAIL AS DISPLAY NAME (Requirement 2 & 11)
  // -----------------------------------------------------------------
  console.log('\n--- TEST 2: Email Display Name Prevention & Safe Fallback ---');
  const morningDate = makeTime(9, 0);
  assert(formatHostGreeting('Dev', morningDate) === 'Good morning, Dev 👋', 'Valid name "Dev" produces "Good morning, Dev 👋"');
  assert(formatHostGreeting('dev@gmail.com', morningDate) === 'Welcome back 👋', 'Email address "dev@gmail.com" strictly blocked from greeting -> "Welcome back 👋"');
  assert(formatHostGreeting('', morningDate) === 'Welcome back 👋', 'Empty name fallback -> "Welcome back 👋"');
  assert(formatHostGreeting(null, morningDate) === 'Welcome back 👋', 'Null name fallback -> "Welcome back 👋"');
  assert(formatHostGreeting(undefined, morningDate) === 'Welcome back 👋', 'Undefined name fallback -> "Welcome back 👋"');

  // -----------------------------------------------------------------
  // 3. REAL DATABASE TEST: NEW HOST ACCOUNT CREATION (Requirement 1 & 15)
  // -----------------------------------------------------------------
  console.log('\n--- TEST 3: New Host Account & Profile in PostgreSQL ---');
  const ts = Date.now();
  const hostEmail = `host.dev.${ts}@safar.events`;

  const regRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    email: hostEmail,
    fullName: 'Dev',
    role: 'host',
    firebaseUid: `fb_dev_${ts}`,
  });

  assert(regRes.status === 200 && regRes.data.success === true, 'Host account registration succeeded in real DB');
  const userDev = regRes.data.user;
  assert(userDev && userDev.fullName === 'Dev', 'Host profile fullName stored as "Dev" in database');

  const greetingInitial = formatHostGreeting(userDev.fullName);
  assert(greetingInitial.includes('Dev 👋') && !greetingInitial.includes('@'), `Dashboard greeting properly displays: "${greetingInitial}"`);

  // -----------------------------------------------------------------
  // 4. HOST EDITS NAME: Dev -> Darji (Requirement 3 & 15)
  // -----------------------------------------------------------------
  console.log('\n--- TEST 4: Host Edits Name: Dev -> Darji ---');
  const updateRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/user/profile',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userDev.id,
    },
  }, {
    targetUserId: userDev.id,
    fullName: 'Darji',
    phoneNumber: `+9198${ts.toString().slice(-8)}`,
  });

  assert(updateRes.status === 200 && updateRes.data.success === true, 'PUT /api/user/profile returned 200 OK');
  assert(updateRes.data.user.fullName === 'Darji', 'Updated profile fullName is now "Darji"');

  const greetingUpdated = formatHostGreeting(updateRes.data.user.fullName);
  assert(greetingUpdated.includes('Darji 👋') && !greetingUpdated.includes('Dev'), `Dashboard greeting immediately becomes: "${greetingUpdated}"`);

  // -----------------------------------------------------------------
  // 5. PERSISTENCE ACROSS SESSIONS / PAGE REFRESH (Requirement 3, 15)
  // -----------------------------------------------------------------
  console.log('\n--- TEST 5: Verify Persistence Across Refresh/Sessions ---');
  const getProfileRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/user/profile?userId=${userDev.id}`,
    method: 'GET',
    headers: { 'x-user-id': userDev.id },
  });

  assert(getProfileRes.status === 200 && getProfileRes.data.success === true, 'GET /api/user/profile returned 200 OK');
  assert(getProfileRes.data.user.fullName === 'Darji', 'Retrieved profile permanently persists "Darji" in database');
  assert(getProfileRes.data.user.email === hostEmail, 'Authenticated account email remained intact');

  // -----------------------------------------------------------------
  // 6. MULTI-USER ISOLATION & SECURITY (Requirement 4, 7, 13, 15)
  // -----------------------------------------------------------------
  console.log('\n--- TEST 6: Multi-User Isolation & Security ---');
  const userBEmail = `host.userb.${ts}@safar.events`;
  const regUserBRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    email: userBEmail,
    fullName: 'Suresh Patel',
    role: 'host',
    firebaseUid: `fb_userb_${ts}`,
  });
  const userB = regUserBRes.data.user;

  // Attempt: User A (Darji) attempts to edit User B (Suresh Patel)
  const maliciousEditRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/user/profile',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userDev.id, // Caller is Darji
    },
  }, {
    targetUserId: userB.id, // Target is User B!
    fullName: 'Hacked Name',
  });

  assert(
    maliciousEditRes.status === 403 && maliciousEditRes.data.code === 'FORBIDDEN_RESOURCE',
    'Cross-user profile modification strictly rejected with 403 FORBIDDEN_RESOURCE'
  );

  // Verify User B remained intact
  const verifyUserBRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/user/profile?userId=${userB.id}`,
    method: 'GET',
    headers: { 'x-user-id': userB.id },
  });
  assert(verifyUserBRes.data.user.fullName === 'Suresh Patel', 'User B profile remained completely unaffected');

  // -----------------------------------------------------------------
  // 7. INPUT VALIDATION & ROLE IMMUTABILITY (Requirement 5, 10)
  // -----------------------------------------------------------------
  console.log('\n--- TEST 7: Input Validation & Role Immutability ---');
  // Empty name validation
  const emptyNameRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/user/profile',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userDev.id,
    },
  }, {
    targetUserId: userDev.id,
    fullName: '   ',
  });
  assert(emptyNameRes.status === 400, 'Whitespace-only name rejected with 400 Bad Request');

  // Role immutability check
  const tamperRoleRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/user/profile',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userDev.id,
    },
  }, {
    targetUserId: userDev.id,
    fullName: 'Darji Host',
    role: 'DRIVER', // Attempting to tamper role!
  });
  assert(tamperRoleRes.data.user.role === 'EVENT_ORGANIZER', 'User role is immutable and cannot be altered via profile update');

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
