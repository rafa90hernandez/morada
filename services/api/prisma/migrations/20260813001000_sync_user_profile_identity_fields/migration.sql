-- Align the committed migration history with the current UserProfile model.
ALTER TABLE "UserProfile"
  ADD COLUMN "fullName" TEXT,
  ADD COLUMN "dateOfBirth" TIMESTAMP(3),
  ADD COLUMN "nationality" TEXT,
  ADD COLUMN "hometown" TEXT;
