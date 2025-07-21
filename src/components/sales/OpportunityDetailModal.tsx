import React, { useState } from 'react';
import { X, DollarSign, Calendar, Percent, User, Building2, Phone, Mail, Plus, Tag, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SalesOpportunity, SalesTag, SalesOpportunityTag, Project, Profile, SalesColumn } from '@/types/database';
import DeleteOpportunityConfirmationModal from './DeleteOpportunityConfirmationModal';
import SalesTagManager from './SalesTagManager';

interface OpportunityDetailModalProps {
  opportunity: SalesOpportunity;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<SalesOpportunity>) => Promise<void>;
  onDelete: () => Promise<void>;
  tags: SalesTag[];
  opportunityTags: SalesOpportunityTag[];
  projects: Project[];
  profiles: Profile[];
  columns: SalesColumn[];
  onAddTag?: (opportunityId: string, tagId: string) => Promise<void>;
  onRemoveTag?: (opportunityId: string, tagId: string) => Promise<void>;
}

const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  tags,
  opportunityTags,
  projects,
  profiles,
  columns,
  onAddTag,
  onRemoveTag
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<SalesOpportunity>>({});
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [selectedTagToAdd, setSelectedTagToAdd] = useState('');
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  const handleEdit = () => {
    setEditData({
      title: opportunity.title,
      description: opportunity.description,
      deal_value: opportunity.deal_value,
      probability: opportunity.probability,
      expected_close_date: opportunity.expected_close_date,
      source: opportunity.source,
      client_name: opportunity.client_name,
      client_email: opportunity.client_email,
      client_phone: opportunity.client_phone,
      client_company: opportunity.client_company,
      assignee: opportunity.assignee,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await onUpdate(editData);
      setIsEditing(false);
      setEditData({});
    } catch (error) {
      console.error('Failed to update opportunity:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleDeleteClick = () => {
    setIsDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = async () => {
    await onDelete();
    setIsDeleteConfirmationOpen(false);
    onClose();
  };

  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não definida';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Get current stage
  const currentStage = columns.find(col => col.id === opportunity.column_id);
  
  // Get assignee
  const assignee = profiles.find(profile => profile.id === opportunity.assignee);
  
  // Get project
  const project = projects.find(p => p.id === opportunity.project_id);

  // Get opportunity tags
  const currentTags = opportunityTags
    .filter(ot => ot.opportunity_id === opportunity.id)
    .map(ot => tags.find(tag => tag.id === ot.tag_id))
    .filter(Boolean) as SalesTag[];

  // Get available tags to add (not currently assigned)
  const availableTags = tags.filter(tag => 
    !currentTags.some(currentTag => currentTag.id === tag.id)
  );

  const handleAddTag = async () => {
    if (selectedTagToAdd && onAddTag) {
      try {
        await onAddTag(opportunity.id, selectedTagToAdd);
        setSelectedTagToAdd('');
        setIsAddingTag(false);
      } catch (error) {
        console.error('Failed to add tag:', error);
      }
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (onRemoveTag) {
      try {
        await onRemoveTag(opportunity.id, tagId);
      } catch (error) {
        console.error('Failed to remove tag:', error);
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-900">
                {isEditing ? 'Editando Oportunidade' : 'Detalhes da Oportunidade'}
              </span>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteClick}>
                      Excluir
                    </Button>
                  </>
                )}
                {isEditing && (
                  <>
                    <Button variant="default" size="sm" onClick={handleSave}>
                      Salvar
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 p-4">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic Information */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações Básicas</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  {isEditing ? (
                    <Input
                      value={editData.title || ''}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{opportunity.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  {isEditing ? (
                    <Textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={3}
                    />
                  ) : (
                    <p className="text-gray-700">{opportunity.description || 'Sem descrição'}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Negócio</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editData.deal_value || ''}
                        onChange={(e) => setEditData({ ...editData, deal_value: parseFloat(e.target.value) || 0 })}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <span className="text-lg font-bold text-emerald-700">
                          {formatCurrency(opportunity.deal_value, opportunity.currency)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Probabilidade (%)</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editData.probability || ''}
                        onChange={(e) => setEditData({ ...editData, probability: parseInt(e.target.value) || 0 })}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-blue-500" />
                        <span className="text-lg font-bold text-blue-700">{opportunity.probability}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Esperada de Fechamento</label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editData.expected_close_date || ''}
                        onChange={(e) => setEditData({ ...editData, expected_close_date: e.target.value })}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        <span className="text-gray-700">{formatDate(opportunity.expected_close_date)}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fonte</label>
                    {isEditing ? (
                      <Input
                        value={editData.source || ''}
                        onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                        placeholder="Ex: Website, LinkedIn, Indicação..."
                      />
                    ) : (
                      <span className="text-gray-700 capitalize">{opportunity.source || 'Não especificada'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações do Cliente</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                  {isEditing ? (
                    <Input
                      value={editData.client_name || ''}
                      onChange={(e) => setEditData({ ...editData, client_name: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{opportunity.client_name || 'Não informado'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                  {isEditing ? (
                    <Input
                      value={editData.client_company || ''}
                      onChange={(e) => setEditData({ ...editData, client_company: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{opportunity.client_company || 'Não informada'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editData.client_email || ''}
                      onChange={(e) => setEditData({ ...editData, client_email: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{opportunity.client_email || 'Não informado'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  {isEditing ? (
                    <Input
                      value={editData.client_phone || ''}
                      onChange={(e) => setEditData({ ...editData, client_phone: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{opportunity.client_phone || 'Não informado'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Status</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Estágio Atual</span>
                  <div className="mt-1">
                    <Badge variant="outline" className={`bg-${currentStage?.color}-50 text-${currentStage?.color}-700 border-${currentStage?.color}-200`}>
                      {currentStage?.title}
                    </Badge>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">Responsável</span>
                  <div className="mt-1">
                    {isEditing ? (
                      <Select
                        value={editData.assignee || ''}
                        onValueChange={(value) => setEditData({ ...editData, assignee: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-gray-900">{assignee?.name || 'Não atribuído'}</span>
                    )}
                  </div>
                </div>

                {project && (
                  <div>
                    <span className="text-sm text-gray-600">Projeto</span>
                    <div className="mt-1">
                      <Badge variant="outline" style={{ backgroundColor: `${project.color}20`, color: project.color }}>
                        {project.name}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Tags</h4>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTagManagerOpen(true)}
                    className="h-7 px-2 text-gray-600 hover:text-gray-900"
                    title="Gerenciar Tags"
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                  {!isEditing && onAddTag && availableTags.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingTag(true)}
                      className="h-7 px-2"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>
              </div>

              {/* Add Tag Select */}
              {isAddingTag && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedTagToAdd}
                      onValueChange={setSelectedTagToAdd}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecionar tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTags.map(tag => (
                          <SelectItem key={tag.id} value={tag.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: tag.color }}
                              />
                              {tag.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleAddTag}
                      disabled={!selectedTagToAdd}
                      className="h-8 px-3"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddingTag(false);
                        setSelectedTagToAdd('');
                      }}
                      className="h-8 px-3"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Current Tags */}
              <div className="flex flex-wrap gap-2">
                {currentTags.map(tag => (
                  <div key={tag.id} className="group relative">
                    <Badge
                      variant="secondary"
                      className="pr-6"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag.name}
                    </Badge>
                    {!isEditing && onRemoveTag && (
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                ))}
                {currentTags.length === 0 && (
                  <span className="text-sm text-gray-500">Nenhuma tag</span>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Histórico</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Criado em:</span>
                  <div className="text-gray-900">{formatDate(opportunity.created_at)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Última atualização:</span>
                  <div className="text-gray-900">{formatDate(opportunity.updated_at)}</div>
                </div>
                {opportunity.won_date && (
                  <div>
                    <span className="text-gray-600">Data de fechamento:</span>
                    <div className="text-emerald-700 font-medium">{formatDate(opportunity.won_date)}</div>
                  </div>
                )}
                {opportunity.lost_date && (
                  <div>
                    <span className="text-gray-600">Data de perda:</span>
                    <div className="text-red-700 font-medium">{formatDate(opportunity.lost_date)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      <DeleteOpportunityConfirmationModal
        opportunity={opportunity}
        isOpen={isDeleteConfirmationOpen}
        onClose={() => setIsDeleteConfirmationOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      <SalesTagManager
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        tags={tags}
      />
    </>
  );
};

export default OpportunityDetailModal;