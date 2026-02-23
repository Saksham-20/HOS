const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  await knex('status_types').insert([
    { code: 'OFF_DUTY', name: 'Off Duty', description: 'Driver is off duty', is_driving: false },
    { code: 'SLEEPER', name: 'Sleeper Berth', description: 'Driver is in sleeper berth', is_driving: false },
    { code: 'ON_DUTY', name: 'On Duty', description: 'Driver is on duty but not driving', is_driving: false },
    { code: 'DRIVING', name: 'Driving', description: 'Driver is actively driving', is_driving: true }
  ]).onConflict('code').ignore();

  const existingCarriers = await knex('carriers').select('id', 'name').limit(2);
  let carrier1Id = existingCarriers.find((c) => c.name && c.name.includes('1'))?.id;
  let carrier2Id = existingCarriers.find((c) => c.name && c.name.includes('2'))?.id;
  if (!carrier1Id) {
    const [r1] = await knex('carriers').insert({ name: 'Test Carrier 1', dot_number: '123456' }).returning('id');
    carrier1Id = r1?.id ?? 1;
  }
  if (!carrier2Id) {
    const [r2] = await knex('carriers').insert({ name: 'Test Carrier 2', dot_number: '789012' }).returning('id');
    carrier2Id = r2?.id ?? 2;
  }

  const truckCount = await knex('trucks').count('* as c').first();
  if (Number(truckCount?.c || 0) === 0) {
    await knex('trucks').insert([
      { carrier_id: carrier1Id, unit_number: 'TRUCK001' },
      { carrier_id: carrier2Id, unit_number: 'TRUCK002' }
    ]);
  }

  const driverHash = await bcrypt.hash('123456789', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  await knex('drivers').insert([
    {
      carrier_id: carrier1Id,
      username: 'testdriver',
      password_hash: driverHash,
      email: 'test@trucklogpro.com',
      full_name: 'Test Driver',
      license_number: 'D123456789',
      license_state: 'CA'
    },
    {
      carrier_id: carrier2Id,
      username: 'nishant',
      password_hash: driverHash,
      email: 'nishant@example.com',
      full_name: 'Nishant Kumar',
      license_number: 'D456789123',
      license_state: 'FL'
    }
  ]).onConflict('username').ignore();

  await knex('admins').insert({
    username: 'admin',
    password_hash: adminHash,
    role: 'admin'
  }).onConflict('username').merge(['password_hash', 'role']);

  const drivers = await knex('drivers').select('id', 'username').whereIn('username', ['testdriver', 'nishant']).orderBy('id');
  const trucks = await knex('trucks').select('id').orderBy('id');
  const existing = await knex('driver_truck_assignments').count('* as c').first();
  if (Number(existing?.c || 0) === 0) {
    for (let i = 0; i < drivers.length && i < trucks.length; i++) {
      await knex('driver_truck_assignments').insert({
        driver_id: drivers[i].id,
        truck_id: trucks[i].id,
        is_active: true
      });
    }
  }
};
