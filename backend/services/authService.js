/**
 * Auth business logic: registration, login, logout.
 * Routes call this; no req/res here. Easier to test and reuse.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY_DRIVER = '7d';
const TOKEN_EXPIRY_ADMIN = '8h';

async function register(data) {
  const {
    username, password, fullName, licenseNumber,
    licenseState, carrierName, truckNumber, email = ''
  } = data;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [existingUser] = await connection.query(
      'SELECT id FROM drivers WHERE username = ?',
      [username]
    );
    if (existingUser.length > 0) {
      const err = new Error('Username already exists');
      err.statusCode = 400;
      throw err;
    }

    let carrierId;
    const [carriers] = await connection.query(
      'SELECT id FROM carriers WHERE name = ?',
      [carrierName]
    );
    if (carriers.length > 0) {
      carrierId = carriers[0].id;
      } else {
        const [carrierResult] = await connection.query(
          'INSERT INTO carriers (name) VALUES (?) RETURNING id',
          [carrierName]
        );
        carrierId = carrierResult.insertId;
      }

    let truckId;
    const [trucks] = await connection.query(
      'SELECT id FROM trucks WHERE unit_number = ? AND carrier_id = ?',
      [truckNumber, carrierId]
    );
    if (trucks.length > 0) {
      truckId = trucks[0].id;
      } else {
        const [truckResult] = await connection.query(
          'INSERT INTO trucks (carrier_id, unit_number) VALUES (?, ?) RETURNING id',
          [carrierId, truckNumber]
        );
        truckId = truckResult.insertId;
      }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [driverResult] = await connection.query(
      `INSERT INTO drivers (
        carrier_id, username, password_hash, email,
        full_name, license_number, license_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [carrierId, username, hashedPassword, email, fullName, licenseNumber, licenseState]
    );
    const driverId = driverResult.insertId;

    await connection.query(
      'INSERT INTO driver_truck_assignments (driver_id, truck_id) VALUES (?, ?)',
      [driverId, truckId]
    );

    await connection.commit();
    return { driverId };
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

async function login(username, password) {
  const [drivers] = await db.query(
    `SELECT d.*, c.name as carrier_name
     FROM drivers d
     LEFT JOIN carriers c ON d.carrier_id = c.id
     WHERE d.username = ? AND d.is_active = TRUE`,
    [username]
  );

  if (drivers.length === 0) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const driver = drivers[0];
  const isMatch = await bcrypt.compare(password, driver.password_hash);
  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const [assignments] = await db.query(
    `SELECT t.* FROM driver_truck_assignments dta
     JOIN trucks t ON dta.truck_id = t.id
     WHERE dta.driver_id = ? AND dta.is_active = TRUE`,
    [driver.id]
  );

  const token = jwt.sign(
    { driverId: driver.id },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY_DRIVER }
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.query(
    'INSERT INTO sessions (driver_id, token, expires_at) VALUES (?, ?, ?)',
    [driver.id, token, expiresAt]
  );
  await db.query(
    'UPDATE drivers SET last_login = NOW() WHERE id = ?',
    [driver.id]
  );

  return {
    token,
    driver: {
      id: driver.id,
      name: driver.full_name,
      username: driver.username,
      license: driver.license_number,
      carrier: driver.carrier_name,
      truck: assignments[0]?.unit_number || null
    }
  };
}

async function logout(token) {
  await db.query('DELETE FROM sessions WHERE token = ?', [token]);
  return { message: 'Logged out successfully' };
}

module.exports = { register, login, logout };
