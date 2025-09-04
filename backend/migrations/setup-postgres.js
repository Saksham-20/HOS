// PostgreSQL database setup and migration script
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function setupPostgreSQL() {
  let pool;
  
  try {
    console.log('🔄 Setting up PostgreSQL database...');
    
    // Create connection pool
    let config;
    
    if (process.env.DATABASE_URL) {
      config = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      };
    } else {
      config = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'trucklog_pro',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      };
    }
    
    pool = new Pool(config);
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Create tables
    await createTables(client);
    
    // Insert initial data
    await insertInitialData(client);
    
    client.release();
    console.log('🎉 PostgreSQL database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up PostgreSQL database:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

async function createTables(client) {
  console.log('📋 Creating database tables...');
  
  // Create carriers table
  await client.query(`
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
  
  // Create trucks table
  await client.query(`
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
  
  // Create drivers table
  await client.query(`
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
  
  // Create driver_truck_assignments table
  await client.query(`
    CREATE TABLE IF NOT EXISTS driver_truck_assignments (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
      is_active BOOLEAN DEFAULT TRUE,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      unassigned_at TIMESTAMP
    )
  `);
  
  // Create status_types table
  await client.query(`
    CREATE TABLE IF NOT EXISTS status_types (
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      is_driving BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create log_entries table
  await client.query(`
    CREATE TABLE IF NOT EXISTS log_entries (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      status_id INTEGER REFERENCES status_types(id) ON DELETE CASCADE,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      location VARCHAR(255),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      odometer_start INTEGER DEFAULT 0,
      odometer_end INTEGER DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create driver_locations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS driver_locations (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      accuracy DECIMAL(8, 2),
      altitude DECIMAL(8, 2),
      heading DECIMAL(5, 2),
      speed DECIMAL(8, 2),
      address TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create location_history table
  await client.query(`
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
  
  // Create violations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS violations (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      violation_type VARCHAR(100) NOT NULL,
      violation_date TIMESTAMP NOT NULL,
      description TEXT,
      severity VARCHAR(20) DEFAULT 'MEDIUM',
      is_resolved BOOLEAN DEFAULT FALSE,
      resolved_at TIMESTAMP,
      resolved_by INTEGER REFERENCES drivers(id),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create admins table
  await client.query(`
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
  
  // Create sessions table
  await client.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
      token VARCHAR(500) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create driver_messages table
  await client.query(`
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
  
  console.log('✅ All tables created successfully');
}

async function insertInitialData(client) {
  console.log('📊 Inserting initial data...');
  
  // Insert status types
  await client.query(`
    INSERT INTO status_types (code, name, description, is_driving) VALUES
    ('OFF_DUTY', 'Off Duty', 'Driver is off duty and not available', false),
    ('SLEEPER', 'Sleeper Berth', 'Driver is in sleeper berth', false),
    ('ON_DUTY', 'On Duty', 'Driver is on duty but not driving', false),
    ('DRIVING', 'Driving', 'Driver is actively driving', true)
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Insert sample carriers
  const carrierResult = await client.query(`
    INSERT INTO carriers (name, dot_number, address, phone, email) VALUES
    ('Test Carrier 1', '123456', '123 Main St, City, State', '555-0123', 'contact@testcarrier1.com'),
    ('Test Carrier 2', '789012', '456 Oak Ave, City, State', '555-0456', 'contact@testcarrier2.com'),
    ('Test Carrier 3', '345678', '789 Pine Rd, City, State', '555-0789', 'contact@testcarrier3.com')
    ON CONFLICT DO NOTHING
    RETURNING id
  `);
  
  // Get carrier IDs
  const carriers = await client.query('SELECT id, name FROM carriers ORDER BY id');
  const carrierMap = {};
  carriers.rows.forEach(carrier => {
    carrierMap[carrier.name] = carrier.id;
  });
  
  // Insert sample trucks
  await client.query(`
    INSERT INTO trucks (carrier_id, unit_number, vin, year, make, model) VALUES
    (${carrierMap['Test Carrier 1'] || 1}, 'TRUCK001', '1HGBH41JXMN109186', 2020, 'Freightliner', 'Cascadia'),
    (${carrierMap['Test Carrier 2'] || 2}, 'TRUCK002', '1HGBH41JXMN109187', 2021, 'Peterbilt', '579'),
    (${carrierMap['Test Carrier 3'] || 3}, 'TRUCK003', '1HGBH41JXMN109188', 2019, 'Volvo', 'VNL')
    ON CONFLICT DO NOTHING
  `);
  
  // Hash passwords
  const driverPassword = await bcrypt.hash('123456789', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  // Insert sample drivers
  await client.query(`
    INSERT INTO drivers (carrier_id, username, password_hash, email, full_name, license_number, license_state) VALUES
    (${carrierMap['Test Carrier 1'] || 1}, 'testdriver', $1, 'test@trucklogpro.com', 'Test Driver', 'D123456789', 'CA'),
    (${carrierMap['Test Carrier 2'] || 2}, 'saksham', $1, 'sakshampanjla@gmail.com', 'Saksham Panjla', 'D987654321', 'TX'),
    (${carrierMap['Test Carrier 2'] || 2}, 'nishant', $1, 'nishant@example.com', 'Nishant Kumar', 'D456789123', 'FL'),
    (${carrierMap['Test Carrier 3'] || 3}, 'testuser', $1, 'test@example.com', 'Test User', 'D789123456', 'NY')
    ON CONFLICT (username) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      license_number = EXCLUDED.license_number,
      license_state = EXCLUDED.license_state
  `, [driverPassword]);
  
  // Insert admin user
  await client.query(`
    INSERT INTO admins (username, password_hash, role) VALUES
    ('admin', $1, 'admin')
    ON CONFLICT (username) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role
  `, [adminPassword]);
  
  // Get driver and truck IDs for assignments
  const drivers = await client.query('SELECT id, username FROM drivers ORDER BY id');
  const trucks = await client.query('SELECT id, unit_number FROM trucks ORDER BY id');
  
  // Create driver-truck assignments
  for (let i = 0; i < drivers.rows.length && i < trucks.rows.length; i++) {
    await client.query(`
      INSERT INTO driver_truck_assignments (driver_id, truck_id) VALUES
      ($1, $2)
      ON CONFLICT DO NOTHING
    `, [drivers.rows[i].id, trucks.rows[i].id]);
  }
  
  console.log('✅ Initial data inserted successfully');
  console.log('📋 Summary:');
  console.log('   - 3 carriers created');
  console.log('   - 3 trucks created');
  console.log('   - 4 drivers created (all with password: 123456789)');
  console.log('   - 1 admin created (password: admin123)');
  console.log('   - Driver-truck assignments created');
  console.log('   - Status types created');
}

// Run the setup
if (require.main === module) {
  setupPostgreSQL()
    .then(() => {
      console.log('🎉 PostgreSQL setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ PostgreSQL setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupPostgreSQL };
