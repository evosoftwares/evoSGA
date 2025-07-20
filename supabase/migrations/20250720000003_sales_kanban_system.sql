-- Sales Kanban System Migration
-- Creates the complete database structure for the sales pipeline

-- 1. Create sales_columns table (Sales pipeline stages)
CREATE TABLE sales_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL,
  color VARCHAR(20) DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default sales pipeline stages
INSERT INTO sales_columns (title, position, color) VALUES 
('Leads', 0, 'gray'),
('Qualificados', 1, 'blue'),
('Proposta', 2, 'yellow'),
('Negociação', 3, 'orange'),
('Fechado - Ganho', 4, 'green'),
('Fechado - Perdido', 5, 'red');

-- 2. Create sales_tags table
CREATE TABLE sales_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default sales tags
INSERT INTO sales_tags (name, color) VALUES 
('Hot Lead', '#EF4444'),
('Cold Lead', '#6B7280'),
('Enterprise', '#8B5CF6'),
('SMB', '#10B981'),
('Follow-up', '#F59E0B'),
('Qualificado', '#059669'),
('Demo Agendada', '#7C3AED'),
('Proposta Enviada', '#DC2626');

-- 3. Create sales_opportunities table (Main opportunities/deals)
CREATE TABLE sales_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  column_id UUID REFERENCES sales_columns(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  assignee UUID REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id),
  
  -- Sales-specific fields
  deal_value DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'BRL',
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  source VARCHAR(100), -- 'website', 'referral', 'cold_call', 'linkedin', etc.
  
  -- Client/prospect information
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  client_company VARCHAR(255),
  client_website VARCHAR(255),
  client_industry VARCHAR(100),
  
  -- Additional tracking
  lost_reason TEXT, -- For closed-lost opportunities
  won_date DATE, -- For closed-won opportunities
  lost_date DATE, -- For closed-lost opportunities
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- 4. Create sales_opportunity_tags table (Many-to-many relationship)
CREATE TABLE sales_opportunity_tags (
  opportunity_id UUID REFERENCES sales_opportunities(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES sales_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (opportunity_id, tag_id)
);

-- 5. Create sales_comments table
CREATE TABLE sales_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES sales_opportunities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create sales_activities table (Activity logging)
CREATE TABLE sales_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES sales_opportunities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  activity_type VARCHAR(50) NOT NULL, -- 'call', 'email', 'meeting', 'proposal_sent', 'demo', 'follow_up'
  title VARCHAR(255),
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create sales_metrics_history table (Track deal value changes)
CREATE TABLE sales_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES sales_opportunities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  field_changed VARCHAR(50) NOT NULL, -- 'deal_value', 'probability', 'stage', etc.
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create indexes for performance
CREATE INDEX idx_sales_opportunities_column_id ON sales_opportunities(column_id);
CREATE INDEX idx_sales_opportunities_assignee ON sales_opportunities(assignee);
CREATE INDEX idx_sales_opportunities_project_id ON sales_opportunities(project_id);
CREATE INDEX idx_sales_opportunities_created_at ON sales_opportunities(created_at);
CREATE INDEX idx_sales_opportunities_expected_close_date ON sales_opportunities(expected_close_date);
CREATE INDEX idx_sales_comments_opportunity_id ON sales_comments(opportunity_id);
CREATE INDEX idx_sales_activities_opportunity_id ON sales_activities(opportunity_id);
CREATE INDEX idx_sales_activities_scheduled_at ON sales_activities(scheduled_at);

-- 9. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create triggers for updated_at columns
CREATE TRIGGER update_sales_columns_updated_at
  BEFORE UPDATE ON sales_columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_opportunities_updated_at
  BEFORE UPDATE ON sales_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_comments_updated_at
  BEFORE UPDATE ON sales_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Create metrics tracking trigger
CREATE OR REPLACE FUNCTION track_sales_metrics_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Track deal value changes
  IF OLD.deal_value IS DISTINCT FROM NEW.deal_value THEN
    INSERT INTO sales_metrics_history (opportunity_id, user_id, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.assignee, 'deal_value', OLD.deal_value::TEXT, NEW.deal_value::TEXT);
  END IF;
  
  -- Track probability changes
  IF OLD.probability IS DISTINCT FROM NEW.probability THEN
    INSERT INTO sales_metrics_history (opportunity_id, user_id, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.assignee, 'probability', OLD.probability::TEXT, NEW.probability::TEXT);
  END IF;
  
  -- Track stage changes
  IF OLD.column_id IS DISTINCT FROM NEW.column_id THEN
    INSERT INTO sales_metrics_history (opportunity_id, user_id, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.assignee, 'stage', OLD.column_id::TEXT, NEW.column_id::TEXT);
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER track_sales_opportunity_changes
  AFTER UPDATE ON sales_opportunities
  FOR EACH ROW EXECUTE FUNCTION track_sales_metrics_changes();

-- 12. Enable Row Level Security
ALTER TABLE sales_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_opportunity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_metrics_history ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies for authenticated users
-- Sales columns - everyone can read, only authenticated can modify
CREATE POLICY "Anyone can view sales columns" ON sales_columns FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert sales columns" ON sales_columns FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sales columns" ON sales_columns FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete sales columns" ON sales_columns FOR DELETE USING (auth.role() = 'authenticated');

-- Sales opportunities - authenticated users can access all
CREATE POLICY "Authenticated users can view sales opportunities" ON sales_opportunities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sales opportunities" ON sales_opportunities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sales opportunities" ON sales_opportunities FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete sales opportunities" ON sales_opportunities FOR DELETE USING (auth.role() = 'authenticated');

-- Sales tags - everyone can read, authenticated can modify
CREATE POLICY "Anyone can view sales tags" ON sales_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert sales tags" ON sales_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sales tags" ON sales_tags FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete sales tags" ON sales_tags FOR DELETE USING (auth.role() = 'authenticated');

-- Sales opportunity tags - authenticated users can access all
CREATE POLICY "Authenticated users can view sales opportunity tags" ON sales_opportunity_tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sales opportunity tags" ON sales_opportunity_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sales opportunity tags" ON sales_opportunity_tags FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete sales opportunity tags" ON sales_opportunity_tags FOR DELETE USING (auth.role() = 'authenticated');

-- Sales comments - authenticated users can access all
CREATE POLICY "Authenticated users can view sales comments" ON sales_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sales comments" ON sales_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sales comments" ON sales_comments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete sales comments" ON sales_comments FOR DELETE USING (auth.role() = 'authenticated');

-- Sales activities - authenticated users can access all
CREATE POLICY "Authenticated users can view sales activities" ON sales_activities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sales activities" ON sales_activities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sales activities" ON sales_activities FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete sales activities" ON sales_activities FOR DELETE USING (auth.role() = 'authenticated');

-- Sales metrics history - authenticated users can view, only system can insert
CREATE POLICY "Authenticated users can view sales metrics history" ON sales_metrics_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can insert sales metrics history" ON sales_metrics_history FOR INSERT WITH CHECK (true);

-- 14. Enable real-time for all sales tables
ALTER PUBLICATION supabase_realtime ADD TABLE sales_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_opportunities;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_tags;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_opportunity_tags;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_activities;

-- Set replica identity to full for real-time
ALTER TABLE sales_columns REPLICA IDENTITY FULL;
ALTER TABLE sales_opportunities REPLICA IDENTITY FULL;
ALTER TABLE sales_tags REPLICA IDENTITY FULL;
ALTER TABLE sales_opportunity_tags REPLICA IDENTITY FULL;
ALTER TABLE sales_comments REPLICA IDENTITY FULL;
ALTER TABLE sales_activities REPLICA IDENTITY FULL;

-- 15. Create useful views for reporting
CREATE VIEW sales_pipeline_summary AS
SELECT 
  sc.title as stage,
  sc.color,
  COUNT(so.id) as opportunity_count,
  COALESCE(SUM(so.deal_value), 0) as total_value,
  COALESCE(AVG(so.deal_value), 0) as avg_deal_value,
  COALESCE(AVG(so.probability), 0) as avg_probability
FROM sales_columns sc
LEFT JOIN sales_opportunities so ON sc.id = so.column_id
GROUP BY sc.id, sc.title, sc.color, sc.position
ORDER BY sc.position;

CREATE VIEW sales_team_performance AS
SELECT 
  p.name as salesperson,
  COUNT(so.id) as total_opportunities,
  COUNT(CASE WHEN sc.title LIKE '%Ganho%' THEN 1 END) as won_deals,
  COUNT(CASE WHEN sc.title LIKE '%Perdido%' THEN 1 END) as lost_deals,
  COALESCE(SUM(so.deal_value), 0) as total_pipeline_value,
  COALESCE(SUM(CASE WHEN sc.title LIKE '%Ganho%' THEN so.deal_value ELSE 0 END), 0) as won_value
FROM profiles p
LEFT JOIN sales_opportunities so ON p.id = so.assignee
LEFT JOIN sales_columns sc ON so.column_id = sc.id
GROUP BY p.id, p.name
ORDER BY won_value DESC;

-- 16. Create function to automatically set deal won/lost dates
CREATE OR REPLACE FUNCTION update_deal_close_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if moving to won stage
  IF NEW.column_id != OLD.column_id THEN
    -- Get the new column title
    DECLARE
      new_column_title VARCHAR(100);
    BEGIN
      SELECT title INTO new_column_title FROM sales_columns WHERE id = NEW.column_id;
      
      -- If moving to won stage
      IF new_column_title LIKE '%Ganho%' THEN
        NEW.won_date = CURRENT_DATE;
        NEW.lost_date = NULL;
      -- If moving to lost stage
      ELSIF new_column_title LIKE '%Perdido%' THEN
        NEW.lost_date = CURRENT_DATE;
        NEW.won_date = NULL;
      -- If moving out of won/lost stages
      ELSE
        NEW.won_date = NULL;
        NEW.lost_date = NULL;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sales_opportunity_close_dates
  BEFORE UPDATE ON sales_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_deal_close_dates();

COMMENT ON TABLE sales_columns IS 'Sales pipeline stages/columns';
COMMENT ON TABLE sales_opportunities IS 'Sales opportunities/deals in the pipeline';
COMMENT ON TABLE sales_tags IS 'Tags for categorizing sales opportunities';
COMMENT ON TABLE sales_opportunity_tags IS 'Many-to-many relationship between opportunities and tags';
COMMENT ON TABLE sales_comments IS 'Comments and notes on sales opportunities';
COMMENT ON TABLE sales_activities IS 'Sales activities and interactions';
COMMENT ON TABLE sales_metrics_history IS 'Historical tracking of opportunity changes';