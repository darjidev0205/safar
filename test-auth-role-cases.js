import http from 'http';

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

async function runTests() {
  console.log('====================================================');
  console.log('SAFAR PRODUCTION AUTH & ROLE MANAGEMENT TEST SUITE');
  console.log('Testing Real Database & API Endpoints on http://localhost:3000');
  console.log('====================================================\n');

  const ts = Date.now();
  const hostEmail = `host.user.${ts}@safar.events`;
  const guestEmail = `guest.user.${ts}@safar.events`;
  const driverEmail = `driver.user.${ts}@safar.events`;
  const attackerDriverEmail = `hacker.driver.${ts}@safar.events`;

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

  try {
    // -------------------------------------------------------------
    // CASE 1: New email -> Host registration -> successful
    // -------------------------------------------------------------
    console.log('--- TEST 1: New email -> Host registration ---');
    // Pre-flight check
    const valHostRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/validate-role',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: hostEmail, role: 'host' });
    assert(valHostRes.status === 200 && valHostRes.data.allowed === true, 'Pre-flight validate-role allowed new host email');

    // Register host
    const regHostRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: hostEmail,
      fullName: 'Safar Host Admin',
      role: 'host',
      firebaseUid: `fb_host_${ts}`,
    });
    assert(regHostRes.status === 200 && regHostRes.data.success === true, 'Host registration in real DB succeeded');
    const hostUser = regHostRes.data.user;
    assert(hostUser && hostUser.role === 'EVENT_ORGANIZER', 'User assigned EVENT_ORGANIZER role in DB');

    // -------------------------------------------------------------
    // CASE 2: Same email -> Guest registration -> BLOCKED (ONE EMAIL = ONE ROLE)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Same host email -> Guest registration -> BLOCKED ---');
    const valHostAsGuestRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/validate-role',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: hostEmail, role: 'guest' });
    assert(valHostAsGuestRes.status === 403 && valHostAsGuestRes.data.code === 'ONE_EMAIL_ONE_ROLE_VIOLATION', 'Pre-flight correctly blocked host email from guest role with 403 ONE_EMAIL_ONE_ROLE_VIOLATION');

    const regHostAsGuestRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: hostEmail,
      fullName: 'Impostor Guest',
      role: 'guest',
      firebaseUid: `fb_impostor_guest_${ts}`,
    });
    assert(regHostAsGuestRes.status === 403 && regHostAsGuestRes.data.code === 'ONE_EMAIL_ONE_ROLE_VIOLATION', 'Registration API strictly blocked host email from registering as guest with 403');

    // -------------------------------------------------------------
    // CASE 3: Same email -> Driver registration -> BLOCKED
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Same host email -> Driver registration -> BLOCKED ---');
    const valHostAsDriverRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/validate-role',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: hostEmail, role: 'driver' });
    assert(valHostAsDriverRes.status === 403 && valHostAsDriverRes.data.code === 'ONE_EMAIL_ONE_ROLE_VIOLATION', 'Pre-flight correctly blocked host email from driver role with 403 ONE_EMAIL_ONE_ROLE_VIOLATION');

    const regHostAsDriverRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: hostEmail,
      fullName: 'Impostor Driver',
      role: 'driver',
      firebaseUid: `fb_impostor_driver_${ts}`,
    });
    assert(regHostAsDriverRes.status === 403 && regHostAsDriverRes.data.code === 'ONE_EMAIL_ONE_ROLE_VIOLATION', 'Registration API strictly blocked host email from registering as driver with 403');

    // -------------------------------------------------------------
    // CASE 4: New email -> Guest registration -> successful
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: New email -> Guest registration ---');
    const regGuestRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: guestEmail,
      fullName: 'Priya Sharma (Guest)',
      role: 'guest',
      firebaseUid: `fb_guest_${ts}`,
    });
    assert(regGuestRes.status === 200 && regGuestRes.data.success === true, 'Guest registration in real DB succeeded');
    const guestUser = regGuestRes.data.user;
    assert(guestUser && guestUser.role === 'GUEST', 'User assigned GUEST role in DB');

    // -------------------------------------------------------------
    // CASE 5: Same guest email -> Driver registration -> BLOCKED
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Same guest email -> Driver registration -> BLOCKED ---');
    const valGuestAsDriverRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/validate-role',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: guestEmail, role: 'driver' });
    assert(valGuestAsDriverRes.status === 403 && valGuestAsDriverRes.data.code === 'ONE_EMAIL_ONE_ROLE_VIOLATION', 'Pre-flight blocked guest email from driver role with 403');

    const regGuestAsDriverRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: guestEmail,
      fullName: 'Guest Trying Driver',
      role: 'driver',
      firebaseUid: `fb_guest_as_driver_${ts}`,
    });
    assert(regGuestAsDriverRes.status === 403 && regGuestAsDriverRes.data.code === 'ONE_EMAIL_ONE_ROLE_VIOLATION', 'Registration API blocked guest email from registering as driver with 403');

    // -------------------------------------------------------------
    // CASE 6: New email -> Driver registration -> successful
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: New email -> Driver registration ---');
    const regDriverRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: driverEmail,
      fullName: 'Rajesh Kumar (Driver)',
      role: 'driver',
      phoneNumber: `+9198${ts.toString().slice(-8)}`,
      firebaseUid: `fb_driver_${ts}`,
    });
    console.log('regDriverRes:', JSON.stringify(regDriverRes));
    assert(regDriverRes.status === 200 && regDriverRes.data.success === true, 'Driver registration in real DB succeeded');
    const driverUser = regDriverRes.data.user;
    assert(driverUser && driverUser.role === 'DRIVER', 'User assigned DRIVER role in DB');

    // Also register an attacker driver to test cross-profile modification blocking
    const regAttackerRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: attackerDriverEmail,
      fullName: 'Malicious Driver',
      role: 'driver',
      firebaseUid: `fb_attacker_${ts}`,
    });
    const attackerUser = regAttackerRes.data.user;

    // -------------------------------------------------------------
    // CASE 7: Driver edits name & mobile & address -> database updates
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Driver edits profile fields in real DB ---');
    const updatedPhone = `+9199${ts.toString().slice(-8)}`;
    const updateProfileRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/driver/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': driverUser.id,
      },
    }, {
      targetUserId: driverUser.id,
      fullName: 'Rajesh Singh Kumar',
      phoneNumber: updatedPhone,
      address: 'Plot 42, Civil Lines, Jaipur, Rajasthan',
      emergencyContact: '+91 91234 56789 (Brother)',
      licenseNumber: 'RJ14-2021-0089123',
      vehicleInfo: 'Toyota Innova Crysta (Silver) - RJ14 TA 5544',
    });
    assert(updateProfileRes.status === 200 && updateProfileRes.data.success === true, 'Driver profile update returned 200 OK');

    // -------------------------------------------------------------
    // CASE 8: Driver refreshes / reads profile -> updated information remains
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Driver reads profile from DB (Refresh verification) ---');
    const getProfileRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/driver/profile?userId=${driverUser.id}`,
      method: 'GET',
      headers: { 'x-user-id': driverUser.id },
    });
    assert(getProfileRes.status === 200, 'GET /api/driver/profile returned 200 OK');
    const p = getProfileRes.data.profile;
    assert(p.fullName === 'Rajesh Singh Kumar', `Profile fullName updated: ${p.fullName}`);
    assert(p.phoneNumber === updatedPhone, `Profile phone updated: ${p.phoneNumber}`);
    assert(p.address === 'Plot 42, Civil Lines, Jaipur, Rajasthan', `Profile address persisted: ${p.address}`);
    assert(p.emergencyContact === '+91 91234 56789 (Brother)', `Emergency contact persisted: ${p.emergencyContact}`);
    assert(p.vehicleInfo === 'Toyota Innova Crysta (Silver) - RJ14 TA 5544', `Vehicle info persisted: ${p.vehicleInfo}`);

    // -------------------------------------------------------------
    // CASE 9: Driver attempts to edit another driver's profile -> BLOCKED
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Driver attempts to edit another driver profile -> BLOCKED ---');
    const hackAttemptRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/driver/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': attackerUser.id, // Caller is attacker
      },
    }, {
      targetUserId: driverUser.id, // Target is victim driver!
      fullName: 'Hacked By Attacker',
      phoneNumber: '+91 00000 00000',
    });
    assert(
      hackAttemptRes.status === 403 && hackAttemptRes.data.code === 'FORBIDDEN_RESOURCE',
      'Cross-driver profile edit strictly rejected with 403 FORBIDDEN_RESOURCE'
    );

    // Verify victim's data was not changed
    const verifyUnchangedRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/driver/profile?userId=${driverUser.id}`,
      method: 'GET',
      headers: { 'x-user-id': driverUser.id },
    });
    assert(
      verifyUnchangedRes.data.profile.fullName === 'Rajesh Singh Kumar',
      'Victim driver profile remained completely intact in database'
    );

    // -------------------------------------------------------------
    // CASE 10: Attempt to tamper sensitive admin fields -> Ignored / Unchanged
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Attempt to tamper approvalStatus & isVerified ---');
    const tamperRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/driver/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': driverUser.id,
      },
    }, {
      targetUserId: driverUser.id,
      approvalStatus: 'SUPER_ADMIN_APPROVED',
      isVerified: false,
    });
    const checkTamperRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/driver/profile?userId=${driverUser.id}`,
      method: 'GET',
      headers: { 'x-user-id': driverUser.id },
    });
    assert(
      checkTamperRes.data.profile.approvalStatus === 'APPROVED',
      'Sensitive approvalStatus cannot be tampered by user'
    );

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
