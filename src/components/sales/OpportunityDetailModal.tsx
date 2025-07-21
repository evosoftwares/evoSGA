import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Percent, User, Building2, Phone, Mail, Plus, Tag, Settings, FileText, Eye, Download, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SalesOpportunity, SalesTag, SalesOpportunityTag, Project, Profile, SalesColumn, ProposalSummary } from '@/types/database';
import DeleteOpportunityConfirmationModal from './DeleteOpportunityConfirmationModal';
import SalesTagManager from './SalesTagManager';
import { GenerateProposalModal } from './GenerateProposalModal';
import { ProposalHistoryModal } from './ProposalHistoryModal';
import { proposalService } from '@/services/proposalService';

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
  const [isGenerateProposalOpen, setIsGenerateProposalOpen] = useState(false);
  const [isProposalHistoryOpen, setIsProposalHistoryOpen] = useState(false);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);

  // Load proposals for this opportunity
  const loadProposals = async () => {
    try {
      const proposalsData = await proposalService.getProposalsByOpportunity(opportunity.id);
      setProposals(proposalsData);
    } catch (error) {
      console.error('Error loading proposals:', error);
    }
  };

  useEffect(() => {
    if (isOpen && opportunity.id) {
      loadProposals();
    }
  }, [isOpen, opportunity.id]);

  const handleProposalCreated = () => {
    loadProposals(); // Refresh the proposals list
  };

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
            <DialogDescription className="sr-only">
              Modal para visualizar e editar detalhes de oportunidades de vendas
            </DialogDescription>
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

            {/* Proposals Section */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Propostas</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGenerateProposalOpen(true)}
                  className="h-8 px-3"
                  disabled={isEditing}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Nova Proposta
                </Button>
              </div>

              <div className="space-y-2">
                {proposals.length > 0 ? (
                  proposals.slice(0, 3).map((proposal) => (
                    <div 
                      key={proposal.id} 
                      className="p-2 border border-gray-100 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => setIsProposalHistoryOpen(true)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-blue-500" />
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {proposal.title}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                proposal.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                                proposal.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                proposal.status === 'viewed' ? 'bg-yellow-100 text-yellow-700' :
                                proposal.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                              }`}
                            >
                              {proposal.status === 'draft' ? 'Rascunho' :
                               proposal.status === 'sent' ? 'Enviado' :
                               proposal.status === 'viewed' ? 'Visualizado' :
                               proposal.status === 'accepted' ? 'Aceito' :
                               'Rejeitado'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500">
                              {formatCurrency(proposal.total_price || 0)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(proposal.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            title="Visualizar proposta"
                            onClick={() => setIsProposalHistoryOpen(true)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            title="Baixar PDF"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nenhuma proposta criada</p>
                    <p className="text-xs text-gray-400">Clique em "Nova Proposta" para começar</p>
                  </div>
                )}

                {proposals.length > 3 && (
                  <div className="text-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsProposalHistoryOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Ver todas as propostas ({proposals.length})
                    </Button>
                  </div>
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

      <GenerateProposalModal
        isOpen={isGenerateProposalOpen}
        onClose={() => setIsGenerateProposalOpen(false)}
        opportunity={{
          id: opportunity.id,
          title: opportunity.title,
          description: opportunity.description || '',
          client_name: opportunity.client_name || '',
          client_company: opportunity.client_company || '',
          client_email: opportunity.client_email || '',
          client_phone: opportunity.client_phone || '',
          deal_value: opportunity.deal_value,
          currency: opportunity.currency || 'BRL',
          probability: opportunity.probability
        }}
        onProposalCreated={handleProposalCreated}
      />

      <ProposalHistoryModal
        isOpen={isProposalHistoryOpen}
        onClose={() => setIsProposalHistoryOpen(false)}
        opportunityId={opportunity.id}
        opportunityTitle={opportunity.title}
      />
    </>
  );
};

export default OpportunityDetailModal;