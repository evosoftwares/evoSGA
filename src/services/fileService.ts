import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface FileItem {
  id: string;
  name: string;
  original_name: string;
  file_type: 'image' | 'document' | 'video' | 'audio' | 'archive' | 'other';
  mime_type?: string;
  size_bytes: number;
  storage_path: string;
  folder_id?: string;
  project_id?: string;
  owner_id: string;
  description?: string;
  is_starred: boolean;
  is_public: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  folder?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface FolderItem {
  id: string;
  name: string;
  description?: string;
  color: string;
  path: string;
  parent_id?: string;
  project_id?: string;
  client_id?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  file_count?: number;
}

export interface FileUploadOptions {
  folderId?: string;
  projectId?: string;
  clientId?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface StorageUsage {
  totalBytes: number;
  breakdown: {
    image: number;
    document: number;
    video: number;
    audio: number;
    archive: number;
    other: number;
  };
}

class FileService {
  // Determinar tipo de arquivo baseado no MIME type
  private getFileType(mimeType: string): FileItem['file_type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('compressed')) return 'archive';
    return 'other';
  }

  // Gerar caminho único para o arquivo
  private generateStoragePath(userId: string, fileName: string): string {
    const fileId = uuidv4();
    const extension = fileName.split('.').pop();
    return `${userId}/${fileId}.${extension}`;
  }

  // Upload de arquivo para o Supabase Storage
  async uploadFile(file: File, options: FileUploadOptions = {}): Promise<FileItem> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Upload do arquivo para o Storage
      const storagePath = this.generateStoragePath(user.id, file.name);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Inserir metadados no banco
      const fileData = {
        name: file.name.split('.')[0], // Nome sem extensão
        original_name: file.name,
        file_type: this.getFileType(file.type),
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: uploadData.path,
        folder_id: options.folderId || null,
        project_id: options.projectId || null,
        client_id: options.clientId || null,
        owner_id: user.id,
        description: options.description || null,
        is_starred: false,
        is_public: options.isPublic || false,
        download_count: 0
      };

      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert(fileData)
        .select('*')
        .single();

      if (dbError) throw dbError;

      // 3. Adicionar tags se fornecidas
      if (options.tags && options.tags.length > 0) {
        await this.addTagsToFile(fileRecord.id, options.tags, options.projectId);
      }

      return fileRecord;
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  }

  // Listar arquivos
  async getFiles(options: {
    folderId?: string;
    projectId?: string;
    clientId?: string;
    search?: string;
    fileType?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}): Promise<{ files: FileItem[]; count: number }> {
    try {
      let query = supabase
        .from('files')
        .select(`
          *,
          folder:folders(id, name, color),
          file_tag_relations(
            file_tags(id, name, color)
          )
        `, { count: 'exact' });

      // Filtros
      if (options.folderId) {
        query = query.eq('folder_id', options.folderId);
      }

      if (options.projectId) {
        query = query.eq('project_id', options.projectId);
      }

      if (options.clientId) {
        query = query.eq('client_id', options.clientId);
      }

      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,original_name.ilike.%${options.search}%`);
      }

      if (options.fileType) {
        query = query.eq('file_type', options.fileType);
      }

      // Ordenação - mapear sortBy para coluna correta no banco
      let sortColumn = options.sortBy || 'created_at';
      if (sortColumn === 'size') {
        sortColumn = 'size_bytes';
      } else if (sortColumn === 'modified') {
        sortColumn = 'updated_at';
      } else if (sortColumn === 'type') {
        sortColumn = 'file_type';
      }
      
      const sortOrder = options.sortOrder || 'desc';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Paginação
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Processar tags
      const files = data?.map(file => ({
        ...file,
        tags: file.file_tag_relations?.map((rel: any) => rel.file_tags) || []
      })) || [];

      return { files, count: count || 0 };
    } catch (error) {
      console.error('Erro ao buscar arquivos:', error);
      throw error;
    }
  }

  // Criar pasta
  async createFolder(data: {
    name: string;
    description?: string;
    color?: string;
    parentId?: string;
    projectId?: string;
    clientId?: string;
  }): Promise<FolderItem> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Usuário não autenticado');

      const folderData = {
        name: data.name,
        description: data.description || null,
        color: data.color || 'blue',
        path: data.parentId ? `${data.parentId}/${data.name}` : data.name,
        parent_id: data.parentId || null,
        project_id: data.projectId || null,
        client_id: data.clientId || null,
        owner_id: user.id
      };

      const { data: folder, error } = await supabase
        .from('folders')
        .insert(folderData)
        .select('*')
        .single();

      if (error) throw error;

      return folder;
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      throw error;
    }
  }

  // Listar pastas
  async getFolders(options: {
    parentId?: string;
    projectId?: string;
    clientId?: string;
  } = {}): Promise<FolderItem[]> {
    try {
      let query = supabase
        .from('folders')
        .select(`
          *,
          file_count:files(count)
        `);

      if (options.parentId) {
        query = query.eq('parent_id', options.parentId);
      } else {
        query = query.is('parent_id', null);
      }

      if (options.projectId) {
        query = query.eq('project_id', options.projectId);
      }

      if (options.clientId) {
        query = query.eq('client_id', options.clientId);
      }

      query = query.order('name');

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar pastas:', error);
      throw error;
    }
  }

  // Deletar arquivo
  async deleteFile(fileId: string): Promise<void> {
    try {
      // 1. Buscar dados do arquivo
      const { data: file, error: fetchError } = await supabase
        .from('files')
        .select('storage_path')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Deletar do Storage
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      // 3. Deletar do banco (cascata vai deletar relações)
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      throw error;
    }
  }

  // Atualizar arquivo
  async updateFile(fileId: string, updates: {
    name?: string;
    description?: string;
    is_starred?: boolean;
    folder_id?: string;
  }): Promise<FileItem> {
    try {
      const { data, error } = await supabase
        .from('files')
        .update(updates)
        .eq('id', fileId)
        .select('*')
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao atualizar arquivo:', error);
      throw error;
    }
  }

  // Obter URL pública do arquivo
  async getFileUrl(storagePath: string, transform?: { width?: number; height?: number; quality?: number }): Promise<string> {
    try {
      if (transform && storagePath.match(/\.(jpeg|jpg|png|webp|gif)$/i)) {
        // If it's an image and transform options are provided, use getPublicUrl with transformations
        const publicUrl = supabase.storage
          .from('files')
          .getPublicUrl(storagePath, {
            transform: {
              width: transform.width,
              height: transform.height,
              quality: transform.quality,
            },
          }).data.publicUrl;
        return publicUrl;
      } else {
        // Otherwise, create a signed URL (for non-images or no transformations)
        const { data } = await supabase.storage
          .from('files')
          .createSignedUrl(storagePath, 3600); // 1 hora
        return data?.signedUrl || '';
      }
    } catch (error) {
      console.error('Erro ao gerar URL:', error);
      throw error;
    }
  }

  // Obter uso de storage
  async getStorageUsage(): Promise<StorageUsage> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .rpc('get_storage_breakdown', { user_id: user.id });

      if (error) throw error;

      const breakdown = data || {};
      const totalBytes = Object.values(breakdown).reduce((sum: number, val: any) => sum + (val || 0), 0);

      return {
        totalBytes,
        breakdown: {
          image: breakdown.image || 0,
          document: breakdown.document || 0,
          video: breakdown.video || 0,
          audio: breakdown.audio || 0,
          archive: breakdown.archive || 0,
          other: breakdown.other || 0
        }
      };
    } catch (error) {
      console.error('Erro ao buscar uso de storage:', error);
      return {
        totalBytes: 0,
        breakdown: {
          image: 0,
          document: 0,
          video: 0,
          audio: 0,
          archive: 0,
          other: 0
        }
      };
    }
  }

  // Adicionar tags a um arquivo
  private async addTagsToFile(fileId: string, tagNames: string[], projectId?: string): Promise<void> {
    try {
      for (const tagName of tagNames) {
        // Buscar ou criar tag
        let { data: tag, error: tagError } = await supabase
          .from('file_tags')
          .select('*')
          .eq('name', tagName)
          .eq('project_id', projectId || null)
          .single();

        if (tagError && tagError.code === 'PGRST116') {
          // Tag não existe, criar
          const { data: newTag, error: createError } = await supabase
            .from('file_tags')
            .insert({ name: tagName, project_id: projectId || null })
            .select('*')
            .single();

          if (createError) throw createError;
          tag = newTag;
        } else if (tagError) {
          throw tagError;
        }

        // Criar relação
        await supabase
          .from('file_tag_relations')
          .insert({ file_id: fileId, tag_id: tag.id });
      }
    } catch (error) {
      console.error('Erro ao adicionar tags:', error);
      // Não falha o upload por causa das tags
    }
  }

  // Favoritar/desfavoritar arquivo
  async toggleStar(fileId: string): Promise<FileItem> {
    try {
      // Buscar estado atual
      const { data: currentFile, error: fetchError } = await supabase
        .from('files')
        .select('is_starred')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      // Alternar estado
      const { data, error } = await supabase
        .from('files')
        .update({ is_starred: !currentFile.is_starred })
        .eq('id', fileId)
        .select('*')
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao favoritar arquivo:', error);
      throw error;
    }
  }

  // Obter arquivos recentes
  async getRecentFiles(limit: number = 10): Promise<FileItem[]> {
    try {
      const { data, error } = await supabase
        .from('files')
        .select(`
          *,
          folder:folders(id, name, color),
          file_tag_relations(
            file_tags(id, name, color)
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(file => ({
        ...file,
        tags: file.file_tag_relations?.map((rel: any) => rel.file_tags) || []
      })) || [];
    } catch (error) {
      console.error('Erro ao buscar arquivos recentes:', error);
      throw error;
    }
  }
}

export const fileService = new FileService();
export default fileService;