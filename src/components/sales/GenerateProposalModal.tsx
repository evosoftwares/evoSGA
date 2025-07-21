import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, FileText, Download, Eye, Calculator, Clock, Users, Zap, Database, ArrowRight, Package, ArrowLeft, CheckCircle, AlertCircle, Target, Calendar, TrendingUp, BarChart3, Folder, Link, Inbox, Send, Search, Settings, Palette, TestTube, Rocket, DollarSign, Layout, Code, Monitor, Smartphone, Globe, Shield, CreditCard, Building2, Users2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { groqService, type ProposalData, type DetailedSystemAnalysis } from '@/services/groqService';
import { pdfService } from '@/services/pdfService';
import { ifpugCalculator, type IFPUGInputs, type ProjectEstimate } from '@/services/ifpugCalculatorService';
import { proposalService, type CreateProposalData } from '@/services/proposalService';
import { useAuth } from '@/contexts/AuthContext';
import type { Opportunity } from '@/types/opportunity';

interface GenerateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity;
  onProposalCreated?: () => void;
}

interface ProposalFormData {
  serviceScope: string;
  deliverables: string[];
  additionalNotes: string;
  paymentMethod: string;
  // Team Experience for pricing
  teamExperience: 'alpha' | 'beta' | 'omega';
}

// Opções de entregáveis disponíveis
const DELIVERABLE_OPTIONS = [
  {
    id: 'marca',
    title: 'Registro de Marca',
    price: 'R$ 1.800',
    description: 'Registro do nome e/ou logotipo no INPI pelo departamento jurídico',
    details: 'Processo completo de registro no Instituto Nacional da Propriedade Industrial (INPI), incluindo pesquisa de marca e documentação.'
  },
  {
    id: 'landing',
    title: 'Landing Page simples focada em download de app',
    price: 'R$ 1.000',
    description: 'Página de internet focada em conversão para download do aplicativo',
    details: 'Página de destino profissional com design atraente, textos persuasivos (copywriting) e links diretos para as lojas Google Play e Apple Store.'
  },
  {
    id: 'android',
    title: 'Publicação em Android na Google Play',
    price: 'R$ 500',
    description: 'Processo completo de publicação na loja do Google',
    details: 'Configuração do painel de desenvolvedor, geração dos arquivos corretos, preenchimento de formulários, política de privacidade e resolução de pendências.'
  },
  {
    id: 'testing',
    title: 'Testagem com 14 pessoas durante 14 dias para aprovação do Google Play',
    price: 'R$ 1.500',
    description: 'Serviço de testes obrigatório para novas contas de desenvolvedor',
    details: 'Recrutamento e gerenciamento de testadores, garantia de uso pelo tempo exigido, coleta de feedback e geração de relatórios de comprovação.'
  },
  {
    id: 'apple',
    title: 'Publicação na Apple',
    price: 'R$ 1.000',
    description: 'Processo de publicação na App Store da Apple',
    details: 'Adequação às regras rigorosas da Apple, resposta às exigências dos revisores e processo de aprovação mais detalhado que o Google.'
  }
];

