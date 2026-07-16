const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');

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

  // Test 1: Anonymous Fan reading incidents
  const fanContext = testEnv.authenticatedContext('fan_user_id', { role: 'fan' });
  const fanDb = fanContext.firestore();
  
  console.log('Test 1: Fan trying to read /incidents...');
  try {
    await assertFails(fanDb.collection('incidents').get());
    console.log('✅ PASS: Fan was rejected from reading /incidents');
  } catch (err) {
    console.error('❌ FAIL: Fan was NOT rejected from reading /incidents:', err);
  }

  // Test 2: Volunteer trying to read /incidents
  const volunteerContext = testEnv.authenticatedContext('volunteer_user_id', { role: 'volunteer' });
  const volunteerDb = volunteerContext.firestore();
  console.log('Test 2: Volunteer trying to read /incidents...');
  try {
    await assertFails(volunteerDb.collection('incidents').get());
    console.log('✅ PASS: Volunteer was rejected from reading /incidents');
  } catch (err) {
    console.error('❌ FAIL: Volunteer was NOT rejected from reading /incidents:', err);
  }

  // Test 3: Staff trying to read /incidents
  const staffContext = testEnv.authenticatedContext('staff_user_id', { role: 'staff' });
  const staffDb = staffContext.firestore();
  console.log('Test 3: Staff trying to read /incidents...');
  try {
    await assertSucceeds(staffDb.collection('incidents').get());
    console.log('✅ PASS: Staff was allowed to read /incidents');
  } catch (err) {
    console.error('❌ FAIL: Staff was rejected from reading /incidents:', err);
  }

  // Test 4: Volunteer reading someone else\'s report
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('reports').doc('report_1').set({
      authorId: 'other_user',
      category: 'crowd',
      description: 'Bottleneck at Gate 1'
    });
  });

  console.log("Test 4: Volunteer trying to read someone else\'s report (report_1)...");
  try {
    await assertFails(volunteerDb.collection('reports').doc('report_1').get());
    console.log("✅ PASS: Volunteer was rejected from reading other user\'s report");
  } catch (err) {
    console.error("❌ FAIL: Volunteer was NOT rejected from reading other user\'s report:", err);
  }

  // Test 5: Volunteer reading their own report
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('reports').doc('report_2').set({
      authorId: 'volunteer_user_id',
      category: 'crowd',
      description: 'Crowded escalator'
    });
  });

  console.log("Test 5: Volunteer trying to read their own report (report_2)...");
  try {
    await assertSucceeds(volunteerDb.collection('reports').doc('report_2').get());
    console.log("✅ PASS: Volunteer was allowed to read their own report");
  } catch (err) {
    console.error("❌ FAIL: Volunteer was rejected from reading their own report:", err);
  }

  await testEnv.cleanup();
  console.log('All tests completed.');
}

main().catch(console.error);
