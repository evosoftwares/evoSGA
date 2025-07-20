-- File Tags System Migration
-- Creates tables for managing tags and file-tag relationships

-- File Tags table
CREATE TABLE IF NOT EXISTS file_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6', -- Hex color code
    description TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique tag names per user/project
    UNIQUE(name, owner_id, project_id)
);

-- File Tag Relations table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS file_tag_relations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES file_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique file-tag combinations
    UNIQUE(file_id, tag_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_tags_owner_id ON file_tags(owner_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_project_id ON file_tags(project_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_name ON file_tags(name);
CREATE INDEX IF NOT EXISTS idx_file_tag_relations_file_id ON file_tag_relations(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tag_relations_tag_id ON file_tag_relations(tag_id);

-- RLS Policies for file_tags
ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tags or project tags they have access to
CREATE POLICY "Users can view their own file tags" ON file_tags
    FOR SELECT USING (
        owner_id = auth.uid() OR 
        (project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM project_members 
            WHERE project_id = file_tags.project_id 
            AND user_id = auth.uid()
        ))
    );

-- Users can insert their own tags
CREATE POLICY "Users can create their own file tags" ON file_tags
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Users can update their own tags
CREATE POLICY "Users can update their own file tags" ON file_tags
    FOR UPDATE USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Users can delete their own tags
CREATE POLICY "Users can delete their own file tags" ON file_tags
    FOR DELETE USING (owner_id = auth.uid());

-- RLS Policies for file_tag_relations
ALTER TABLE file_tag_relations ENABLE ROW LEVEL SECURITY;

-- Users can see tag relations for files they own
CREATE POLICY "Users can view file tag relations for their files" ON file_tag_relations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM files 
            WHERE files.id = file_tag_relations.file_id 
            AND files.owner_id = auth.uid()
        )
    );

-- Users can create tag relations for their files
CREATE POLICY "Users can create file tag relations for their files" ON file_tag_relations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM files 
            WHERE files.id = file_tag_relations.file_id 
            AND files.owner_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM file_tags 
            WHERE file_tags.id = file_tag_relations.tag_id 
            AND file_tags.owner_id = auth.uid()
        )
    );

-- Users can update tag relations for their files
CREATE POLICY "Users can update file tag relations for their files" ON file_tag_relations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM files 
            WHERE files.id = file_tag_relations.file_id 
            AND files.owner_id = auth.uid()
        )
    );

-- Users can delete tag relations for their files
CREATE POLICY "Users can delete file tag relations for their files" ON file_tag_relations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM files 
            WHERE files.id = file_tag_relations.file_id 
            AND files.owner_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_file_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_file_tags_updated_at_trigger
    BEFORE UPDATE ON file_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_file_tags_updated_at();

-- Insert some default tags for demonstration
INSERT INTO file_tags (name, color, description, owner_id) VALUES
    ('Importante', '#EF4444', 'Arquivos importantes que precisam de atenção', '00000000-0000-0000-0000-000000000000'),
    ('Trabalho', '#3B82F6', 'Documentos relacionados ao trabalho', '00000000-0000-0000-0000-000000000000'),
    ('Pessoal', '#10B981', 'Arquivos pessoais', '00000000-0000-0000-0000-000000000000'),
    ('Projeto', '#8B5CF6', 'Arquivos de projetos específicos', '00000000-0000-0000-0000-000000000000'),
    ('Temporário', '#F59E0B', 'Arquivos temporários que podem ser removidos', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name, owner_id, project_id) DO NOTHING;