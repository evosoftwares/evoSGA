-- Create files and folders system
-- Migration: 20250720000000_files_and_folders_system.sql

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT 'blue',
    path TEXT NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT folders_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT folders_color_valid CHECK (color IN ('blue', 'green', 'red', 'yellow', 'purple', 'pink', 'gray', 'orange', 'indigo', 'teal')),
    UNIQUE(project_id, parent_id, name) -- Prevent duplicate folder names in same location
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    storage_path TEXT NOT NULL UNIQUE,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    description TEXT,
    is_starred BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0 CHECK (download_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT files_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT files_original_name_not_empty CHECK (LENGTH(TRIM(original_name)) > 0),
    CONSTRAINT files_file_type_not_empty CHECK (LENGTH(TRIM(file_type)) > 0),
    CONSTRAINT files_storage_path_not_empty CHECK (LENGTH(TRIM(storage_path)) > 0)
);

-- Create file_tags table
CREATE TABLE IF NOT EXISTS file_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT 'blue',
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT file_tags_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT file_tags_color_valid CHECK (color IN ('blue', 'green', 'red', 'yellow', 'purple', 'pink', 'gray', 'orange', 'indigo', 'teal')),
    UNIQUE(project_id, name) -- Prevent duplicate tag names per project
);

-- Create file_tag_relations table
CREATE TABLE IF NOT EXISTS file_tag_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES file_tags(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate tag assignments
    UNIQUE(file_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_project_id ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_owner_id ON folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path);
CREATE INDEX IF NOT EXISTS idx_folders_created_at ON folders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_owner_id ON files(owner_id);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_is_starred ON files(is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_files_is_public ON files(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_size_bytes ON files(size_bytes);

CREATE INDEX IF NOT EXISTS idx_file_tags_project_id ON file_tags(project_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_name ON file_tags(name);

CREATE INDEX IF NOT EXISTS idx_file_tag_relations_file_id ON file_tag_relations(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tag_relations_tag_id ON file_tag_relations(tag_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_folders_updated_at 
    BEFORE UPDATE ON folders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at 
    BEFORE UPDATE ON files 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_tag_relations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders
CREATE POLICY "Users can view folders in their projects" ON folders
    FOR SELECT
    USING (
        project_id IN (
            SELECT p.id FROM projects p 
            WHERE p.id = folders.project_id
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can create folders in their projects" ON folders
    FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT p.id FROM projects p 
            WHERE p.id = folders.project_id
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
        AND owner_id = auth.uid()
    );

CREATE POLICY "Users can update folders they own in their projects" ON folders
    FOR UPDATE
    USING (
        owner_id = auth.uid()
        AND project_id IN (
            SELECT p.id FROM projects p 
            WHERE p.id = folders.project_id
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can delete folders they own in their projects" ON folders
    FOR DELETE
    USING (
        owner_id = auth.uid()
        AND project_id IN (
            SELECT p.id FROM projects p 
            WHERE p.id = folders.project_id
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
    );

-- Create RLS policies for files
CREATE POLICY "Users can view files in their projects or public files" ON files
    FOR SELECT
    USING (
        is_public = true
        OR project_id IN (
            SELECT p.id FROM projects p 
            WHERE p.id = files.project_id
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can create files in their projects" ON files
    FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT p.id FROM projects p 
            WHERE p.id = files.project_id
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
        AND owner_id = auth.uid()
    );

CREATE POLICY "Users can update files they own in their projects" ON files
    FOR UPDATE
    USING (
        owner_id = auth.uid()
        AND project_id IN (
            SELECT p.id FROM projects p 
            WHERE p.id = files.project_id
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can delete files they own in their projects" ON files
    FOR DELETE
    USING (
        owner_id = auth.uid()
        AND project_id IN (
            SELECT p.id FROM projects p 
            WHERE p.id = files.project_id
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
    );

-- Create RLS policies for file_tags
CREATE POLICY "Users can view file tags in their projects" ON file_tags
    FOR SELECT
    USING (
        project_id IN (
            SELECT p.id FROM projects p 
            WHERE p.id = file_tags.project_id
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can manage file tags in their projects" ON file_tags
    FOR ALL
    USING (
        project_id IN (
            SELECT p.id FROM projects p 
            WHERE p.id = file_tags.project_id
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
    );

-- Create RLS policies for file_tag_relations
CREATE POLICY "Users can view file tag relations for files they can see" ON file_tag_relations
    FOR SELECT
    USING (
        file_id IN (
            SELECT f.id FROM files f
            WHERE f.id = file_tag_relations.file_id
            AND (
                f.is_public = true
                OR f.project_id IN (
                    SELECT p.id FROM projects p 
                    WHERE p.id = f.project_id
                    AND (p.owner_id = auth.uid() OR p.id IN (
                        SELECT pm.project_id FROM project_members pm 
                        WHERE pm.user_id = auth.uid()
                    ))
                )
            )
        )
    );

CREATE POLICY "Users can manage file tag relations for their files" ON file_tag_relations
    FOR ALL
    USING (
        file_id IN (
            SELECT f.id FROM files f
            WHERE f.id = file_tag_relations.file_id
            AND f.owner_id = auth.uid()
            AND f.project_id IN (
                SELECT p.id FROM projects p 
                WHERE p.id = f.project_id
                AND (p.owner_id = auth.uid() OR p.id IN (
                    SELECT pm.project_id FROM project_members pm 
                    WHERE pm.user_id = auth.uid()
                ))
            )
        )
    );

-- Create storage breakdown function
CREATE OR REPLACE FUNCTION get_storage_breakdown(p_project_id UUID)
RETURNS TABLE (
    total_files BIGINT,
    total_size_bytes BIGINT,
    avg_file_size_bytes NUMERIC,
    file_types JSONB,
    folder_count BIGINT,
    starred_files BIGINT,
    public_files BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(f.id) as total_files,
        COALESCE(SUM(f.size_bytes), 0) as total_size_bytes,
        COALESCE(AVG(f.size_bytes), 0) as avg_file_size_bytes,
        COALESCE(
            (
                SELECT jsonb_object_agg(file_type, type_count)
                FROM (
                    SELECT f2.file_type, COUNT(*) as type_count
                    FROM files f2
                    WHERE f2.project_id = p_project_id
                    GROUP BY f2.file_type
                    ORDER BY type_count DESC
                ) file_type_counts
            ),
            '{}'::jsonb
        ) as file_types,
        (
            SELECT COUNT(*)
            FROM folders fo
            WHERE fo.project_id = p_project_id
        ) as folder_count,
        COUNT(f.id) FILTER (WHERE f.is_starred = true) as starred_files,
        COUNT(f.id) FILTER (WHERE f.is_public = true) as public_files
    FROM files f
    WHERE f.project_id = p_project_id;
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON folders TO authenticated;
GRANT ALL ON files TO authenticated;
GRANT ALL ON file_tags TO authenticated;
GRANT ALL ON file_tag_relations TO authenticated;
GRANT EXECUTE ON FUNCTION get_storage_breakdown TO authenticated;

-- Comments for documentation
COMMENT ON TABLE folders IS 'Hierarchical folder structure for organizing files within projects';
COMMENT ON TABLE files IS 'File metadata and references to Supabase Storage objects';
COMMENT ON TABLE file_tags IS 'Tags for categorizing and filtering files within projects';
COMMENT ON TABLE file_tag_relations IS 'Many-to-many relationship between files and tags';
COMMENT ON FUNCTION get_storage_breakdown IS 'Returns storage analytics for a specific project';