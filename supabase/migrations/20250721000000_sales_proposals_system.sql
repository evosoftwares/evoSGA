-- Sales Proposals System Migration
-- Creates proposal storage and management for sales opportunities

-- 1. Create sales_proposals table
CREATE TABLE sales_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES sales_opportunities(id) ON DELETE CASCADE,
  
  -- Proposal metadata
  title VARCHAR(255) NOT NULL,
  version INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'viewed', 'accepted', 'rejected'
  
  -- Proposal content from AI generation
  executive_summary TEXT,
  project_scope TEXT,
  deliverables JSONB, -- Array of deliverable strings
  timeline TEXT,
  investment_text TEXT,
  terms TEXT,
  next_steps TEXT,
  
  -- IFPUG calculation data
  function_points JSONB, -- Store complete function points analysis
  project_estimate JSONB, -- Store complete project estimate
  
  -- Team and pricing data
  team_experience VARCHAR(20) NOT NULL, -- 'alpha', 'beta', 'omega'
  price_per_function_point DECIMAL(10,2),
  total_price DECIMAL(12,2),
  
  -- PDF storage
  pdf_url TEXT, -- URL to stored PDF file
  pdf_filename VARCHAR(255),
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create proposal_deliverables table for better deliverable management
CREATE TABLE proposal_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES sales_proposals(id) ON DELETE CASCADE,
  deliverable_id VARCHAR(100) NOT NULL, -- Reference to DELIVERABLE_OPTIONS
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price VARCHAR(50),
  details TEXT,
  selected BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create proposal_activity_log table
CREATE TABLE proposal_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES sales_proposals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  activity_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'sent', 'viewed', 'downloaded', 'accepted', 'rejected'
  description TEXT,
  metadata JSONB, -- Additional activity data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX idx_sales_proposals_opportunity_id ON sales_proposals(opportunity_id);
CREATE INDEX idx_sales_proposals_status ON sales_proposals(status);
CREATE INDEX idx_sales_proposals_created_at ON sales_proposals(created_at);
CREATE INDEX idx_sales_proposals_sent_at ON sales_proposals(sent_at);
CREATE INDEX idx_proposal_deliverables_proposal_id ON proposal_deliverables(proposal_id);
CREATE INDEX idx_proposal_activity_log_proposal_id ON proposal_activity_log(proposal_id);
CREATE INDEX idx_proposal_activity_log_created_at ON proposal_activity_log(created_at);

-- 5. Create updated_at trigger for sales_proposals
CREATE TRIGGER update_sales_proposals_updated_at
  BEFORE UPDATE ON sales_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Create function to log proposal activities
