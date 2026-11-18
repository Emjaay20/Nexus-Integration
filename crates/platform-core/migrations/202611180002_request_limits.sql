CREATE TABLE platform_request_limits (
 key text PRIMARY KEY, window_start bigint NOT NULL, count integer NOT NULL CHECK(count>0), expires_at timestamptz NOT NULL
);
