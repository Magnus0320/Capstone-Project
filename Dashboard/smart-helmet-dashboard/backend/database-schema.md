# Smart Helmet Database Schema

**Database:** SQLite (helmet.db)  
**Purpose:** Store historical sensor data, alerts, miner profiles, and rescue operations for the smart helmet monitoring system.  
**Created:** April 5, 2026  
**Technology:** sql.js (pure JavaScript SQLite implementation)

## Database Overview

The database consists of 5 main tables with foreign key relationships to maintain data integrity. All tables use SQLite's built-in rowid as primary key where specified, and include automatic timestamps.

```
┌─────────────┐       ┌─────────────┐
│   miners    │◄──────┤   sensors   │
│             │       │             │
│ miner_id    │       │ miner_id    │
│ name        │       │ timestamp   │
│ contact     │       │ oxygen      │
│ health      │       │ co2         │
└─────────────┘       │ co          │
        ▲             │ ch4         │
        │             │ heart_rate  │
        │             │ temperature │
        │             │ latitude    │
        │             │ longitude   │
        └─────────────┘
              ▲
              │
        ┌─────┴─────┐
        │  alerts   │
        │           │
        │ alert_id  │
        │ miner_id  │
        │ timestamp │
        │ level     │
        │ message   │
        │ sensor_type│
        └───────────┘

┌─────────────┐       ┌─────────────────┐
│  sessions   │       │ rescue_missions │
│             │       │                 │
│ session_id  │       │ mission_id      │
│ miner_id    │       │ miner_id        │
│ start_time  │       │ timestamp       │
│ end_time    │       │ latitude        │
│ location_ct │       │ longitude       │
└─────────────┘       │ gas_hazard_level│
                      │ status          │
                      └─────────────────┘
```

## Table Schemas

### 1. miners Table
Stores information about registered miners.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| miner_id | TEXT | PRIMARY KEY | Unique identifier for each miner |
| name | TEXT | NOT NULL | Miner's full name |
| contact_info | TEXT | - | Contact information (phone, email, etc.) |
| health_profile | TEXT | - | Health conditions or medical notes |
| created_at | TEXT | NOT NULL | ISO timestamp when miner was registered |
| updated_at | TEXT | NOT NULL | ISO timestamp of last profile update |

**Example Data:**
```sql
INSERT INTO miners (miner_id, name, contact_info, health_profile)
VALUES ('MINER-001', 'John Smith', '+1-555-0123', 'Asthma condition');
```

### 2. sensors Table
Stores all sensor readings from the smart helmet.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-generated unique ID |
| timestamp | TEXT | NOT NULL | ISO timestamp of sensor reading |
| miner_id | TEXT | NOT NULL, FK→miners.miner_id | Associated miner |
| oxygen | REAL | - | Oxygen level (%) |
| co2 | REAL | - | CO2 level (ppm) |
| co | REAL | - | CO level (ppm) |
| ch4 | REAL | - | Methane level (%) |
| h2s | REAL | - | H2S level (ppm) |
| heart_rate | REAL | - | Heart rate (BPM) |
| temperature | REAL | - | Temperature (°C) |
| humidity | REAL | - | Humidity (%) |
| obstacle_distance | REAL | - | Distance to obstacles (cm) |
| latitude | REAL | - | GPS latitude |
| longitude | REAL | - | GPS longitude |
| created_at | TEXT | NOT NULL | Database insertion timestamp |

**Alert Thresholds (for reference):**
- Oxygen: Warning < 20.0%, Danger < 19.5%
- CO2: Warning > 1500 ppm, Danger > 2000 ppm
- CO: Warning > 20 ppm, Danger > 35 ppm
- CH4: Warning > 0.5%, Danger > 1.0%

### 3. alerts Table
Stores all alerts generated from sensor threshold violations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique alert ID (timestamp + random) |
| timestamp | TEXT | NOT NULL | ISO timestamp when alert was triggered |
| miner_id | TEXT | NOT NULL, FK→miners.miner_id | Associated miner |
| level | TEXT | NOT NULL, CHECK(level IN ('warning', 'danger')) | Alert severity |
| message | TEXT | NOT NULL | Human-readable alert description |
| sensor_type | TEXT | - | Type of sensor that triggered alert |
| created_at | TEXT | NOT NULL | Database insertion timestamp |

**Example Alert Messages:**
- "Low oxygen level" (danger)
- "CO2 elevated" (warning)
- "Methane detected" (danger)

### 4. sessions Table
Tracks helmet usage sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| session_id | TEXT | PRIMARY KEY | Unique session identifier |
| miner_id | TEXT | NOT NULL, FK→miners.miner_id | Associated miner |
| start_time | TEXT | NOT NULL | ISO timestamp when session started |
| end_time | TEXT | - | ISO timestamp when session ended |
| location_count | INTEGER | DEFAULT 0 | Number of GPS points recorded |
| created_at | TEXT | NOT NULL | Database insertion timestamp |

### 5. rescue_missions Table
Records rescue operations and critical incidents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| mission_id | TEXT | PRIMARY KEY | Unique mission identifier |
| miner_id | TEXT | NOT NULL, FK→miners.miner_id | Miner requiring rescue |
| timestamp | TEXT | NOT NULL | ISO timestamp when mission was initiated |
| latitude | REAL | - | GPS latitude at time of mission |
| longitude | REAL | - | GPS longitude at time of mission |
| oxygen_level | REAL | - | Oxygen level at mission time |
| co2_level | REAL | - | CO2 level at mission time |
| co_level | REAL | - | CO level at mission time |
| ch4_level | REAL | - | CH4 level at mission time |
| h2s_level | REAL | - | H2S level at mission time |
| heart_rate | REAL | - | Heart rate at mission time |
| gas_hazard_level | TEXT | - | Calculated hazard level (normal/warning/critical) |
| status | TEXT | CHECK(status IN ('pending', 'in_progress', 'resolved', 'cancelled')) | Mission status |
| created_at | TEXT | NOT NULL | Database insertion timestamp |
| updated_at | TEXT | NOT NULL | Last status update timestamp |

## Key Relationships

- **miners** is the central table, referenced by all others
- **sensors** and **alerts** are linked to **miners** for multi-user support
- **sessions** track usage periods per miner
- **rescue_missions** capture critical incidents with full context

## Data Flow

1. **Real-time Data:** ESP32 sends sensor data every few seconds
2. **Alert Evaluation:** Backend checks thresholds and creates alerts
3. **Database Storage:** All sensor readings and alerts are persisted
4. **Analytics:** Historical data can be queried for trends and reports
5. **Rescue Operations:** Critical situations trigger mission records

## Query Examples

**Recent sensor readings:**
```sql
SELECT * FROM sensors
WHERE miner_id = 'MINER-001'
ORDER BY timestamp DESC
LIMIT 20;
```

**Alert summary:**
```sql
SELECT level, COUNT(*) as count
FROM alerts
WHERE miner_id = 'MINER-001'
GROUP BY level;
```

**Hourly oxygen averages:**
```sql
SELECT strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
       AVG(oxygen) as avg_oxygen
FROM sensors
WHERE miner_id = 'MINER-001'
GROUP BY hour
ORDER BY hour DESC;
```

## Database Size Estimation

- **sensors:** ~100 bytes per reading (with 9 sensors + metadata)
- **alerts:** ~200 bytes per alert
- **Daily usage:** 8,640 readings (every 10 seconds for 24 hours)
- **Storage:** ~1MB per day per miner (excluding alerts)

This schema supports the smart helmet system's requirements for real-time monitoring, historical analytics, and emergency response tracking.