CREATE TABLE "roles" (
  "role_id" integer PRIMARY KEY,
  "role_name" varchar
);

CREATE TABLE "users" (
  "user_id" integer PRIMARY KEY,
  "username" varchar,
  "password" varchar,
  "email" varchar,
  "created_at" datetime,
  "role_id" integer
);

CREATE TABLE "floors" (
  "floor_id" integer PRIMARY KEY,
  "floor_name" varchar
);

CREATE TABLE "rooms" (
  "room_id" integer PRIMARY KEY,
  "room_name" varchar,
  "floor_id" integer
);

CREATE TABLE "room_managements" (
  "user_id" integer,
  "room_id" integer,
  PRIMARY KEY ("user_id", "room_id")
);

CREATE TABLE "devices" (
  "device_id" integer PRIMARY KEY,
  "device_name" varchar,
  "type_id" integer,
  "room_id" integer,
  "status" boolean,
  "threshold_id" integer, 
  "created_at" datetime
);

CREATE TABLE "device_type" (
  "name_type" varchar,
  "type_id" integer PRIMARY
);

CREATE TABLE "sensor_data" (
  "data_id" integer PRIMARY KEY,
  "device_id" integer,
  "value" float,
  "unit" varchar,
  "recorded_at" datetime
);

CREATE TABLE "thresholds" (
  "threshold_id" integer PRIMARY KEY,
  "min_value" float,
  "max_value" float
);

CREATE TABLE "schedule" (
  "schedule_id" integer PRIMARY KEY,
  "room_id" integer,
  "action" varchar,
  "schedule_time" time,
  "repeat_type" varchar,
  "status" boolean
);

CREATE TABLE "activity_log" (
  "log_id" integer PRIMARY KEY,
  "user_id" integer,
  "device_id" integer,
  "action" varchar,
  "action_time" datetime
);

CREATE TABLE "alerts" (
  "alert_id" integer PRIMARY KEY,
  "threshold_id" integer,
  "value" float,
  "message" text,
  "created_at" datetime
);

CREATE TABLE "automation_rules" (
  "rule_id" integer PRIMARY KEY,
  "status" boolean,
  "action" varchar,
  "threshold_id" integer
)

CREATE TABLE "is_monitor" (
  "device_id" integer,
  "rule_id" integer,
  PRIMARY KEY(device_id, rule_id)
)

ALTER TABLE "users" ADD FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "devices" ADD FOREIGN KEY ("type_id") REFERENCES "device_type" ("type_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "rooms" ADD FOREIGN KEY ("floor_id") REFERENCES "floors" ("floor_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "room_managements" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "room_managements" ADD FOREIGN KEY ("room_id") REFERENCES "rooms" ("room_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "devices" ADD FOREIGN KEY ("room_id") REFERENCES "rooms" ("room_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sensor_data" ADD FOREIGN KEY ("device_id") REFERENCES "devices" ("device_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thresholds" ADD FOREIGN KEY ("device_id") REFERENCES "devices" ("device_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "schedule" ADD FOREIGN KEY ("room_id") REFERENCES "rooms" ("room_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "activity_log" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "activity_log" ADD FOREIGN KEY ("device_id") REFERENCES "devices" ("device_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "alerts" ADD FOREIGN KEY ("threshold_id") REFERENCES "threshold" ("threshold_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "devices" ADD FOREIGN KEY ("threshold_id") REFERENCES "threshold" ("threshold_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "automation_rules" ADD FOREIGN KEY ("threshold_id") REFERENCES "threshold" ("threshold_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "is_monitor" ADD FOREIGN KEY ("device_id") REFERENCES "devices" ("device_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "is_monitor" ADD FOREIGN KEY ("rule_id") REFERENCES "automation_rules" ("rule_id") DEFERRABLE INITIALLY IMMEDIATE;
-- Defer constraint checking for INSERT
BEGIN;
SET CONSTRAINTS ALL DEFERRED;

INSERT INTO "users" ("user_id", "username")
VALUES
  (0, 'Alice'),
  (1, 'Bob'),
  (2, 'Candice'),
  (3, 'David');

SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;
