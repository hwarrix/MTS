-- ============================================================
-- Hospital Management App — Initial Schema
-- All timestamps stored in UTC (TIMESTAMPTZ)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'manager')),
  full_name   TEXT NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DOCTOR PROFILES
-- ============================================================
CREATE TABLE doctor_profiles (
  id               UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  specialty        TEXT NOT NULL,
  department       TEXT NOT NULL,
  license_number   TEXT,
  bio              TEXT,
  experience_years INT DEFAULT 0,
  hospital_name    TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by      UUID REFERENCES profiles(id),
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DOCTOR CREDENTIALS (documents stored in private bucket)
-- ============================================================
CREATE TABLE doctor_credentials (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id    UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  file_type    TEXT NOT NULL CHECK (file_type IN ('certificate', 'license', 'cv', 'other')),
  file_name    TEXT NOT NULL,
  storage_path TEXT NOT NULL,  -- path inside private bucket
  mime_type    TEXT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- APPOINTMENT SLOTS (set by doctors/managers, stored UTC)
-- ============================================================
CREATE TABLE appointment_slots (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id    UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  start_time   TIMESTAMPTZ NOT NULL,  -- UTC
  end_time     TIMESTAMPTZ NOT NULL,  -- UTC
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent overlapping slots for same doctor
  CONSTRAINT no_slot_overlap EXCLUDE USING GIST (
    doctor_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
);

CREATE INDEX idx_slots_doctor_time ON appointment_slots(doctor_id, start_time)
  WHERE is_available = TRUE;

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE appointments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id      UUID NOT NULL UNIQUE REFERENCES appointment_slots(id) ON DELETE RESTRICT,
  patient_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  doctor_id    UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE RESTRICT,
  status       TEXT NOT NULL DEFAULT 'scheduled'
               CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  notes        TEXT,
  cancelled_by TEXT CHECK (cancelled_by IN ('patient', 'doctor', 'manager')),
  cancel_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id, status);
CREATE INDEX idx_appointments_doctor  ON appointments(doctor_id, status);

-- ============================================================
-- INSURANCE PROFILES (patient insurance cards)
-- ============================================================
CREATE TABLE insurance_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_name   TEXT NOT NULL,
  policy_number   TEXT NOT NULL,
  group_number    TEXT,
  card_image_path TEXT,  -- path inside private bucket
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by     UUID REFERENCES profiles(id),
  verified_at     TIMESTAMPTZ,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insurance_patient ON insurance_profiles(patient_id);

-- ============================================================
-- INVOICES / BILLING
-- ============================================================
CREATE TABLE invoices (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id           UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  doctor_id                UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
  amount_cents             INT NOT NULL CHECK (amount_cents >= 0),
  currency                 TEXT NOT NULL DEFAULT 'usd',
  description              TEXT,
  status                   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'waived')),
  stripe_payment_intent_id TEXT,
  stripe_customer_id       TEXT,
  due_date                 DATE,
  paid_at                  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_patient ON invoices(patient_id, status);
CREATE INDEX idx_invoices_status  ON invoices(status, due_date);

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  -- 'appointment_reminder' | 'appointment_cancelled' | 'doctor_verified'
  -- 'doctor_rejected' | 'slot_cancelled' | 'invoice_created' | 'payment_confirmed'
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  data         JSONB,
  read_at      TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);

-- ============================================================
-- PUSH TOKENS (per device)
-- ============================================================
CREATE TABLE push_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- ============================================================
-- UPDATED_AT TRIGGER (auto-update timestamps)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_doctor_profiles_updated_at
  BEFORE UPDATE ON doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_insurance_updated_at
  BEFORE UPDATE ON insurance_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON AUTH SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- BOOK APPOINTMENT (transactional, concurrency-safe)
