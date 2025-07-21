import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Loader2, FileText, Download, Eye, Calculator, Clock, Users, Zap, Database, ArrowRight, Package, ArrowLeft, CheckCircle, AlertCircle, Target, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { groqService } from '@/services/groqService';
import { pdfService } from '@/services/pdfService';
import { ifpugCalculator, type IFPUGInputs, type ProjectEstimate } from '@/services/ifpugCalculatorService';
import type { Opportunity } from '@/types/opportunity';

interface GenerateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity;
}

interface ProposalFormData {
  serviceScope: string;
  deliverables: string[];
  additionalNotes: string;
  // IFPUG Inputs
  internalLogicalFiles: number;
  externalInterfaceFiles: number;
  externalInputs: number;
  externalOutputs: number;
  externalInquiries: number;
  complexityFactor: 'low' | 'medium' | 'high';
  teamExperience: 'junior' | 'pleno' | 'senior';
  technologyComplexity: 'low' | 'medium' | 'high';
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

export function GenerateProposalModal({ isOpen, onClose, opportunity }: GenerateProposalModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'ifpug' | 'review'>('form');
  const [formData, setFormData] = useState<ProposalFormData>({
    serviceScope: '',
    deliverables: [],
    additionalNotes: '',
    internalLogicalFiles: 1,
    externalInterfaceFiles: 0,
    externalInputs: 1,
    externalOutputs: 1,
    externalInquiries: 1,
    complexityFactor: 'medium',
    teamExperience: 'pleno',
    technologyComplexity: 'medium'
  });
  const [projectEstimate, setProjectEstimate] = useState<ProjectEstimate | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null);

  // Auto-estimar IFPUG baseado na descrição quando o escopo muda
  useEffect(() => {
    if (formData.serviceScope.length > 50) {
      const estimated = ifpugCalculator.estimateFromDescription(
        formData.serviceScope,
        formData.teamExperience
      );
      
      setFormData(prev => ({
        ...prev,
        ...estimated
      }));
    }
  }, [formData.serviceScope, formData.teamExperience]);

