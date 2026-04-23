-- 15_whatsapp_config.sql
-- Add WhatsApp support flag, auto weekly results toggle, and notification logging table

ALTER TABLE institutes ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE institutes ADD COLUMN IF NOT EXISTS auto_weekly_results BOOLEAN DEFAULT FALSE;

-- Track all outgoing notifications across channels for audit + analytics
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID REFERENCES institutes(id),
  student_id UUID REFERENCES students(id),
  channel TEXT NOT NULL CHECK (channel IN ('push', 'whatsapp', 'sms')),
  template_name TEXT,
  recipient_phone TEXT,
  message_preview TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'read')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_institute ON notification_logs(institute_id);
CREATE INDEX idx_notification_logs_student ON notification_logs(student_id);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at DESC);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_logs_admin_all" ON notification_logs
  FOR ALL USING (get_my_role() IN ('admin', 'super_admin'));