CREATE OR REPLACE FUNCTION log_proposal_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO proposal_activity_log (proposal_id, user_id, activity_type, description)
    VALUES (NEW.id, NEW.created_by, 'created', 'Proposta criada');
    RETURN NEW;
  END IF;
  
  -- Log updates
  IF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO proposal_activity_log (proposal_id, user_id, activity_type, description, metadata)
      VALUES (NEW.id, NEW.created_by, 'status_changed', 
              'Status alterado de ' || OLD.status || ' para ' || NEW.status,
              jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
    END IF;
    
    -- Log when sent
    IF OLD.sent_at IS NULL AND NEW.sent_at IS NOT NULL THEN
      INSERT INTO proposal_activity_log (proposal_id, user_id, activity_type, description)
      VALUES (NEW.id, NEW.created_by, 'sent', 'Proposta enviada ao cliente');
    END IF;
    
    -- Log when viewed
    IF OLD.viewed_at IS NULL AND NEW.viewed_at IS NOT NULL THEN
      INSERT INTO proposal_activity_log (proposal_id, user_id, activity_type, description)
      VALUES (NEW.id, NEW.created_by, 'viewed', 'Proposta visualizada pelo cliente');
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Log deletion
  IF TG_OP = 'DELETE' THEN
    INSERT INTO proposal_activity_log (proposal_id, user_id, activity_type, description)
    VALUES (OLD.id, OLD.created_by, 'deleted', 'Proposta excluída');
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

-- 7. Create triggers for activity logging
CREATE TRIGGER log_proposal_activities
  AFTER INSERT OR UPDATE OR DELETE ON sales_proposals
  FOR EACH ROW EXECUTE FUNCTION log_proposal_activity();

-- 8. Enable Row Level Security
ALTER TABLE sales_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_activity_log ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for authenticated users
-- Sales proposals - authenticated users can access all
CREATE POLICY "Authenticated users can view sales proposals" ON sales_proposals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sales proposals" ON sales_proposals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sales proposals" ON sales_proposals FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete sales proposals" ON sales_proposals FOR DELETE USING (auth.role() = 'authenticated');

-- Proposal deliverables - authenticated users can access all
CREATE POLICY "Authenticated users can view proposal deliverables" ON proposal_deliverables FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert proposal deliverables" ON proposal_deliverables FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update proposal deliverables" ON proposal_deliverables FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete proposal deliverables" ON proposal_deliverables FOR DELETE USING (auth.role() = 'authenticated');

-- Proposal activity log - authenticated users can view, system can insert
CREATE POLICY "Authenticated users can view proposal activity log" ON proposal_activity_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can insert proposal activity log" ON proposal_activity_log FOR INSERT WITH CHECK (true);

-- 10. Enable real-time for proposal tables
ALTER PUBLICATION supabase_realtime ADD TABLE sales_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE proposal_deliverables;
ALTER PUBLICATION supabase_realtime ADD TABLE proposal_activity_log;

-- Set replica identity to full for real-time
ALTER TABLE sales_proposals REPLICA IDENTITY FULL;
ALTER TABLE proposal_deliverables REPLICA IDENTITY FULL;
ALTER TABLE proposal_activity_log REPLICA IDENTITY FULL;

-- 11. Create useful views for proposal management
CREATE VIEW proposal_summary AS
SELECT 
  sp.id,
  sp.title,
  sp.version,
  sp.status,
  sp.total_price,
  sp.team_experience,
  sp.created_at,
  sp.sent_at,
  sp.viewed_at,
  so.title as opportunity_title,
  so.client_name,
  so.client_company,
  p.name as created_by_name,
  COUNT(pd.id) as deliverable_count
FROM sales_proposals sp
LEFT JOIN sales_opportunities so ON sp.opportunity_id = so.id
LEFT JOIN profiles p ON sp.created_by = p.id
LEFT JOIN proposal_deliverables pd ON sp.id = pd.proposal_id
GROUP BY sp.id, sp.title, sp.version, sp.status, sp.total_price, sp.team_experience, 
         sp.created_at, sp.sent_at, sp.viewed_at, so.title, so.client_name, 
         so.client_company, p.name
ORDER BY sp.created_at DESC;

-- 12. Create function to get proposal statistics
CREATE OR REPLACE FUNCTION get_proposal_stats(opportunity_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  total_proposals BIGINT,
  draft_proposals BIGINT,
  sent_proposals BIGINT,
  viewed_proposals BIGINT,
  accepted_proposals BIGINT,
  rejected_proposals BIGINT,
  total_value DECIMAL,
  avg_response_time_days DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_proposals,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_proposals,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_proposals,
    COUNT(CASE WHEN status = 'viewed' THEN 1 END) as viewed_proposals,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_proposals,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_proposals,
    COALESCE(SUM(total_price), 0) as total_value,
    COALESCE(AVG(EXTRACT(days FROM (responded_at - sent_at))), 0) as avg_response_time_days
  FROM sales_proposals sp
  WHERE (opportunity_uuid IS NULL OR sp.opportunity_id = opportunity_uuid);
END;
$$ language 'plpgsql';

COMMENT ON TABLE sales_proposals IS 'Sales proposals generated for opportunities';
COMMENT ON TABLE proposal_deliverables IS 'Deliverables included in proposals';
COMMENT ON TABLE proposal_activity_log IS 'Activity log for proposal tracking';