-- Create client-specific folder system
-- Migration: 20250720000002_client_folders_system.sql

-- Create clients table (extracted from projects.client_name)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT clients_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Create client_folders junction table to organize folders by client
CREATE TABLE IF NOT EXISTS client_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate client-folder assignments
    UNIQUE(client_id, folder_id)
);

-- Add client_id column to folders table for direct client association
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add client_id column to files table for direct client association
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_folders_client_id ON client_folders(client_id);
CREATE INDEX IF NOT EXISTS idx_client_folders_folder_id ON client_folders(folder_id);

CREATE INDEX IF NOT EXISTS idx_folders_client_id ON folders(client_id);
CREATE INDEX IF NOT EXISTS idx_files_client_id ON files(client_id);

-- Create trigger for updated_at on clients
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients
CREATE POLICY "Users can view all clients" ON clients
    FOR SELECT
    USING (true); -- All authenticated users can see clients

CREATE POLICY "Users can manage clients in their projects" ON clients
    FOR ALL
    USING (
        -- Users can manage clients if they have access to any project with that client
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.client_name = clients.name
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
    );

-- Create RLS policies for client_folders
CREATE POLICY "Users can view client folders they have access to" ON client_folders
    FOR SELECT
    USING (
        client_id IN (
            SELECT c.id FROM clients c
            WHERE EXISTS (
                SELECT 1 FROM projects p 
                WHERE p.client_name = c.name
                AND (p.owner_id = auth.uid() OR p.id IN (
                    SELECT pm.project_id FROM project_members pm 
                    WHERE pm.user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "Users can manage client folders they have access to" ON client_folders
    FOR ALL
    USING (
        client_id IN (
            SELECT c.id FROM clients c
            WHERE EXISTS (
                SELECT 1 FROM projects p 
                WHERE p.client_name = c.name
                AND (p.owner_id = auth.uid() OR p.id IN (
                    SELECT pm.project_id FROM project_members pm 
                    WHERE pm.user_id = auth.uid()
                ))
            )
        )
    );

-- Update folders RLS policies to include client access
DROP POLICY IF EXISTS "Users can view folders in their projects" ON folders;
CREATE POLICY "Users can view folders in their projects or client folders" ON folders
    FOR SELECT
    USING (
        -- Original project-based access
        project_id IN (
            SELECT p.id FROM projects p 
            WHERE p.id = folders.project_id
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
        OR
        -- Client-based access
        (client_id IS NOT NULL AND client_id IN (
            SELECT c.id FROM clients c
            WHERE EXISTS (
                SELECT 1 FROM projects p 
                WHERE p.client_name = c.name
                AND (p.owner_id = auth.uid() OR p.id IN (
                    SELECT pm.project_id FROM project_members pm 
                    WHERE pm.user_id = auth.uid()
                ))
            )
        ))
    );

-- Update files RLS policies to include client access
DROP POLICY IF EXISTS "Users can view files in their projects or public files" ON files;
CREATE POLICY "Users can view files in their projects, client files, or public files" ON files
    FOR SELECT
    USING (
        is_public = true
        OR
        -- Original project-based access
        project_id IN (
            SELECT p.id FROM projects p 
            WHERE p.id = files.project_id
            AND (p.owner_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM project_members pm 
                WHERE pm.user_id = auth.uid()
            ))
        )
        OR
        -- Client-based access
        (client_id IS NOT NULL AND client_id IN (
            SELECT c.id FROM clients c
            WHERE EXISTS (
                SELECT 1 FROM projects p 
                WHERE p.client_name = c.name
                AND (p.owner_id = auth.uid() OR p.id IN (
                    SELECT pm.project_id FROM project_members pm 
                    WHERE pm.user_id = auth.uid()
                ))
            )
        ))
    );

-- Function to automatically populate clients table from existing projects
CREATE OR REPLACE FUNCTION populate_clients_from_projects()
RETURNS void AS $$
DECLARE
    project_record RECORD;
BEGIN
    -- Insert unique client names from projects into clients table
    INSERT INTO clients (name)
    SELECT DISTINCT client_name
    FROM projects 
    WHERE client_name IS NOT NULL 
    AND client_name != '' 
    AND client_name NOT IN (SELECT name FROM clients)
    ON CONFLICT (name) DO NOTHING;
    
    RAISE NOTICE 'Clients table populated from existing projects';
END;
$$ LANGUAGE plpgsql;

-- Function to create default folder structure for a client
CREATE OR REPLACE FUNCTION create_client_folder_structure(
    p_client_id UUID,
    p_project_id UUID,
    p_owner_id UUID
)
RETURNS UUID AS $$
DECLARE
    client_name TEXT;
    root_folder_id UUID;
    documents_folder_id UUID;
    images_folder_id UUID;
    contracts_folder_id UUID;
BEGIN
    -- Get client name
    SELECT name INTO client_name FROM clients WHERE id = p_client_id;
    
    IF client_name IS NULL THEN
        RAISE EXCEPTION 'Client not found with id: %', p_client_id;
    END IF;
    
    -- Create root folder for client
    INSERT INTO folders (name, description, color, path, project_id, owner_id, client_id)
    VALUES (
        client_name,
        'Pasta principal do cliente ' || client_name,
        'blue',
        '/' || client_name,
        p_project_id,
        p_owner_id,
        p_client_id
    )
    RETURNING id INTO root_folder_id;
    
    -- Create Documents subfolder
    INSERT INTO folders (name, description, color, path, parent_id, project_id, owner_id, client_id)
    VALUES (
        'Documentos',
        'Documentos do cliente ' || client_name,
        'green',
        '/' || client_name || '/Documentos',
        root_folder_id,
        p_project_id,
        p_owner_id,
        p_client_id
    )
    RETURNING id INTO documents_folder_id;
    
    -- Create Images subfolder
    INSERT INTO folders (name, description, color, path, parent_id, project_id, owner_id, client_id)
    VALUES (
        'Imagens',
        'Imagens do cliente ' || client_name,
        'purple',
        '/' || client_name || '/Imagens',
        root_folder_id,
        p_project_id,
        p_owner_id,
        p_client_id
    )
    RETURNING id INTO images_folder_id;
    
    -- Create Contracts subfolder
    INSERT INTO folders (name, description, color, path, parent_id, project_id, owner_id, client_id)
    VALUES (
        'Contratos',
        'Contratos do cliente ' || client_name,
        'red',
        '/' || client_name || '/Contratos',
        root_folder_id,
        p_project_id,
        p_owner_id,
        p_client_id
    );
    
    -- Add to client_folders junction table
    INSERT INTO client_folders (client_id, folder_id)
    VALUES 
        (p_client_id, root_folder_id),
        (p_client_id, documents_folder_id),
        (p_client_id, images_folder_id),
        (p_client_id, contracts_folder_id);
    
    RETURN root_folder_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get all folders for a specific client
CREATE OR REPLACE FUNCTION get_client_folders(p_client_id UUID)
RETURNS TABLE (
    folder_id UUID,
    folder_name TEXT,
    folder_path TEXT,
    folder_color TEXT,
    parent_id UUID,
    total_files BIGINT,
    total_size_bytes BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as folder_id,
        f.name as folder_name,
        f.path as folder_path,
        f.color as folder_color,
        f.parent_id,
        COUNT(fi.id) as total_files,
        COALESCE(SUM(fi.size_bytes), 0) as total_size_bytes
    FROM folders f
    LEFT JOIN files fi ON fi.folder_id = f.id
    WHERE f.client_id = p_client_id
    GROUP BY f.id, f.name, f.path, f.color, f.parent_id
    ORDER BY f.path;
END;
$$;

-- Grant permissions
GRANT ALL ON clients TO authenticated;
GRANT ALL ON client_folders TO authenticated;
GRANT EXECUTE ON FUNCTION populate_clients_from_projects TO authenticated;
GRANT EXECUTE ON FUNCTION create_client_folder_structure TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_folders TO authenticated;

-- Execute the function to populate clients from existing projects
SELECT populate_clients_from_projects();

-- Comments for documentation
COMMENT ON TABLE clients IS 'Client entities extracted from project client_name field';
COMMENT ON TABLE client_folders IS 'Junction table linking clients to their folder structures';
COMMENT ON FUNCTION create_client_folder_structure IS 'Creates a default folder structure for a new client';
COMMENT ON FUNCTION get_client_folders IS 'Returns all folders and their statistics for a specific client';
COMMENT ON FUNCTION populate_clients_from_projects IS 'Populates clients table from existing project client_name values';