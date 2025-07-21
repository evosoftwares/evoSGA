import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { DollarSign, User, MessageCircle, Tag, Calendar, TrendingUp, Phone, Mail, Building2, FileText } from 'lucide-react';
import { SalesOpportunity, Profile, Project, SalesTag, SalesColumn } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProjectBadge } from '@/components/projects/ProjectBadge';
import { GenerateProposalModal } from './GenerateProposalModal';

interface OpportunityCardProps {
  opportunity: SalesOpportunity;
  index: number;
  onClick: () => void;
  teamMembers: Profile[];
  projects: Project[];
  tags: SalesTag[];
  opportunityTags: { opportunity_id: string; tag_id: string }[];
  columns: SalesColumn[];
  commentCounts: Record<string, number>;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ 
  opportunity, 
  index, 
  onClick, 
  teamMembers, 
  projects, 
  tags, 
  opportunityTags,
  columns,
  commentCounts
}) => {
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  // Encontrar o responsável
  const assignee = teamMembers.find(member => member.id === opportunity.assignee);
  const assigneeName = assignee ? assignee.name : null;

  // Encontrar o projeto associado
  const project = projects.find(p => p.id === opportunity.project_id);

  // Encontrar as tags da oportunidade
  const opportunityTagIds = opportunityTags.filter(ot => ot.opportunity_id === opportunity.id).map(ot => ot.tag_id);
  const opportunityTagList = tags.filter(tag => opportunityTagIds.includes(tag.id));

  // Verificar se a oportunidade está na coluna "Fechado"
  const currentColumn = columns.find(col => col.id === opportunity.column_id);
  const isClosedWon = currentColumn?.title?.toLowerCase().includes('ganho') || 
                     currentColumn?.title?.toLowerCase().includes('won');
  const isClosedLost = currentColumn?.title?.toLowerCase().includes('perdido') || 
                       currentColumn?.title?.toLowerCase().includes('lost');
  const isClosed = isClosedWon || isClosedLost;

  // Verificar se está na coluna "Proposta"
  const isProposalColumn = currentColumn?.title?.toLowerCase().includes('proposta') || 
                          currentColumn?.title?.toLowerCase().includes('proposal');

  // Contagem de comentários
  const commentCount = commentCounts[opportunity.id] || 0;

  // Formatar valor monetário
  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Formatar data
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Obter cor da probabilidade
  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (probability >= 60) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (probability >= 40) return 'text-amber-700 bg-amber-50 border-amber-200';
    if (probability >= 20) return 'text-orange-700 bg-orange-50 border-orange-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  // Handler para abrir modal de proposta
  const handleGenerateProposal = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que o clique abra o modal de detalhes
    setIsProposalModalOpen(true);
  };

  // Handler para fechar modal de proposta
  const handleCloseProposalModal = () => {
    setIsProposalModalOpen(false);
  };

  return (
    <>
    <Draggable draggableId={opportunity.id} index={index} isDragDisabled={isClosed}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3 cursor-pointer 
            transition-all duration-200 ease-in-out
            hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5
            ${snapshot.isDragging ? 'rotate-1 shadow-xl scale-105 border-blue-300' : ''} 
            ${isClosed ? 'opacity-70 bg-gray-50' : ''}
            backdrop-blur-sm`}
          onClick={onClick}
        >
          <div className="space-y-3">
            {/* Header: Título e Status */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h3 className={`font-semibold text-sm leading-snug line-clamp-2 flex-1 ${
                  isClosed ? 'text-gray-600' : 'text-gray-900'
                } ${isClosedWon ? 'text-emerald-700' : ''} ${isClosedLost ? 'text-red-700 line-through' : ''}`}>
                  {opportunity.title}
                </h3>
                
                {/* Probabilidade no canto superior direito */}
                <Badge 
                  variant="outline" 
                  className={`text-xs px-2 py-1 h-6 shrink-0 font-medium border-2 ${getProbabilityColor(opportunity.probability)}`}
                >
                  {opportunity.probability}%
                </Badge>
              </div>
              
              {project && (
                <ProjectBadge project={project} size="sm" />
              )}
            </div>

            {/* Valor do Negócio */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-3 border-l-4 border-emerald-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-1.5 rounded-lg">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Valor do Negócio</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {formatCurrency(opportunity.deal_value, opportunity.currency)}
                    </p>
                  </div>
                </div>
                {opportunity.expected_close_date && (
                  <div className="text-right">
                    <p className="text-xs text-emerald-600 font-medium">Previsão</p>
                    <p className="text-sm font-semibold text-emerald-700">
                      {formatDate(opportunity.expected_close_date)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Informações do Cliente */}
            {(opportunity.client_name || opportunity.client_company) && (
              <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-200">
                <div className="space-y-1">
                  {opportunity.client_company && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3 h-3 text-blue-500" />
                      <span className="text-xs font-medium text-blue-700">{opportunity.client_company}</span>
                    </div>
                  )}
                  {opportunity.client_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-600">{opportunity.client_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {opportunity.client_email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-blue-600 truncate max-w-20" title={opportunity.client_email}>
                          {opportunity.client_email}
                        </span>
                      </div>
                    )}
                    {opportunity.client_phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-blue-600">{opportunity.client_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Descrição */}
            {opportunity.description && (
              <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-200">
                <p className={`text-xs leading-relaxed line-clamp-2 ${
                  isClosed ? 'text-gray-500' : 'text-gray-700'
                }`}>
                  {opportunity.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {opportunityTagList.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {opportunityTagList.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="text-xs px-2.5 py-1 h-6 font-medium rounded-full transition-colors hover:opacity-80"
                    style={{ backgroundColor: tag.color + '15', color: tag.color, borderColor: tag.color + '40' }}
                  >
                    <Tag className="w-3 h-3 mr-1.5" />
                    <span className="truncate max-w-20">{tag.name}</span>
                  </Badge>
                ))}
                {opportunityTagList.length > 3 && (
                  <Badge variant="outline" className="text-xs px-2.5 py-1 h-6 rounded-full font-medium bg-gray-50">
                    +{opportunityTagList.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Footer: Métricas e Responsável */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              {/* Métricas à esquerda */}
              <div className={`flex items-center space-x-3 text-xs ${
                isClosed ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {/* Fonte do Lead */}
                {opportunity.source && (
                  <div className="flex items-center gap-1.5 bg-purple-50 px-2 py-1 rounded-full">
                    <TrendingUp className="w-3 h-3 text-purple-500" />
                    <span className="font-medium text-purple-700 capitalize">{opportunity.source}</span>
                  </div>
                )}

                {/* Data de Previsão */}
                {opportunity.expected_close_date && (
                  <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-full">
                    <Calendar className="w-3 h-3 text-amber-500" />
                    <span className="font-medium text-amber-700">{formatDate(opportunity.expected_close_date)}</span>
                  </div>
                )}

                {/* Comentários */}
                <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-full">
                  <MessageCircle className="w-3 h-3 text-gray-500" />
                  <span className="font-medium">{commentCount}</span>
                </div>
              </div>

              {/* Responsável à direita */}
              <div className="flex items-center gap-2">
                {/* Botão de Gerar Proposta - apenas para coluna "Proposta" */}
                {isProposalColumn && !isClosed && (
                  <Button
                    onClick={handleGenerateProposal}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-200"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Gerar Proposta
                  </Button>
                )}

                {assigneeName && (
                  <div className={`flex items-center gap-2 text-xs bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-1.5 rounded-full ${
                    isClosed ? 'text-gray-500' : 'text-gray-700'
                  }`}>
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-sm">
                      <User className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-semibold max-w-20 truncate">{assigneeName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Indicador visual de oportunidade fechada */}
            {isClosedWon && (
              <div className="flex items-center justify-center pt-2">
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-2 rounded-full border border-emerald-200 shadow-sm">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold">Negócio Fechado!</span>
                </div>
              </div>
            )}

            {isClosedLost && (
              <div className="flex items-center justify-center pt-2">
                <div className="flex items-center gap-2 text-xs text-red-700 bg-gradient-to-r from-red-50 to-red-50 px-3 py-2 rounded-full border border-red-200 shadow-sm">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                  <span className="font-semibold">Oportunidade Perdida</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>

    {/* Modal de Geração de Proposta */}
    <GenerateProposalModal
      isOpen={isProposalModalOpen}
      onClose={handleCloseProposalModal}
      opportunity={opportunity}
    />
  </>
  );
};

export default OpportunityCard;