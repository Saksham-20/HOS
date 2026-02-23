exports.up = async (knex) => {
  await knex.raw(`
    CREATE OR REPLACE VIEW daily_hours_view AS
    SELECT 
      le.driver_id,
      (le.start_time)::date AS log_date,
      st.code,
      SUM(
        CASE 
          WHEN le.end_time IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (le.end_time - le.start_time)) / 3600.0
          WHEN (le.start_time)::date = CURRENT_DATE 
          THEN EXTRACT(EPOCH FROM (NOW() - le.start_time)) / 3600.0
          ELSE 0
        END
      ) AS hours
    FROM log_entries le
    JOIN status_types st ON le.status_id = st.id
    GROUP BY le.driver_id, (le.start_time)::date, st.code
  `);
};

exports.down = async (knex) => {
  await knex.raw('DROP VIEW IF EXISTS daily_hours_view');
};
