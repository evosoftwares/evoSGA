import React, { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, Calendar, Percent, User, Building2, Phone, Mail, Plus, FileText, Eye, Download, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SalesOpportunity, Project, Profile, SalesColumn, ProposalSummary } from '@/types/database';
import DeleteOpportunityConfirmationModal from './DeleteOpportunityConfirmationModal';
import { GenerateProposalModal } from './GenerateProposalModal';
import { ProposalHistoryModal } from './ProposalHistoryModal';
import { proposalService } from '@/services/proposalService';

interface OpportunityDetailModalProps {
  opportunity: SalesOpportunity;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<SalesOpportunity>) => Promise<void>;
  onDelete: () => Promise<void>;
  projects: Project[];
  profiles: Profile[];
  columns: SalesColumn[];
  onRefresh?: () => Promise<void>;
}

const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  projects,
  profiles,
  columns,
  onRefresh
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<SalesOpportunity>>({});
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 px-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <h3 className="text-xl font-medium text-gray-900 border-b border-gray-100 pb-3">Informações Básicas</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Título</label>
                  {isEditing ? (
                    <Input
                      value={editData.title || ''}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-blue-500 focus:ring-0"
                    />
                  ) : (
                    <p className="text-lg text-gray-900 font-medium">{opportunity.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Descrição</label>
                  {isEditing ? (
                    <Textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={3}
                      className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-blue-500 focus:ring-0"
                    />
                  ) : (
                    <p className="text-gray-700 leading-relaxed">{opportunity.description || 'Sem descrição'}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Valor do Negócio</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editData.deal_value || ''}
                        onChange={(e) => setEditData({ ...editData, deal_value: parseFloat(e.target.value) || 0 })}
                        className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-blue-500 focus:ring-0"
                      />
                    ) : (
                      <div className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(opportunity.deal_value, opportunity.currency)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Probabilidade</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editData.probability || ''}
                        onChange={(e) => setEditData({ ...editData, probability: parseInt(e.target.value) || 0 })}
                        className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-blue-500 focus:ring-0"
                      />
                    ) : (
                      <div className="text-2xl font-bold text-blue-600">{opportunity.probability}%</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Data Esperada</label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editData.expected_close_date || ''}
                        onChange={(e) => setEditData({ ...editData, expected_close_date: e.target.value })}
                        className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-blue-500 focus:ring-0"
                      />
                    ) : (
                      <div className="text-gray-900">{formatDate(opportunity.expected_close_date)}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Fonte</label>
                    {isEditing ? (
                      <Input
                        value={editData.source || ''}
                        onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                        placeholder="Ex: Website, LinkedIn, Indicação..."
                        className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-blue-500 focus:ring-0"
                      />
                    ) : (
                      <div className="text-gray-900 capitalize">{opportunity.source || 'Não especificada'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="space-y-6">
              <h3 className="text-xl font-medium text-gray-900 border-b border-gray-100 pb-3">Cliente</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Nome</label>
                  {isEditing ? (
                    <Input
                      value={editData.client_name || ''}
                      onChange={(e) => setEditData({ ...editData, client_name: e.target.value })}
                      className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-blue-500 focus:ring-0"
                    />
                  ) : (
                    <div className="text-gray-900">{opportunity.client_name || 'Não informado'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Empresa</label>
                  {isEditing ? (
                    <Input
                      value={editData.client_company || ''}
                      onChange={(e) => setEditData({ ...editData, client_company: e.target.value })}
                      className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-blue-500 focus:ring-0"
                    />
                  ) : (
                    <div className="text-gray-900">{opportunity.client_company || 'Não informada'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">E-mail</label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editData.client_email || ''}
                      onChange={(e) => setEditData({ ...editData, client_email: e.target.value })}
                      className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-blue-500 focus:ring-0"
                    />
                  ) : (
                    <div className="text-gray-900">{opportunity.client_email || 'Não informado'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Telefone</label>
                  {isEditing ? (
                    <Input
                      value={editData.client_phone || ''}
                      onChange={(e) => setEditData({ ...editData, client_phone: e.target.value })}
                      className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-blue-500 focus:ring-0"
                    />
                  ) : (
                    <div className="text-gray-900">{opportunity.client_phone || 'Não informado'}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Status */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">Status</h4>
              <div className="space-y-4">
                <div>
                  <span className="block text-sm text-gray-600 mb-2">Estágio Atual</span>
                  <div className="text-gray-900 font-medium">{currentStage?.title}</div>
                </div>

                <div>
                  <span className="block text-sm text-gray-600 mb-2">Responsável</span>
                  <div>
                    {isEditing ? (
                      <Select
                        value={editData.assignee || ''}
                        onValueChange={(value) => setEditData({ ...editData, assignee: value })}
                      >
                        <SelectTrigger className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-blue-500 focus:ring-0">
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
                      <div className="text-gray-900">{assignee?.name || 'Não atribuído'}</div>
                    )}
                  </div>
                </div>

                {project && (
                  <div>
                    <span className="block text-sm text-gray-600 mb-2">Projeto</span>
                    <div className="text-gray-900">{project.name}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Proposals Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h4 className="text-lg font-medium text-gray-900">Propostas</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsGenerateProposalOpen(true)}
                  className="h-8 px-3 text-sm text-gray-600 hover:text-gray-900"
                  disabled={isEditing}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nova Proposta
                </Button>
              </div>

              <div className="space-y-3">
                {proposals.length > 0 ? (
                  proposals.slice(0, 3).map((proposal) => (
                    <div 
                      key={proposal.id} 
                      className="group p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors cursor-pointer"
                      onClick={() => setIsProposalHistoryOpen(true)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              proposal.status === 'draft' ? 'bg-gray-400' :
                              proposal.status === 'sent' ? 'bg-blue-500' :
                              proposal.status === 'viewed' ? 'bg-yellow-500' :
                              proposal.status === 'accepted' ? 'bg-green-500' :
                              'bg-red-500'
                            }`} />
                            <span className="text-sm font-medium text-gray-900">
                              {proposal.title}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{formatCurrency(proposal.total_price || 0)}</span>
                            <span>•</span>
                            <span>{formatDate(proposal.created_at)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                            title="Visualizar proposta"
                            onClick={() => setIsProposalHistoryOpen(true)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                            title="Baixar PDF"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma proposta criada</p>
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
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">Histórico</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-gray-600 mb-1">Criado em</span>
                  <span className="text-gray-900">{formatDate(opportunity.created_at)}</span>
                </div>
                <div>
                  <span className="block text-gray-600 mb-1">Atualizado em</span>
                  <span className="text-gray-900">{formatDate(opportunity.updated_at)}</span>
                </div>
                {opportunity.won_date && (
                  <div>
                    <span className="block text-gray-600 mb-1">Fechamento</span>
                    <span className="text-emerald-700 font-medium">{formatDate(opportunity.won_date)}</span>
                  </div>
                )}
                {opportunity.lost_date && (
                  <div>
                    <span className="block text-gray-600 mb-1">Perda</span>
                    <span className="text-red-700 font-medium">{formatDate(opportunity.lost_date)}</span>
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