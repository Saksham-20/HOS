exports.up = async (knex) => {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS carriers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      dot_number VARCHAR(20),
      address TEXT,
      phone VARCHAR(20),
      email VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS trucks (
      id SERIAL PRIMARY KEY,
      carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
      unit_number VARCHAR(50) NOT NULL,
      vin VARCHAR(17),
      year INTEGER,
      make VARCHAR(100),
      model VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS drivers (
      id SERIAL PRIMARY KEY,
      carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      full_name VARCHAR(255) NOT NULL,
      license_number VARCHAR(50) NOT NULL,
      license_state VARCHAR(2) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      last_login TIMESTAMP,
      last_activity TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS driver_truck_assignments (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
      is_active BOOLEAN DEFAULT TRUE,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      unassigned_at TIMESTAMP
    )
  `);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS status_types (
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      is_driving BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS log_entries (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
      status_id INTEGER REFERENCES status_types(id) ON DELETE CASCADE,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      location VARCHAR(255),
      address VARCHAR(255),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      accuracy DECIMAL(8, 2),
      odometer_start INTEGER DEFAULT 0,
      odometer_end INTEGER DEFAULT 0,
      notes TEXT,
      is_submitted BOOLEAN DEFAULT FALSE,
      submitted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS driver_locations (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER UNIQUE REFERENCES drivers(id) ON DELETE CASCADE,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      accuracy DECIMAL(8, 2),
      altitude DECIMAL(8, 2),
      heading DECIMAL(5, 2),
      speed DECIMAL(8, 2),
      address TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS location_history (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      accuracy DECIMAL(8, 2),
      altitude DECIMAL(8, 2),
      heading DECIMAL(5, 2),
      speed DECIMAL(8, 2),
      address TEXT,
      status VARCHAR(20),
      odometer_reading INTEGER,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS vehicle_inspections (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
      inspection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      inspection_type VARCHAR(50) NOT NULL,
      odometer_reading INTEGER DEFAULT 0,
      location VARCHAR(255),
      brakes_ok BOOLEAN,
      tires_ok BOOLEAN,
      lights_ok BOOLEAN,
      mirrors_ok BOOLEAN,
      horn_ok BOOLEAN,
      windshield_ok BOOLEAN,
      emergency_equipment_ok BOOLEAN,
      fluid_levels_ok BOOLEAN,
      defects_found TEXT,
      is_passed BOOLEAN DEFAULT FALSE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS violations (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      violation_type VARCHAR(100) NOT NULL,
      violation_date TIMESTAMP NOT NULL,
      description TEXT,
      severity VARCHAR(20) DEFAULT 'MEDIUM',
      is_resolved BOOLEAN DEFAULT FALSE,
      resolved_at TIMESTAMP,
      resolved_notes TEXT,
      resolved_by INTEGER REFERENCES drivers(id),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'admin',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )
  `);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      token VARCHAR(500) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS driver_messages (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      sent_by VARCHAR(50) NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      message_type VARCHAR(50) DEFAULT 'admin_alert',
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMP
    )
  `);
};

exports.down = async (knex) => {
  const tables = [
    'driver_messages', 'sessions', 'admins', 'violations', 'vehicle_inspections',
    'location_history', 'driver_locations', 'log_entries', 'status_types',
    'driver_truck_assignments', 'drivers', 'trucks', 'carriers'
  ];
  for (const table of tables) {
    await knex.raw(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }
};
