import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Eye, 
  Download, 
  Send, 
  Calendar, 
  DollarSign, 
  Search, 
  Filter, 
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { proposalService } from '@/services/proposalService';
import type { ProposalSummary, SalesProposal } from '@/types/database';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ProposalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityId: string;
  opportunityTitle: string;
}

type ProposalStatus = 'all' | 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';

export function ProposalHistoryModal({ isOpen, onClose, opportunityId, opportunityTitle }: ProposalHistoryModalProps) {
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<ProposalSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus>('all');
  const [selectedProposal, setSelectedProposal] = useState<SalesProposal | null>(null);
  const [isViewingProposal, setIsViewingProposal] = useState(false);

  // Load proposals
  const loadProposals = async () => {
    if (!opportunityId) return;
    
    setLoading(true);
    try {
      const proposalsData = await proposalService.getProposalsByOpportunity(opportunityId);
      setProposals(proposalsData);
      setFilteredProposals(proposalsData);
    } catch (error) {
      console.error('Error loading proposals:', error);
      toast.error('Erro ao carregar propostas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && opportunityId) {
      loadProposals();
    }
  }, [isOpen, opportunityId]);

  // Filter proposals
  useEffect(() => {
    let filtered = proposals;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(proposal => 
        proposal.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(proposal => proposal.status === statusFilter);
    }

    setFilteredProposals(filtered);
  }, [proposals, searchTerm, statusFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-4 h-4" />;
      case 'sent':
        return <Send className="w-4 h-4" />;
      case 'viewed':
        return <Eye className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700' },
      sent: { label: 'Enviado', className: 'bg-blue-100 text-blue-700' },
      viewed: { label: 'Visualizado', className: 'bg-yellow-100 text-yellow-700' },
      accepted: { label: 'Aceito', className: 'bg-green-100 text-green-700' },
      rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-700' }
    };

    const config = configs[status as keyof typeof configs] || configs.draft;

    return (
      <Badge variant="secondary" className={config.className}>
        {getStatusIcon(status)}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  const handleViewProposal = async (proposalId: string) => {
    try {
      const proposal = await proposalService.getProposal(proposalId);
      setSelectedProposal(proposal);
      setIsViewingProposal(true);
    } catch (error) {
      console.error('Error loading proposal:', error);
      toast.error('Erro ao carregar proposta');
    }
  };

  const handleDeleteProposal = async (proposalId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta proposta?')) {
      return;
    }

    try {
      await proposalService.deleteProposal(proposalId);
      await loadProposals();
      toast.success('Proposta excluída com sucesso');
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Erro ao excluir proposta');
    }
  };

  const handleStatusChange = async (proposalId: string, newStatus: SalesProposal['status']) => {
    try {
      await proposalService.updateProposalStatus(proposalId, newStatus);
      await loadProposals();
      toast.success('Status da proposta atualizado');
    } catch (error) {
      console.error('Error updating proposal status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b border-gray-200">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <span>Histórico de Propostas</span>
                <p className="text-sm font-normal text-gray-500 mt-1">{opportunityTitle}</p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Lista de todas as propostas geradas para esta oportunidade
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Filters */}
            <div className="px-6 py-4 bg-gray-50 border-b">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar propostas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="w-48">
                  <Select value={statusFilter} onValueChange={(value: ProposalStatus) => setStatusFilter(value)}>
                    <SelectTrigger>
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="sent">Enviado</SelectItem>
                      <SelectItem value="viewed">Visualizado</SelectItem>
                      <SelectItem value="accepted">Aceito</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Proposals List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-600">Carregando propostas...</span>
                  </div>
                </div>
              ) : filteredProposals.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm || statusFilter !== 'all' ? 'Nenhuma proposta encontrada' : 'Nenhuma proposta criada'}
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Tente ajustar os filtros de busca' 
                      : 'Crie sua primeira proposta para esta oportunidade'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {filteredProposals.map((proposal, index) => (
                      <motion.div
                        key={proposal.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-gray-900">{proposal.title}</h3>
                                  {getStatusBadge(proposal.status)}
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    v{proposal.version}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-green-500" />
                                    <span className="text-gray-600">Valor:</span>
                                    <span className="font-medium">{formatCurrency(proposal.total_price || 0)}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    <span className="text-gray-600">Criado:</span>
                                    <span className="font-medium">{formatDate(proposal.created_at)}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-purple-500" />
                                    <span className="text-gray-600">Criador:</span>
                                    <span className="font-medium">{proposal.created_by_name}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-600">Entregáveis:</span>
                                    <span className="font-medium">{proposal.deliverable_count}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewProposal(proposal.id)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Ver
                                </Button>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewProposal(proposal.id)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      Visualizar Detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Download className="w-4 h-4 mr-2" />
                                      Baixar PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Copy className="w-4 h-4 mr-2" />
                                      Duplicar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleStatusChange(proposal.id, 'sent')}
                                      disabled={proposal.status === 'sent'}
                                    >
                                      <Send className="w-4 h-4 mr-2" />
                                      Marcar como Enviado
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleStatusChange(proposal.id, 'accepted')}
                                      disabled={proposal.status === 'accepted'}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Marcar como Aceito
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteProposal(proposal.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {filteredProposals.length} de {proposals.length} proposta{proposals.length !== 1 ? 's' : ''}
              </div>
              <Button onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Proposal Detail Modal */}
      <Dialog open={isViewingProposal} onOpenChange={setIsViewingProposal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Proposta</DialogTitle>
            <DialogDescription>
              Visualize todos os detalhes desta proposta
            </DialogDescription>
          </DialogHeader>

          {selectedProposal && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedProposal.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedProposal.status)}
                    <Badge variant="outline">v{selectedProposal.version}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedProposal.total_price)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedProposal.price_per_function_point && 
                      `R$ ${selectedProposal.price_per_function_point}/PF`
                    }
                  </div>
                </div>
              </div>

              <Separator />

              {/* Executive Summary */}
              {selectedProposal.executive_summary && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Resumo Executivo</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedProposal.executive_summary}</p>
                  </div>
                </div>
              )}

              {/* Project Scope */}
              {selectedProposal.project_scope && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Escopo do Projeto</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedProposal.project_scope}</p>
                  </div>
                </div>
              )}

              {/* Timeline */}
              {selectedProposal.timeline && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Cronograma</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedProposal.timeline}</p>
                  </div>
                </div>
              )}

              {/* Investment */}
              {selectedProposal.investment_text && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Investimento</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedProposal.investment_text}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}