import { getDatabase, saveDatabase } from './init.js';

export function insertSensorReading(minerId, sensorData, locationData) {
  const db = getDatabase();
  const s = sensorData.sensors;
  const l = locationData;

  db.run(
    `INSERT INTO sensors (
      timestamp, miner_id, oxygen, co2, co, ch4, h2s, 
      heart_rate, temperature, humidity, obstacle_distance, 
      latitude, longitude
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sensorData.timestamp,
      minerId,
      s.oxygen ?? null,
      s.co2 ?? null,
      s.co ?? null,
      s.ch4 ?? null,
      s.h2s ?? null,
      s.heartRate ?? null,
      s.temperature ?? null,
      s.humidity ?? null,
      s.obstacleDistance ?? null,
      l?.lat ?? null,
      l?.lng ?? null
    ]
  );

  saveDatabase();
}

export function insertAlert(alertId, minerId, alertData) {
  const db = getDatabase();

  // Detect sensor type from message
  const message = alertData.message.toLowerCase();
  let sensorType = 'unknown';
  if (message.includes('oxygen')) sensorType = 'oxygen';
  else if (message.includes('co2')) sensorType = 'co2';
  else if (message.includes('co ')) sensorType = 'co';
  else if (message.includes('methane')) sensorType = 'ch4';

  db.run(
    `INSERT INTO alerts (
      id, timestamp, miner_id, level, message, sensor_type
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      alertId,
      new Date().toISOString(),
      minerId,
      alertData.level,
      alertData.message,
      sensorType
    ]
  );

  saveDatabase();
}

export function getSensorReadings(minerId, hoursBack = 24) {
  const db = getDatabase();
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const result = db.exec(
    `SELECT * FROM sensors
    WHERE miner_id = ? AND timestamp > ?
    ORDER BY timestamp DESC`,
    [minerId, cutoffTime]
  );

  return resultToArray(result);
}

export function getAlertHistory(minerId, hoursBack = 24, level = null) {
  const db = getDatabase();
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  let query = `
    SELECT * FROM alerts
    WHERE miner_id = ? AND timestamp > ?
  `;
  const params = [minerId, cutoffTime];

  if (level) {
    query += ' AND level = ?';
    params.push(level);
  }

  query += ' ORDER BY timestamp DESC';

  const result = db.exec(query, params);
  return resultToArray(result);
}

export function getSensorTrends(minerId, sensorName, hoursBack = 24) {
  const db = getDatabase();
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  // Map sensor name to column
  const columnMap = {
    oxygen: 'oxygen',
    co2: 'co2',
    co: 'co',
    ch4: 'ch4',
    h2s: 'h2s',
    heartRate: 'heart_rate',
    temperature: 'temperature',
    humidity: 'humidity',
    obstacleDistance: 'obstacle_distance'
  };

  const column = columnMap[sensorName];
  if (!column) {
    throw new Error(`Unknown sensor: ${sensorName}`);
  }

  const query = `
    SELECT 
      timestamp,
      ${column} as value
    FROM sensors
    WHERE miner_id = ? AND timestamp > ? AND ${column} IS NOT NULL
    ORDER BY timestamp ASC
  `;

  const result = db.exec(query, [minerId, cutoffTime]);
  return resultToArray(result);
}

export function getAverageByHour(minerId, sensorName, hoursBack = 24) {
  const db = getDatabase();
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const columnMap = {
    oxygen: 'oxygen',
    co2: 'co2',
    co: 'co',
    ch4: 'ch4',
    h2s: 'h2s',
    heartRate: 'heart_rate',
    temperature: 'temperature',
    humidity: 'humidity',
    obstacleDistance: 'obstacle_distance'
  };

  const column = columnMap[sensorName];
  if (!column) {
    throw new Error(`Unknown sensor: ${sensorName}`);
  }

  const query = `
    SELECT 
      strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
      AVG(${column}) as avg_value,
      MIN(${column}) as min_value,
      MAX(${column}) as max_value,
      COUNT(*) as reading_count
    FROM sensors
    WHERE miner_id = ? AND timestamp > ? AND ${column} IS NOT NULL
    GROUP BY hour
    ORDER BY hour ASC
  `;

  const result = db.exec(query, [minerId, cutoffTime]);
  return resultToArray(result);
}

export function createRescueMission(missionId, minerId, sensorData, locationData) {
  const db = getDatabase();
  const s = sensorData.sensors;
  const hazardLevel = determinHazardLevel(s);

  db.run(
    `INSERT INTO rescue_missions (
      mission_id, miner_id, timestamp, latitude, longitude,
      oxygen_level, co2_level, co_level, ch4_level, h2s_level,
      heart_rate, gas_hazard_level, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      missionId,
      minerId,
      new Date().toISOString(),
      locationData?.lat ?? null,
      locationData?.lng ?? null,
      s.oxygen ?? null,
      s.co2 ?? null,
      s.co ?? null,
      s.ch4 ?? null,
      s.h2s ?? null,
      s.heartRate ?? null,
      hazardLevel,
      'pending'
    ]
  );

  saveDatabase();
}

function determinHazardLevel(sensors) {
  // Simple logic: if any danger-level threshold is breached, it's critical
  if (sensors.oxygen < 19.5 || sensors.co2 > 2000 || sensors.co > 35 || sensors.ch4 > 1.0) {
    return 'critical';
  }
  if (sensors.oxygen < 20.0 || sensors.co2 > 1500 || sensors.co > 20 || sensors.ch4 > 0.5) {
    return 'warning';
  }
  return 'normal';
}

export function updateMinerProfile(minerId, name, contactInfo, healthProfile) {
  const db = getDatabase();
  db.run(
    `UPDATE miners
    SET name = ?, contact_info = ?, health_profile = ?, updated_at = CURRENT_TIMESTAMP
    WHERE miner_id = ?`,
    [name, contactInfo, healthProfile, minerId]
  );

  saveDatabase();
}

export function getAllMiners() {
  const db = getDatabase();
  const result = db.exec(
    'SELECT * FROM miners ORDER BY created_at DESC'
  );
  return resultToArray(result);
}

export function getMinerLatestData(minerId) {
  const db = getDatabase();
  const result = db.exec(
    `SELECT * FROM sensors
    WHERE miner_id = ?
    ORDER BY timestamp DESC
    LIMIT 1`,
    [minerId]
  );
  const data = resultToArray(result);
  return data.length > 0 ? data[0] : null;
}

// Helper function to convert sql.js result to array of objects
function resultToArray(result) {
  if (!result || result.length === 0) {
    return [];
  }

  const rows = result[0];
  const columns = rows.columns;
  const values = rows.values;

  return values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