  // Calcular estimativa do projeto quando inputs IFPUG mudam
  useEffect(() => {
    const ifpugInputs: IFPUGInputs = {
      internalLogicalFiles: formData.internalLogicalFiles,
      externalInterfaceFiles: formData.externalInterfaceFiles,
      externalInputs: formData.externalInputs,
      externalOutputs: formData.externalOutputs,
      externalInquiries: formData.externalInquiries,
      complexityFactor: formData.complexityFactor,
      teamExperience: formData.teamExperience,
      technologyComplexity: formData.technologyComplexity
    };

    const validation = ifpugCalculator.validateInputs(ifpugInputs);
    if (validation.isValid) {
      try {
        const estimate = ifpugCalculator.calculateProjectEstimate(ifpugInputs);
        setProjectEstimate(estimate);
      } catch (error) {
        console.error('Erro ao calcular estimativa:', error);
      }
    }
  }, [
    formData.internalLogicalFiles,
    formData.externalInterfaceFiles,
    formData.externalInputs,
    formData.externalOutputs,
    formData.externalInquiries,
    formData.complexityFactor,
    formData.teamExperience,
    formData.technologyComplexity
  ]);

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
    setFormData({
      serviceScope: '',
      deliverables: [],
      additionalNotes: '',
      internalLogicalFiles: 1,
      externalInterfaceFiles: 0,
      externalInputs: 1,
      externalOutputs: 1,
      externalInquiries: 1,
      complexityFactor: 'medium',
      teamExperience: 'pleno',
      technologyComplexity: 'medium'
    });
    onClose();
  };



  const nextStep = () => {
    if (currentStep === 'form') {
      setCurrentStep('ifpug');
    } else if (currentStep === 'ifpug') {
      handleGenerateProposal();
    }
  };

  const prevStep = () => {
    if (currentStep === 'ifpug') {
      setCurrentStep('form');
    } else if (currentStep === 'review') {
      setCurrentStep('ifpug');
    }
  };

  const handleGenerateProposal = async () => {
    // Validações básicas
    if (!formData.serviceScope.trim()) {
      toast.error("Por favor, descreva o escopo do serviço.");
      return;
    }

    setIsGenerating(true);
    setCurrentStep('review');

    try {
      // Gerar proposta com IA
      toast.info("Gerando proposta com assistente de IA...");

      const processedProposal = await groqService.generateProposal(formData);

      // Gerar PDF
      toast.info("Montando documento final...");

      const pdfBlob = await pdfService.generateProposalPDF(formData, processedProposal);
      setGeneratedPdf(pdfBlob);

      toast.success("Proposta gerada com sucesso! Revise o documento e faça o download.");

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

    setIsGenerating(true);

    try {
      const processedProposal = await groqService.generateProposal(formData);
      const pdfBlob = await pdfService.generateProposalPDF(formData, processedProposal);
      
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
    return formData.serviceScope.trim().length > 0;
  };

  const canGenerateProposal = () => {
    return canProceedFromForm() && projectEstimate !== null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[96vw] max-w-5xl h-[96vh] max-h-[96vh] overflow-hidden p-0 gap-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <DialogHeader className="px-6 pt-6 pb-4 bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">Gerar Proposta Comercial</DialogTitle>
                <p className="text-sm text-slate-600 mt-0.5">Crie uma proposta profissional com estimativa IFPUG</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
              IA Assistida
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {/* Progress Steps - Redesigned */}
          <div className="sticky top-0 bg-white/90 backdrop-blur-sm py-4 mb-6 z-10">
            <div className="flex items-center justify-center">
              <div className="flex items-center bg-white rounded-full p-2 shadow-sm border border-slate-200">
                {/* Step 1 */}
                <div className={`flex items-center transition-all duration-300 ${
                  currentStep === 'form' 
                    ? 'text-blue-600' 
                    : currentStep === 'ifpug' || currentStep === 'review' 
                      ? 'text-green-600' 
                      : 'text-slate-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    currentStep === 'form' 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' 
                      : currentStep === 'ifpug' || currentStep === 'review'
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {currentStep === 'ifpug' || currentStep === 'review' ? '✓' : '1'}
                  </div>
                  <span className="ml-2 text-sm font-medium hidden sm:inline">Informações</span>
                </div>
                
                {/* Connector */}
                <div className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                  currentStep === 'ifpug' || currentStep === 'review' ? 'bg-green-300' : 'bg-slate-200'
                }`} />
                
                {/* Step 2 */}
                <div className={`flex items-center transition-all duration-300 ${
                  currentStep === 'ifpug' 
                    ? 'text-blue-600' 
                    : currentStep === 'review' 
                      ? 'text-green-600' 
                      : 'text-slate-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    currentStep === 'ifpug' 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' 
                      : currentStep === 'review'
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {currentStep === 'review' ? '✓' : '2'}
                  </div>
                  <span className="ml-2 text-sm font-medium hidden sm:inline">Estimativa</span>
                </div>
                
                {/* Connector */}
                <div className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                  currentStep === 'review' ? 'bg-green-300' : 'bg-slate-200'
                }`} />
                
                {/* Step 3 */}
                <div className={`flex items-center transition-all duration-300 ${
                  currentStep === 'review' ? 'text-blue-600' : 'text-slate-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    currentStep === 'review' 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' 
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    3
                  </div>
                  <span className="ml-2 text-sm font-medium hidden sm:inline">Revisão</span>
                </div>
              </div>
            </div>
          </div>

          {/* Opportunity Info Header - Enhanced */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-white to-slate-50 rounded-2xl p-6 mb-8 border border-slate-200/60 shadow-sm"
          >
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
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
            
            <Separator className="my-5 bg-slate-200/60" />
            
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
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Database className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Valor Estimado</p>
                  <p className="font-bold text-green-700 text-lg">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: opportunity.currency || 'BRL'
                    }).format(opportunity.deal_value)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Probabilidade</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-purple-700 text-lg">{opportunity.probability}%</p>
                    <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
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
              className="space-y-8 pb-6"
            >
              {/* Service Scope Section */}
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-3 text-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
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
                      <span className={`font-medium ${formData.serviceScope.length > 50 ? 'text-green-600' : 'text-slate-400'}`}>
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
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <span>Entregáveis Adicionais</span>
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                      {formData.deliverables.length} selecionados
                    </Badge>
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
                            className={`group relative p-5 border-2 rounded-2xl transition-all duration-300 cursor-pointer hover:shadow-md ${
                              isSelected 
                                ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-purple-50 shadow-sm' 
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {/* Selection Indicator */}
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div 
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0, rotate: 180 }}
                                  transition={{ duration: 0.3, ease: "backOut" }}
                                >
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1 }}
                                  >
                                    ✓
                                  </motion.div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="flex items-start gap-4">
                              <Checkbox
                                id={option.id}
                                checked={isSelected}
                                className="mt-1 h-5 w-5 rounded-md border-2 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
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
                                        ? 'border-green-400 text-green-800 bg-green-50' 
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
                      className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl"
                    >
                      <div className="flex items-center gap-2 text-green-800">
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
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
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span>Observações Complementares</span>
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
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
                      className="min-h-[80px] text-base bg-white border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 resize-none"
                    />
                    <p className="text-xs text-slate-500">
                      💭 Inclua qualquer informação relevante que possa impactar o desenvolvimento
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 'ifpug' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 pb-6"
            >
              {/* IFPUG Introduction */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                      <Calculator className="h-6 w-6 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-800">Estimativa IFPUG</h3>
                      <p className="text-slate-600 leading-relaxed">
                        Configure os parâmetros para calcular automaticamente os pontos de função, 
                        horas estimadas e cronograma do projeto baseado na metodologia IFPUG.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full w-fit">
                        <span className="font-medium">Cálculo automático baseado em IA</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Function Points Configuration */}
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-3 text-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                      <Database className="h-4 w-4 text-white" />
                    </div>
                    <span>Pontos de Função</span>
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      Configuração Base
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Defina a quantidade de cada tipo de função para o cálculo IFPUG
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { key: 'internalLogicalFiles', label: 'Arquivos Lógicos Internos', icon: '📁', color: 'from-orange-500 to-amber-600', description: 'Tabelas, entidades' },
                      { key: 'externalInterfaceFiles', label: 'Arquivos Interface Externa', icon: '🔗', color: 'from-pink-500 to-rose-600', description: 'APIs, integrações' },
                      { key: 'externalInputs', label: 'Entradas Externas', icon: '📥', color: 'from-green-500 to-emerald-600', description: 'Formulários, telas de entrada' },
                      { key: 'externalOutputs', label: 'Saídas Externas', icon: '📤', color: 'from-blue-500 to-cyan-600', description: 'Relatórios, consultas' },
                      { key: 'externalInquiries', label: 'Consultas Externas', icon: '🔍', color: 'from-purple-500 to-violet-600', description: 'Pesquisas, filtros' }
                    ].map((item) => (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="group"
                      >
                        <Card className="border-2 border-slate-200 hover:border-slate-300 transition-all duration-300 hover:shadow-md bg-white">
                          <CardContent className="p-5">
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-lg`}>
                                  {item.icon}
                                </div>
                                <div className="flex-1">
                                  <Label className="font-semibold text-slate-800 text-sm leading-tight">
                                    {item.label}
                                  </Label>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0"
                                  value={formData[item.key as keyof ProposalFormData] as number}
                                  onChange={(e) => handleInputChange(item.key as keyof ProposalFormData, parseInt(e.target.value) || 0)}
                                  className="text-center text-lg font-bold border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-slate-50"
                                  placeholder="0"
                                />
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                  <span className="text-xs text-slate-400 font-medium">pts</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Adjustment Factors */}
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-3 text-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <span>Fatores de Ajuste</span>
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                      Complexidade
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Ajuste a complexidade do projeto para refinar a estimativa
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <Label className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-xs">⚙️</div>
                        Complexidade do Sistema
                      </Label>
                      <Select value={formData.complexityFactor} onValueChange={(value: 'low' | 'medium' | 'high') => handleInputChange('complexityFactor', value)}>
                        <SelectTrigger className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa - Projeto simples</SelectItem>
                          <SelectItem value="medium">Média - Complexidade padrão</SelectItem>
                          <SelectItem value="high">Alta - Projeto complexo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-xs">👥</div>
                        Experiência da Equipe
                      </Label>
                      <Select value={formData.teamExperience} onValueChange={(value: 'junior' | 'pleno' | 'senior') => handleInputChange('teamExperience', value)}>
                        <SelectTrigger className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="junior">Júnior - Equipe iniciante</SelectItem>
                          <SelectItem value="pleno">Pleno - Experiência moderada</SelectItem>
                          <SelectItem value="senior">Sênior - Alta experiência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs">🔧</div>
                        Complexidade Tecnológica
                      </Label>
                      <Select value={formData.technologyComplexity} onValueChange={(value: 'low' | 'medium' | 'high') => handleInputChange('technologyComplexity', value)}>
                        <SelectTrigger className="bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa - Tecnologias conhecidas</SelectItem>
                          <SelectItem value="medium">Média - Algumas integrações</SelectItem>
                          <SelectItem value="high">Alta - Múltiplas integrações</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Estimativa Calculada */}
            <AnimatePresence>
              {projectEstimate && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="pb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      <CardTitle className="text-xl font-bold flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        <span>Resultado da Estimativa</span>
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          Calculado automaticamente
                        </Badge>
                      </CardTitle>
                      <p className="text-blue-100 mt-2">
                        Estimativa baseada na metodologia IFPUG com fatores de ajuste aplicados
                      </p>
                    </CardHeader>
                    <CardContent className="p-8">
                      {/* Métricas Principais */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="text-center"
                        >
                          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-md transition-all duration-300">
                            <CardContent className="p-6">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-4">
                                <Target className="h-6 w-6 text-white" />
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-600">Pontos de Função</p>
                                <p className="text-3xl font-bold text-slate-800">{projectEstimate.functionPoints.adjustedFunctionPoints}</p>
                                <p className="text-xs text-slate-500">PF ajustados</p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="text-center"
                        >
                          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-md transition-all duration-300">
                            <CardContent className="p-6">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
                                <Clock className="h-6 w-6 text-white" />
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-600">Horas Estimadas</p>
                                <p className="text-3xl font-bold text-slate-800">{projectEstimate.functionPoints.estimatedHours}h</p>
                                <p className="text-xs text-slate-500">Total do projeto</p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="text-center"
                        >
                          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-md transition-all duration-300">
                            <CardContent className="p-6">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
                                <Calendar className="h-6 w-6 text-white" />
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-600">Duração</p>
                                <p className="text-3xl font-bold text-slate-800">{projectEstimate.totalWeeks}</p>
                                <p className="text-xs text-slate-500">semanas</p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="text-center"
                        >
                          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-md transition-all duration-300">
                            <CardContent className="p-6">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="h-6 w-6 text-white" />
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-600">Timeline</p>
                                <p className="text-xl font-bold text-slate-800 break-words">{projectEstimate.functionPoints.timeline}</p>
                                <p className="text-xs text-slate-500">cronograma</p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </div>

                      {/* Distribuição das Fases */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Card className="border-2 border-slate-200 bg-white/80 backdrop-blur-sm">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-3 text-slate-800">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <Clock className="h-4 w-4 text-white" />
                              </div>
                              <span>Distribuição das Fases (dias)</span>
                              <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-700 bg-indigo-50">
                                Cronograma detalhado
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                              {[
                                { phase: 'Análise', days: projectEstimate.phases.analysis.days, icon: '🔍', color: 'from-blue-500 to-cyan-600' },
                                { phase: 'Design', days: projectEstimate.phases.design.days, icon: '🎨', color: 'from-purple-500 to-pink-600' },
                                { phase: 'Desenvolvimento', days: projectEstimate.phases.development.days, icon: '⚡', color: 'from-emerald-500 to-teal-600' },
                                { phase: 'Testes', days: projectEstimate.phases.testing.days, icon: '🧪', color: 'from-amber-500 to-orange-600' },
                                { phase: 'Implantação', days: projectEstimate.phases.deployment.days, icon: '🚀', color: 'from-red-500 to-pink-600' }
                              ].map((phase, index) => (
                                <motion.div
                                  key={phase.phase}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.6 + index * 0.1 }}
                                  className="text-center"
                                >
                                  <Card className="border border-slate-200 hover:border-slate-300 transition-all duration-300 hover:shadow-sm bg-white">
                                    <CardContent className="p-4">
                                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${phase.color} flex items-center justify-center mx-auto mb-3 text-lg`}>
                                        {phase.icon}
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-sm font-semibold text-slate-800">{phase.phase}</p>
                                        <p className="text-2xl font-bold text-slate-700">{phase.days}</p>
                                        <p className="text-xs text-slate-500">dias</p>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* Resumo Visual */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                          <h4 className="font-bold text-green-800">Resumo da Estimativa</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-green-700">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span><strong>Total PF:</strong> {projectEstimate.functionPoints.adjustedFunctionPoints} pontos</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-700">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span><strong>Produtividade:</strong> 8h por PF</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-700">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span><strong>Equipe sugerida:</strong> 3-4 pessoas</span>
                          </div>
                        </div>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
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
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <span>Revisão da Proposta</span>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    Pronto para gerar
                  </Badge>
                </CardTitle>
                <p className="text-emerald-100 mt-2">
                  Revise todas as informações antes de gerar o documento final da proposta
                </p>
              </CardHeader>
            </Card>

            {/* Conteúdo da Revisão */}
            <Card className="border-2 border-slate-200 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-8">
                {isGenerating && !generatedPdf ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center text-center py-16 space-y-6"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-white" />
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl blur opacity-30 animate-pulse"></div>
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
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full"
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
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-2xl">
                          <FileText className="h-12 w-12 text-white" />
                        </div>
                        <div className="absolute -inset-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-3xl blur opacity-30 animate-pulse"></div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"
                        >
                          <CheckCircle className="h-4 w-4 text-white" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Título e Descrição */}
                    <div className="space-y-4">
                      <h3 className="text-3xl font-bold text-green-800">
                        Proposta Gerada com Sucesso!
                      </h3>
                      <p className="text-lg text-green-700 max-w-2xl mx-auto leading-relaxed">
                        Sua proposta comercial para <span className="font-bold text-green-800">{opportunity.title}</span> foi gerada e está pronta para ser compartilhada com o cliente.
                      </p>
                    </div>

                    {/* Informações do Documento */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-3">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-blue-800">Formato</p>
                        <p className="text-xs text-blue-600 mt-1">PDF Profissional</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-3">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-purple-800">Gerado em</p>
                        <p className="text-xs text-purple-600 mt-1">{new Date().toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-3">
                          <Target className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-emerald-800">Status</p>
                        <p className="text-xs text-emerald-600 mt-1">Pronto para envio</p>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handlePreviewPdf}
                        className="flex items-center gap-3 text-base px-8 py-4 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <Eye className="h-5 w-5" />
                        Visualizar Documento
                      </Button>
                      <Button
                        size="lg"
                        onClick={handleDownloadPdf}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 flex items-center gap-3 text-base px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Download className="h-5 w-5" />
                        Baixar PDF
                      </Button>
                    </div>

                    {/* Dica Adicional */}
                    <div className="mt-8 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl max-w-lg mx-auto">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-amber-800">Dica Profissional</p>
                          <p className="text-xs text-amber-700 mt-1">
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

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 mt-8 border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-gray-50 -mx-8 px-8 pb-2"
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
          
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto order-1 sm:order-2">
            {currentStep !== 'review' && (
              <Button
                onClick={nextStep}
                disabled={isGenerating || (currentStep === 'form' && !formData.serviceScope.trim())}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex items-center gap-2 text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                {isGenerating && currentStep === 'ifpug' ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> 
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <span>{currentStep === 'form' ? 'Próximo Passo' : 'Gerar Proposta'}</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
                  </>
                )}
              </Button>
            )}
            
            {currentStep === 'form' && (
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={isGenerating || !formData.serviceScope.trim()}
                className="flex items-center gap-2 text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold w-full sm:w-auto border-2 border-blue-300 text-blue-700 hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-300"
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
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm sm:text-base font-semibold w-full sm:w-auto px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
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