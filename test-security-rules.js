const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');

// Gate CI: any failed assertion aborts with a non-zero exit code instead of
// merely logging to console.error (which would let a broken rule pass the
// build). Each check pushes into `failures`; we exit(1) if anything failed.
const failures = [];

async function check(label, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${label}`);
  } catch (err) {
    failures.push({ label, err });
    console.error(`❌ FAIL: ${label}:`, err && err.message ? err.message : err);
  }
}

async function main() {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: 'matchflow-demo',
    firestore: {
      rules: rules,
      host: '127.0.0.1',
      port: 8080
    }
  });

  console.log('Testing security rules...');

  const fanContext = testEnv.authenticatedContext('fan_user_id', { role: 'fan' });
  const fanDb = fanContext.firestore();

  await check('Fan was rejected from reading /incidents', async () => {
    await assertFails(fanDb.collection('incidents').get());
  });

  const volunteerContext = testEnv.authenticatedContext('volunteer_user_id', { role: 'volunteer' });
  const volunteerDb = volunteerContext.firestore();

  await check('Volunteer was rejected from reading /incidents', async () => {
    await assertFails(volunteerDb.collection('incidents').get());
  });

  const staffContext = testEnv.authenticatedContext('staff_user_id', { role: 'staff' });
  const staffDb = staffContext.firestore();

  await check('Staff was allowed to read /incidents', async () => {
    await assertSucceeds(staffDb.collection('incidents').get());
  });

  // Seed a report owned by another user (rules disabled).
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('reports').doc('report_1').set({
      authorId: 'other_user',
      category: 'crowd',
      description: 'Bottleneck at Gate 1'
    });
  });

  await check("Volunteer was rejected from reading other user's report", async () => {
    await assertFails(volunteerDb.collection('reports').doc('report_1').get());
  });

  // Seed a report owned by the volunteer (rules disabled).
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('reports').doc('report_2').set({
      authorId: 'volunteer_user_id',
      category: 'crowd',
      description: 'Crowded escalator'
    });
  });

  await check("Volunteer was allowed to read their own report", async () => {
    await assertSucceeds(volunteerDb.collection('reports').doc('report_2').get());
  });

  await testEnv.cleanup();

  if (failures.length > 0) {
    console.error(`\n${failures.length} security-rules check(s) FAILED.`);
    process.exit(1);
  }
  console.log('All security-rules tests passed.');
}

main().catch((err) => {
  console.error('Security-rules test harness error:', err);
  process.exit(1);
});
