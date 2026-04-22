DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leave_final_approval_requires_superadmin_timestamp'
  ) THEN
    ALTER TABLE "LeaveRequest"
    ADD CONSTRAINT leave_final_approval_requires_superadmin_timestamp
    CHECK ("status" <> 'FINAL_APPROVED' OR "superadminApprovedAt" IS NOT NULL)
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leave_final_approval_requires_chain_metadata'
  ) THEN
    ALTER TABLE "LeaveRequest"
    ADD CONSTRAINT leave_final_approval_requires_chain_metadata
    CHECK (
      "status" <> 'FINAL_APPROVED'
      OR (
        "approvedById" IS NOT NULL
        AND "superadminApprovedAt" IS NOT NULL
      )
    )
    NOT VALID;
  END IF;
END
$$;