export function GenerateProposalModal({ isOpen, onClose, opportunity, onProposalCreated }: GenerateProposalModalProps) {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'preview' | 'screens' | 'ifpug' | 'review'>('form');
  const [formData, setFormData] = useState<ProposalFormData>({
    serviceScope: '',
    deliverables: [],
    additionalNotes: '',
    paymentMethod: '',
    teamExperience: 'beta'
  });
  const [projectEstimate, setProjectEstimate] = useState<ProjectEstimate | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null);
  const [processedProposal, setProcessedProposal] = useState<any>(null);
  const [detailedComponents, setDetailedComponents] = useState<DetailedSystemAnalysis | null>(null);
  const [approvedScreensAndComponents, setApprovedScreensAndComponents] = useState<DetailedSystemAnalysis | null>(null);

  // Convert form data to ProposalData format
  const convertToProposalData = (formData: ProposalFormData): ProposalData => {
    return {
      clientName: opportunity.client_name,
      clientCompany: opportunity.client_company,
      clientEmail: opportunity.client_email,
      clientPhone: opportunity.client_phone,
      projectTitle: opportunity.title,
      projectDescription: opportunity.description,
      dealValue: opportunity.deal_value,
      currency: opportunity.currency || 'BRL',
      serviceScope: formData.serviceScope,
      additionalRequirements: formData.additionalNotes,
      paymentMethod: formData.paymentMethod,
      deliverables: formData.deliverables.join(', ')
    };
  };

  // A estimativa será calculada pela IA durante a geração da proposta

  const handleInputChange = (field: keyof ProposalFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeliverableChange = (deliverableId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      deliverables: checked 
        ? [...prev.deliverables, deliverableId]
        : prev.deliverables.filter(id => id !== deliverableId)
    }));
  };

  const handleDownloadPdf = () => {
    if (generatedPdf) {
      const url = URL.createObjectURL(generatedPdf);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta-${opportunity.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF baixado com sucesso!');
    }
  };

  const handlePreviewPdf = () => {
    if (generatedPdf) {
      const url = URL.createObjectURL(generatedPdf);
      window.open(url, '_blank');
      toast.success('PDF aberto em nova aba!');
    }
  };

  const handleClose = () => {
    setCurrentStep('form');
    setGeneratedPdf(null);
    setProjectEstimate(null);
    setProcessedProposal(null);
    setDetailedComponents(null);
    setApprovedScreensAndComponents(null);
    setFormData({
      serviceScope: '',
      deliverables: [],
      additionalNotes: '',
      paymentMethod: '',
      teamExperience: 'beta'
    });
    onClose();
  };



  const nextStep = () => {
    if (currentStep === 'form') {
      handleGeneratePreview();
    } else if (currentStep === 'preview') {
      handleGenerateDetailedAnalysis();
    } else if (currentStep === 'screens') {
      handleApproveScreensAndCalculateIFPUG();
    } else if (currentStep === 'ifpug') {
      handleGenerateProposal();
    }
  };

  const prevStep = () => {
    if (currentStep === 'preview') {
      setCurrentStep('form');
    } else if (currentStep === 'screens') {
      setCurrentStep('preview');
    } else if (currentStep === 'ifpug') {
      setCurrentStep('screens');
    } else if (currentStep === 'review') {
      setCurrentStep('ifpug');
    }
  };

  const handleGeneratePreview = async () => {
    // Validações básicas
    if (!formData.serviceScope.trim()) {
      toast.error("Por favor, descreva o escopo do serviço.");
      return;
    }
    
    if (!formData.paymentMethod.trim()) {
      toast.error("Por favor, defina o método de pagamento.");
      return;
    }

    setIsGenerating(true);

    try {
      // Gerar proposta inicial com IA
      toast.info("Analisando proposta com assistente de IA...");

      const proposalData = convertToProposalData(formData);
      const generatedProposal = await groqService.generateProposal(proposalData, formData.deliverables);
      setProcessedProposal(generatedProposal);

      setCurrentStep('preview');
      toast.success("Proposta inicial gerada! Revise e prossiga para detalhamento de telas.");

    } catch (error) {
      console.error('Error generating preview:', error);
      
      toast.error(error instanceof Error ? error.message : "Erro desconhecido. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateDetailedAnalysis = async () => {
    if (!processedProposal) {
      toast.error("Proposta inicial não encontrada. Tente novamente.");
      return;
    }

    setIsGenerating(true);

    try {
      // Gerar análise detalhada com IA
      toast.info("Gerando análise detalhada de todos os componentes...");

      const proposalData = convertToProposalData(formData);
      const detailedAnalysis = await groqService.generateDetailedSystemAnalysis(proposalData, processedProposal);
      setDetailedComponents(detailedAnalysis);

      setCurrentStep('screens');
      toast.success("Análise de telas e componentes gerada! Revise e aprove antes do cálculo IFPUG.");

    } catch (error) {
      console.error('Error generating detailed analysis:', error);
      
      toast.error(error instanceof Error ? error.message : "Erro ao gerar análise detalhada. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveScreensAndCalculateIFPUG = async () => {
    if (!detailedComponents) {
      toast.error("Análise de telas não encontrada. Tente novamente.");
      return;
    }

    setIsGenerating(true);

    try {
      // Salvar componentes aprovados (por enquanto, aprovação automática)
      // Em uma implementação futura, aqui seria onde o usuário poderia editar
      setApprovedScreensAndComponents(detailedComponents);

      // Calcular estimativa usando dados aprovados
      toast.info("Calculando pontos de função IFPUG baseado nas telas aprovadas...");

      const totalFP = detailedComponents.totalFunctionPoints;
      const ifpugInputsWithAI: IFPUGInputs = {
        internalLogicalFiles: Math.round(totalFP * 0.3), // 30% para dados
        externalInterfaceFiles: 0,
        externalInputs: Math.round(totalFP * 0.7), // 70% para transações
        externalOutputs: 0,
        externalInquiries: 0,
        complexityFactor: processedProposal?.functionPoints?.complexity || 'medium',
        teamExperience: formData.teamExperience,
        technologyComplexity: processedProposal?.functionPoints?.technologyComplexity || 'medium'
      };

      const finalEstimate = ifpugCalculator.calculateProjectEstimate(ifpugInputsWithAI);
      setProjectEstimate(finalEstimate);

      setCurrentStep('ifpug');
      toast.success("Telas aprovadas e IFPUG calculado! Revise a estimativa final.");

    } catch (error) {
      console.error('Error approving screens and calculating IFPUG:', error);
      
      toast.error(error instanceof Error ? error.message : "Erro ao calcular IFPUG. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateProposal = async () => {
    if (!processedProposal || !projectEstimate || !user) {
      toast.error("Dados da proposta não encontrados. Tente novamente.");
      return;
    }

    setIsGenerating(true);
    setCurrentStep('review');

    try {
      // Gerar PDF
      toast.info("Montando documento final...");

      const proposalData = convertToProposalData(formData);
      const pdfBlob = await pdfService.generateProposalPDF(proposalData, processedProposal, {
        companyLogo: '/imagens/logo_evo.png'
      });
      setGeneratedPdf(pdfBlob);

      // Save proposal to database
      toast.info("Salvando proposta no banco de dados...");

      const createProposalData: CreateProposalData = {
        opportunityId: opportunity.id,
        title: `Proposta para ${opportunity.title}`,
        processedProposal,
        projectEstimate,
        teamExperience: formData.teamExperience,
        deliverables: formData.deliverables,
        createdBy: user.id
      };

      const savedProposal = await proposalService.createProposal(createProposalData);
      
      // Call callback to refresh proposals list
      if (onProposalCreated) {
        onProposalCreated();
      }
      
      toast.success("Proposta gerada e salva com sucesso! Revise o documento e faça o download.");

    } catch (error) {
      console.error('Error generating proposal:', error);
      
      toast.error(error instanceof Error ? error.message : "Erro desconhecido. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    if (!formData.serviceScope.trim()) {
      toast.error("Por favor, descreva o escopo do serviço para gerar a prévia.");
      return;
    }
    
    if (!formData.paymentMethod.trim()) {
      toast.error("Por favor, defina o método de pagamento para gerar a prévia.");
      return;
    }

    setIsGenerating(true);

    try {
      const proposalData = convertToProposalData(formData);
      const processedProposal = await groqService.generateProposal(proposalData, formData.deliverables);
      
      // Calcular estimativa usando dados retornados pela IA
      const ifpugInputsWithAI: IFPUGInputs = {
        internalLogicalFiles: processedProposal.functionPoints.dataFunctions,
        externalInterfaceFiles: 0, // Será incluído no dataFunctions pela IA
        externalInputs: processedProposal.functionPoints.transactionalFunctions,
        externalOutputs: 0, // Será incluído no transactionalFunctions pela IA
        externalInquiries: 0, // Será incluído no transactionalFunctions pela IA
        complexityFactor: processedProposal.functionPoints.complexity,
        teamExperience: formData.teamExperience,
        technologyComplexity: processedProposal.functionPoints.technologyComplexity
      };

      const finalEstimate = ifpugCalculator.calculateProjectEstimate(ifpugInputsWithAI);
      setProjectEstimate(finalEstimate);
      
      const pdfBlob = await pdfService.generateProposalPDF(proposalData, processedProposal, {
        companyLogo: '/imagens/logo_evo.png'
      });
      
      // Abrir preview em nova aba
      pdfService.previewPDF(pdfBlob);

      toast.success("A prévia da proposta foi aberta em uma nova aba.");

    } catch (error) {
      console.error('Error generating preview:', error);
      
      toast.error(error instanceof Error ? error.message : "Erro desconhecido. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const canProceedFromForm = () => {
    return formData.serviceScope.trim().length > 0 && formData.paymentMethod.trim().length > 0;
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[96vw] max-w-5xl h-[96vh] max-h-[96vh] overflow-hidden p-0 gap-0 bg-white">
        <DialogHeader className="px-6 py-6 bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">Gerar Proposta Comercial</DialogTitle>
                <DialogDescription className="text-sm text-slate-600 mt-0.5">
                  Crie uma proposta profissional com estimativa IFPUG
                </DialogDescription>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
              IA Assistida
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {/* Progress Steps - Redesigned */}
          <div className="sticky top-0 bg-white/90 backdrop-blur-sm py-4 mb-8 z-10">
            <div className="flex items-center justify-center">
              <div className="flex items-center bg-white rounded-full p-2 shadow-sm border border-slate-200">
                {/* Step 1 - Form */}
                <div className={`flex items-center transition-all duration-300 text-blue-600`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    currentStep === 'form' 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    {currentStep !== 'form' ? <CheckCircle className="h-4 w-4" /> : '1'}
                  </div>
                  <span className="ml-2 text-sm font-medium hidden sm:inline">Configuração</span>
                </div>
                
                {/* Connector 1 */}
                <div className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                  ['preview', 'screens', 'ifpug', 'review'].includes(currentStep) ? 'bg-blue-300' : 'bg-slate-200'
                }`} />
                
                {/* Step 2 - Preview */}
                <div className={`flex items-center transition-all duration-300 ${
                  currentStep === 'preview' 
                    ? 'text-blue-600' 
                    : ['screens', 'ifpug', 'review'].includes(currentStep)
                      ? 'text-blue-600'
                      : 'text-slate-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    currentStep === 'preview' 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' 
                      : ['screens', 'ifpug', 'review'].includes(currentStep)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {['screens', 'ifpug', 'review'].includes(currentStep) ? <CheckCircle className="h-4 w-4" /> : '2'}
                  </div>
                  <span className="ml-2 text-sm font-medium hidden sm:inline">Prévia</span>
                </div>
                
                {/* Connector 2 */}
                <div className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                  ['screens', 'ifpug', 'review'].includes(currentStep) ? 'bg-blue-300' : 'bg-slate-200'
                }`} />
                
                {/* Step 3 - Screens */}
                <div className={`flex items-center transition-all duration-300 ${
                  currentStep === 'screens' 
                    ? 'text-blue-600' 
                    : ['ifpug', 'review'].includes(currentStep)
                      ? 'text-blue-600'
                      : 'text-slate-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    currentStep === 'screens' 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' 
                      : ['ifpug', 'review'].includes(currentStep)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {['ifpug', 'review'].includes(currentStep) ? <CheckCircle className="h-4 w-4" /> : '3'}
                  </div>
                  <span className="ml-2 text-sm font-medium hidden sm:inline">Telas</span>
                </div>
                
                {/* Connector 3 */}
                <div className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                  ['ifpug', 'review'].includes(currentStep) ? 'bg-blue-300' : 'bg-slate-200'
                }`} />
                
                {/* Step 4 - IFPUG */}
                <div className={`flex items-center transition-all duration-300 ${
                  currentStep === 'ifpug' 
                    ? 'text-blue-600' 
                    : currentStep === 'review'
                      ? 'text-blue-600'
                      : 'text-slate-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    currentStep === 'ifpug' 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' 
                      : currentStep === 'review'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {currentStep === 'review' ? <CheckCircle className="h-4 w-4" /> : '4'}
                  </div>
                  <span className="ml-2 text-sm font-medium hidden sm:inline">IFPUG</span>
                </div>
                
                {/* Connector 4 */}
                <div className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                  currentStep === 'review' ? 'bg-blue-300' : 'bg-slate-200'
                }`} />
                
                {/* Step 5 - Review */}
                <div className={`flex items-center transition-all duration-300 ${
                  currentStep === 'review' ? 'text-blue-600' : 'text-slate-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    currentStep === 'review' 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' 
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    5
                  </div>
                  <span className="ml-2 text-sm font-medium hidden sm:inline">PDF Final</span>
                </div>
              </div>
            </div>
          </div>

          {/* Opportunity Info Header - Enhanced */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 mb-8 border border-slate-200/60 shadow-sm"
          >
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <h2 className="text-2xl font-bold text-slate-800 truncate">{opportunity.title}</h2>
                </div>
                <p className="text-slate-600 text-base">Proposta Comercial para <span className="font-semibold text-slate-800">{opportunity.client_name}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 font-medium">
                  Oportunidade Ativa
                </Badge>
              </div>
            </div>
            
            <Separator className="my-6 bg-slate-200/60" />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Empresa</p>
                  <p className="font-semibold text-slate-800 truncate">{opportunity.client_company}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Valor Estimado</p>
                  <p className="font-bold text-slate-700 text-lg">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: opportunity.currency || 'BRL'
                    }).format(opportunity.deal_value)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Probabilidade</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-700 text-lg">{opportunity.probability}%</p>
                    <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                        style={{ width: `${opportunity.probability}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step Content */}
          {currentStep === 'form' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 pb-8"
            >
              {/* Service Scope Section */}
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-3 text-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <Database className="h-4 w-4 text-white" />
                    </div>
                    <span>Escopo do Projeto</span>
                    <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Descreva detalhadamente o projeto para uma estimativa IFPUG precisa
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="serviceScope" className="text-base font-semibold text-slate-700">
                      Descrição Completa do Projeto *
                    </Label>
                    <Textarea
                      id="serviceScope"
                      placeholder="Ex: Sistema de gestão empresarial com módulos de vendas, estoque, financeiro e relatórios. Inclua funcionalidades específicas, integrações necessárias, requisitos técnicos e não-funcionais..."
                      value={formData.serviceScope}
                      onChange={(e) => handleInputChange('serviceScope', e.target.value)}
                      className="min-h-[140px] text-base bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none"
                    />
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-slate-500">
                        💡 Inclua módulos, funcionalidades, integrações e requisitos técnicos
                      </p>
                      <span className={`font-medium ${formData.serviceScope.length > 50 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {formData.serviceScope.length} caracteres
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deliverables Section */}
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-3 text-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <span>Entregáveis Adicionais</span>
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Selecione serviços complementares para incluir na proposta
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <AnimatePresence>
                      {DELIVERABLE_OPTIONS.map((option, index) => {
                        const isSelected = formData.deliverables.includes(option.id);
                        return (
                          <motion.div
                            key={option.id}
                            layout
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ 
                              opacity: 1, 
                              y: 0, 
                              scale: 1,
                              transition: { delay: index * 0.1 }
                            }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            onClick={() => handleDeliverableChange(option.id, !isSelected)}
                            className={`group relative p-4 border rounded-xl transition-all duration-300 cursor-pointer hover:shadow-md ${
                              isSelected 
                                ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm' 
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {/* Selection Indicator */}
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div 
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg"
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0, rotate: 180 }}
                                  transition={{ duration: 0.3, ease: "backOut" }}
                                >
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-white font-bold"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </motion.div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="flex items-start gap-4">
                              <Checkbox
                                id={option.id}
                                checked={isSelected}
                                className="mt-1 h-5 w-5 rounded-md border data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <Label htmlFor={option.id} className="font-semibold text-base cursor-pointer text-slate-800 leading-tight">
                                    {option.title}
                                  </Label>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-sm font-bold shrink-0 ${
                                      isSelected 
                                        ? 'border-blue-300 text-slate-800 bg-blue-50' 
                                        : 'border-slate-300 text-slate-600 bg-slate-50'
                                    }`}
                                  >
                                    {option.price}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                  {option.description}
                                </p>
                                <AnimatePresence>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0, y: -10 }}
                                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                                      exit={{ opacity: 0, height: 0, y: -10 }}
                                      transition={{ duration: 0.3, ease: "easeInOut" }}
                                      className="pt-2 border-t border-blue-200/60"
                                    >
                                      <p className="text-xs text-slate-500 leading-relaxed">
                                        📋 <strong>Detalhes:</strong> {option.details}
                                      </p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                  
                  {formData.deliverables.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl"
                    >
                      <div className="flex items-center gap-2 text-slate-800">
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{formData.deliverables.length}</span>
                        </div>
                        <span className="font-medium text-sm">
                          {formData.deliverables.length === 1 ? 'entregável selecionado' : 'entregáveis selecionados'}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Notes Section */}
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-3 text-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span>Observações Complementares</span>
                    <Badge variant="outline" className="text-xs border-slate-300 text-slate-600 bg-slate-50">
                      Opcional
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Informações adicionais, premissas ou restrições do projeto
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Textarea
                      id="additionalNotes"
                      placeholder="Ex: Premissas do projeto, restrições técnicas, prazos específicos, requisitos de infraestrutura..."
                      value={formData.additionalNotes}
                      onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                      className="min-h-[80px] text-base bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none"
                    />
                    <p className="text-xs text-slate-500">
                      💭 Inclua qualquer informação relevante que possa impactar o desenvolvimento
                    </p>
                  </div>

                  {/* Método de Pagamento */}
                  <div className="space-y-3 mt-6">
                    <Label className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
                        <CreditCard className="h-3 w-3 text-white" />
                      </div>
                      Método de Pagamento *
                    </Label>
                    <Textarea
                      id="paymentMethod"
                      placeholder="Ex: 30% na assinatura do contrato, 40% na entrega da primeira versão e 30% na entrega final. Aceita PIX, transferência bancária ou boleto bancário..."
                      value={formData.paymentMethod}
                      onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                      className="min-h-[80px] text-base bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none"
                    />
                    <p className="text-xs text-slate-500">
                      💳 Defina como será o pagamento: parcelamento, formas aceitas, prazos, etc.
                    </p>
                  </div>

                  {/* Experiência da Equipe */}
                  <div className="space-y-3 mt-6">
                    <Label className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Users className="h-3 w-3 text-white" />
                      </div>
                      Experiência da Equipe
                    </Label>
                    <Select value={formData.teamExperience} onValueChange={(value: 'alpha' | 'beta' | 'omega') => handleInputChange('teamExperience', value)}>
                      <SelectTrigger className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alpha">Alpha - Equipe iniciante (R$ 120/PF)</SelectItem>
                        <SelectItem value="beta">Beta - Experiência moderada (R$ 140/PF)</SelectItem>
                        <SelectItem value="omega">Omega - Alta experiência (R$ 160/PF)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      A experiência da equipe impacta no preço final. Os pontos de função serão calculados automaticamente pela IA baseado no escopo.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 'preview' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 pb-8"
            >
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-3 text-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                    <span>Prévia da Proposta</span>
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Revise a proposta inicial gerada pela IA
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {processedProposal ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-slate-800 mb-2">Resumo Executivo</h4>
                        <p className="text-sm text-slate-700">{processedProposal.executiveSummary}</p>
                      </div>
                      
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-semibold text-slate-800 mb-2">Pontos de Função Estimados</h4>
                        <p className="text-sm text-slate-700">
                          Total: {processedProposal.functionPoints?.total || 0} PF
                        </p>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-slate-800 mb-2">Metodologia</h4>
                        <p className="text-sm text-slate-700">{processedProposal.methodology}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                      <p className="text-slate-600 mt-2">Carregando prévia...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 'screens' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 pb-8"
            >
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-3 text-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <Monitor className="h-4 w-4 text-white" />
                    </div>
                    <span>Revisão de Telas e Componentes</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                      Aprovação Necessária
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Revise todas as telas e componentes identificados pela IA antes do cálculo IFPUG
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {detailedComponents ? (
                    <div className="space-y-6">
                      {/* Resumo Geral */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-slate-800 mb-2">Resumo da Análise</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">{detailedComponents.modules.length}</div>
                            <div className="text-sm text-slate-600">Módulos</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">
                              {detailedComponents.modules.reduce((acc, module) => acc + module.screens.length, 0)}
                            </div>
                            <div className="text-sm text-slate-600">Telas</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">{detailedComponents.totalFunctionPoints}</div>
                            <div className="text-sm text-slate-600">Pontos de Função</div>
                          </div>
                        </div>
                      </div>

                      {/* Lista de Módulos */}
                      <div className="space-y-4">
                        {detailedComponents.modules.map((module, moduleIndex) => (
                          <div key={moduleIndex} className="border border-slate-200 rounded-lg p-4">
                            <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                              <Folder className="h-4 w-4 text-blue-600" />
                              {module.name}
                            </h4>
                            <p className="text-sm text-slate-600 mb-4">{module.description}</p>
                            
                            {/* Telas do Módulo */}
                            {module.screens.length > 0 && (
                              <div className="mb-4">
                                <h5 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                                  <Monitor className="h-3 w-3 text-blue-500" />
                                  Telas ({module.screens.length})
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {module.screens.map((screen, screenIndex) => (
                                    <div key={screenIndex} className="p-3 bg-slate-50 rounded-lg">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium text-sm text-slate-800">{screen.name}</p>
                                          <p className="text-xs text-slate-600">{screen.description}</p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          {screen.functionPoints} PF
                                        </Badge>
                                      </div>
                                      {screen.features.length > 0 && (
                                        <div className="mt-2">
                                          <p className="text-xs text-slate-500">Funcionalidades:</p>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {screen.features.slice(0, 3).map((feature, idx) => (
                                              <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                {feature}
                                              </span>
                                            ))}
                                            {screen.features.length > 3 && (
                                              <span className="text-xs text-slate-400">+{screen.features.length - 3} mais</span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Componentes do Módulo */}
                            {module.components.length > 0 && (
                              <div className="mb-4">
                                <h5 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                                  <Package className="h-3 w-3 text-green-500" />
                                  Componentes ({module.components.length})
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {module.components.map((component, compIndex) => (
                                    <div key={compIndex} className="p-3 bg-green-50 rounded-lg">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium text-sm text-slate-800">{component.name}</p>
                                          <p className="text-xs text-slate-600">{component.description}</p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          {component.functionPoints} PF
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Ações de Aprovação */}
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700">Aprovação Necessária</p>
                            <p className="text-sm text-slate-600">
                              Revise as telas e componentes acima. Ao aprovar, o cálculo IFPUG será realizado baseado nesta análise.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                      <p className="text-slate-600 mt-2">Carregando análise de telas...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 'ifpug' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 pb-8"
            >
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-3 text-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <Calculator className="h-4 w-4 text-white" />
                    </div>
                    <span>Análise IFPUG Detalhada</span>
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Revise os componentes detalhados e estimativa final
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {detailedComponents && projectEstimate ? (
                    <div className="space-y-6">
                      {/* Componentes Detalhados */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold text-slate-800 mb-2">Módulos Identificados</h4>
                          <p className="text-sm text-slate-700">{detailedComponents.modules.length} módulos</p>
                          <div className="mt-2 space-y-1">
                            {detailedComponents.modules.slice(0, 3).map((module, index) => (
                              <div key={index} className="text-xs text-slate-600">
                                • {module.name} ({module.functionPoints} PF)
                              </div>
                            ))}
                            {detailedComponents.modules.length > 3 && (
                              <div className="text-xs text-slate-500">
                                +{detailedComponents.modules.length - 3} módulos adicionais
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h4 className="font-semibold text-slate-800 mb-2">Total de Pontos de Função</h4>
                          <p className="text-2xl font-bold text-slate-800">{detailedComponents.totalFunctionPoints} PF</p>
                          <p className="text-sm text-slate-600 mt-1">
                            Baseado na análise detalhada dos componentes
                          </p>
                        </div>
                      </div>

                      {/* Estimativa Final */}
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-slate-800 mb-4 text-lg">Estimativa Final do Projeto</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(projectEstimate.totalCost)}
                            </div>
                            <div className="text-sm text-slate-600">Custo Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">{projectEstimate.duration} meses</div>
                            <div className="text-sm text-slate-600">Duração</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">{projectEstimate.teamSize}</div>
                            <div className="text-sm text-slate-600">Desenvolvedores</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                      <p className="text-slate-600 mt-2">Calculando estimativa IFPUG...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

        {currentStep === 'review' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Header da Revisão */}
            <Card className="border-0 shadow-lg bg-blue-50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-4 bg-blue-600 text-white">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <span>Revisão da Proposta</span>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    Pronto para gerar
                  </Badge>
                </CardTitle>
                <p className="text-blue-100 mt-2">
                  Revise todas as informações antes de gerar o documento final da proposta
                </p>
              </CardHeader>
            </Card>

            {/* Conteúdo da Revisão */}
            <Card className="border border-slate-200 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-6">
                {isGenerating && !generatedPdf ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center text-center py-16 space-y-6"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-white" />
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-blue-500 rounded-3xl blur opacity-30 animate-pulse"></div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold text-slate-800">Gerando sua proposta...</h3>
                      <p className="text-slate-600 max-w-md text-lg">
                        Nosso assistente de IA está compilando as informações e montando um documento profissional.
                      </p>
                    </div>
                    <div className="w-full max-w-md">
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <motion.div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
                        />
                      </div>
                      <p className="text-sm text-slate-500 mt-2">Isso pode levar alguns segundos...</p>
                    </div>
                  </motion.div>
                ) : generatedPdf ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="text-center space-y-8 py-8"
                  >
                    {/* Ícone de Sucesso */}
                    <div className="flex items-center justify-center mb-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-3xl bg-blue-600 flex items-center justify-center shadow-2xl">
                          <FileText className="h-12 w-12 text-white" />
                        </div>
                        <div className="absolute -inset-3 bg-gradient-to-r from-blue-400 to-blue-500 rounded-3xl blur opacity-30 animate-pulse"></div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg"
                        >
                          <CheckCircle className="h-4 w-4 text-white" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Título e Descrição */}
                    <div className="space-y-4">
                      <h3 className="text-3xl font-bold text-slate-800">
                        Proposta Gerada com Sucesso!
                      </h3>
                      <p className="text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
                        Sua proposta comercial para <span className="font-bold text-slate-800">{opportunity.title}</span> foi gerada e está pronta para ser compartilhada com o cliente.
                      </p>
                    </div>

                    {/* Informações do Documento */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-blue-800">Formato</p>
                        <p className="text-xs text-blue-600 mt-1">PDF Profissional</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl border border-slate-200">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">Gerado em</p>
                        <p className="text-xs text-blue-600 mt-1">{new Date().toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
                          <Target className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">Status</p>
                        <p className="text-xs text-slate-600 mt-1">Pronto para envio</p>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handlePreviewPdf}
                        className="flex items-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 border border-blue-300 text-blue-700 hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-300 rounded-lg"
                      >
                        <Eye className="h-5 w-5" />
                        Visualizar Documento
                      </Button>
                      <Button
                        size="lg"
                        onClick={handleDownloadPdf}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 shadow-md hover:shadow-lg transition-all duration-300 rounded-lg"
                      >
                        <Download className="h-5 w-5" />
                        Baixar PDF
                      </Button>
                    </div>

                    {/* Dica Adicional */}
                    <div className="mt-8 p-4 bg-blue-50 border border-slate-200 rounded-xl max-w-lg mx-auto">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-700">Dica Profissional</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Revise o documento antes de enviar ao cliente e personalize conforme necessário.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        )}
        </div>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 mt-8 border-t border-slate-200 bg-white -mx-6 px-6 pb-6"
        >
          <Button
            variant="ghost"
            onClick={currentStep === 'form' ? handleClose : prevStep}
            disabled={isGenerating}
            className="text-sm sm:text-base w-full sm:w-auto order-2 sm:order-1 hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 'form' ? 'Cancelar' : 'Voltar'}
          </Button>
          
          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            {currentStep !== 'review' && (
              <Button
                onClick={nextStep}
                disabled={isGenerating || (currentStep === 'form' && !canProceedFromForm())}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> 
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <span>Gerar Proposta</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
                  </>
                )}
              </Button>
            )}
            
            {currentStep === 'form' && (
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={isGenerating || !canProceedFromForm()}
                className="flex items-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold w-full sm:w-auto border border-blue-300 text-blue-700 hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-300"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> 
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Prévia</span>
                  </>
                )}
              </Button>
            )}
            
            {currentStep === 'review' && generatedPdf && (
              <Button
                onClick={handleClose}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-semibold w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Concluir e Fechar
              </Button>
            )}
          </div>
        </motion.div>
       </DialogContent>
     </Dialog>
   );
 }