-- Called as RPC from Edge Function
-- ============================================================
CREATE OR REPLACE FUNCTION book_appointment(
  p_slot_id    UUID,
  p_patient_id UUID,
  p_notes      TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_slot        appointment_slots%ROWTYPE;
  v_appointment appointments%ROWTYPE;
BEGIN
  -- Lock the slot row for update (prevents concurrent booking)
  SELECT * INTO v_slot
  FROM appointment_slots
  WHERE id = p_slot_id AND is_available = TRUE
  FOR UPDATE NOWAIT;  -- fail immediately if another transaction has it locked

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Slot is no longer available');
  END IF;

  -- Create the appointment
  INSERT INTO appointments (slot_id, patient_id, doctor_id, notes)
  VALUES (p_slot_id, p_patient_id, v_slot.doctor_id, p_notes)
  RETURNING * INTO v_appointment;

  -- Mark slot as unavailable
  UPDATE appointment_slots
  SET is_available = FALSE
  WHERE id = p_slot_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'appointment_id', v_appointment.id,
    'slot_start', v_slot.start_time,
    'slot_end', v_slot.end_time,
    'doctor_id', v_slot.doctor_id
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Slot is being booked by another user, please try again');
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'This slot has already been booked');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CANCEL APPOINTMENT (frees the slot back)
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_appointment(
  p_appointment_id UUID,
  p_cancelled_by   TEXT,
  p_reason         TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_appt appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_appt
  FROM appointments
  WHERE id = p_appointment_id AND status = 'scheduled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Appointment not found or already cancelled');
  END IF;

  -- Cancel the appointment
  UPDATE appointments
  SET status = 'cancelled', cancelled_by = p_cancelled_by, cancel_reason = p_reason
  WHERE id = p_appointment_id;

  -- Free the slot
  UPDATE appointment_slots
  SET is_available = TRUE
  WHERE id = v_appt.slot_id;

  RETURN jsonb_build_object('success', TRUE, 'slot_id', v_appt.slot_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_credentials    ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens           ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- PROFILES ----
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Managers can view all profiles"
  ON profiles FOR SELECT USING (get_my_role() = 'manager');

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

-- ---- DOCTOR PROFILES ----
CREATE POLICY "Anyone can view approved doctors"
  ON doctor_profiles FOR SELECT USING (status = 'approved');

CREATE POLICY "Doctors can view their own profile"
  ON doctor_profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Managers can view all doctor profiles"
  ON doctor_profiles FOR SELECT USING (get_my_role() = 'manager');

CREATE POLICY "Doctors can update their own profile"
  ON doctor_profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Managers can update doctor profiles"
  ON doctor_profiles FOR UPDATE USING (get_my_role() = 'manager');

CREATE POLICY "Doctors can insert their own profile"
  ON doctor_profiles FOR INSERT WITH CHECK (id = auth.uid());

-- ---- DOCTOR CREDENTIALS ----
CREATE POLICY "Doctors can view/manage their own credentials"
  ON doctor_credentials FOR ALL USING (doctor_id = auth.uid());

CREATE POLICY "Managers can view all credentials"
  ON doctor_credentials FOR SELECT USING (get_my_role() = 'manager');

-- ---- APPOINTMENT SLOTS ----
CREATE POLICY "Anyone authenticated can view available slots"
  ON appointment_slots FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Doctors can manage their own slots"
  ON appointment_slots FOR ALL USING (doctor_id = auth.uid());

CREATE POLICY "Managers can manage all slots"
  ON appointment_slots FOR ALL USING (get_my_role() = 'manager');

-- ---- APPOINTMENTS ----
CREATE POLICY "Patients can view their appointments"
  ON appointments FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view their appointments"
  ON appointments FOR SELECT USING (doctor_id = auth.uid());

CREATE POLICY "Managers can view all appointments"
  ON appointments FOR SELECT USING (get_my_role() = 'manager');

CREATE POLICY "Patients can create appointments (via RPC)"
  ON appointments FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can cancel their appointments (via RPC)"
  ON appointments FOR UPDATE USING (patient_id = auth.uid());

CREATE POLICY "Doctors can update appointment status"
  ON appointments FOR UPDATE USING (doctor_id = auth.uid());

CREATE POLICY "Managers can update any appointment"
  ON appointments FOR UPDATE USING (get_my_role() = 'manager');

-- ---- INSURANCE PROFILES ----
CREATE POLICY "Patients can manage their own insurance"
  ON insurance_profiles FOR ALL USING (patient_id = auth.uid());

CREATE POLICY "Managers can view all insurance profiles"
  ON insurance_profiles FOR SELECT USING (get_my_role() = 'manager');

-- ---- INVOICES ----
CREATE POLICY "Patients can view their own invoices"
  ON invoices FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Managers can view/manage all invoices"
  ON invoices FOR ALL USING (get_my_role() = 'manager');

CREATE POLICY "Doctors can view invoices for their appointments"
  ON invoices FOR SELECT USING (doctor_id = auth.uid());

-- ---- NOTIFICATIONS ----
CREATE POLICY "Users see only their own notifications"
  ON notifications FOR ALL USING (recipient_id = auth.uid());

-- ---- PUSH TOKENS ----
CREATE POLICY "Users manage their own push tokens"
  ON push_tokens FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- STORAGE BUCKETS (run after creating buckets in Supabase UI)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('doctor-credentials', 'doctor-credentials', FALSE),
--   ('insurance-cards', 'insurance-cards', FALSE),
--   ('avatars', 'avatars', TRUE);
