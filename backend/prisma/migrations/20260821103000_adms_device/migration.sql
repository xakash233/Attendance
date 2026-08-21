-- Track eSSL/ZKTeco WiFi push device heartbeats and ATTLOG stamps
CREATE TABLE IF NOT EXISTS "AdmsDevice" (
    "serialNumber" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPushAt" TIMESTAMP(3),
    "attlogStamp" INTEGER NOT NULL DEFAULT 0,
    "lastIp" TEXT,
    CONSTRAINT "AdmsDevice_pkey" PRIMARY KEY ("serialNumber")
);
