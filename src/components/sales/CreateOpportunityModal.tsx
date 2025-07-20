import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SalesColumn, Project, Profile } from '@/types/database';
import { DollarSign, User, Calendar, Building2, Mail, Phone, Target } from 'lucide-react';

interface CreateOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateOpportunityData) => Promise<void>;
  columns: SalesColumn[];
  projects: Project[];
  profiles: Profile[];
  initialColumnId?: string;
}

interface CreateOpportunityData {
  title: string;
  description?: string;
  column_id: string;
  deal_value?: number;
  currency?: string;
  probability?: number;
  assignee?: string;
  project_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  source?: string;
  expected_close_date?: string;
}

const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  columns,
  projects,
  profiles,
  initialColumnId
}) => {
  const [formData, setFormData] = useState<CreateOpportunityData>({
    title: '',
    description: '',
    column_id: initialColumnId || '',
    deal_value: 0,
    currency: 'BRL',
    probability: 50,
    assignee: '',
    project_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_company: '',
    source: '',
    expected_close_date: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (!formData.column_id) {
      newErrors.column_id = 'Estágio é obrigatório';
    }

    if (formData.deal_value && formData.deal_value < 0) {
      newErrors.deal_value = 'Valor deve ser positivo';
    }

    if (formData.probability && (formData.probability < 0 || formData.probability > 100)) {
      newErrors.probability = 'Probabilidade deve estar entre 0 e 100';
    }

    if (formData.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
      newErrors.client_email = 'E-mail inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await onCreate(formData);
      handleClose();
    } catch (error) {
      console.error('Error creating opportunity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      column_id: initialColumnId || '',
      deal_value: 0,
      currency: 'BRL',
      probability: 50,
      assignee: '',
      project_id: '',
      client_name: '',
      client_email: '',
      client_phone: '',
      client_company: '',
      source: '',
      expected_close_date: ''
    });
    setErrors({});
    onClose();
  };

  const updateFormData = (field: keyof CreateOpportunityData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Sort columns by position
  const sortedColumns = columns.sort((a, b) => a.position - b.position);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Nova Oportunidade</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-4">
          {/* Basic Information */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="Ex: Implementação de sistema CRM"
                  className={errors.title ? 'border-red-300' : ''}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Descreva os detalhes da oportunidade..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estágio *
                </label>
                <Select
                  value={formData.column_id}
                  onValueChange={(value) => updateFormData('column_id', value)}
                >
                  <SelectTrigger className={errors.column_id ? 'border-red-300' : ''}>
                    <SelectValue placeholder="Selecionar estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedColumns.map(column => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.column_id && <p className="text-red-500 text-xs mt-1">{errors.column_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projeto</label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => updateFormData('project_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar projeto (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Financeiras</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Valor do Negócio
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.deal_value}
                  onChange={(e) => updateFormData('deal_value', parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className={errors.deal_value ? 'border-red-300' : ''}
                />
                {errors.deal_value && <p className="text-red-500 text-xs mt-1">{errors.deal_value}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => updateFormData('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL - Real</SelectItem>
                    <SelectItem value="USD">USD - Dólar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Probabilidade (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => updateFormData('probability', parseInt(e.target.value) || 0)}
                  placeholder="50"
                  className={errors.probability ? 'border-red-300' : ''}
                />
                {errors.probability && <p className="text-red-500 text-xs mt-1">{errors.probability}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data Esperada de Fechamento
                </label>
                <Input
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => updateFormData('expected_close_date', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Responsável
                </label>
                <Select
                  value={formData.assignee}
                  onValueChange={(value) => updateFormData('assignee', value)}
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
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Cliente</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Nome do Cliente
                </label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => updateFormData('client_name', e.target.value)}
                  placeholder="Nome do contato principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Empresa
                </label>
                <Input
                  value={formData.client_company}
                  onChange={(e) => updateFormData('client_company', e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  E-mail
                </label>
                <Input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => updateFormData('client_email', e.target.value)}
                  placeholder="email@empresa.com"
                  className={errors.client_email ? 'border-red-300' : ''}
                />
                {errors.client_email && <p className="text-red-500 text-xs mt-1">{errors.client_email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Telefone
                </label>
                <Input
                  value={formData.client_phone}
                  onChange={(e) => updateFormData('client_phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fonte do Lead</label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => updateFormData('source', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Como conheceu nossa empresa?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="referral">Indicação</SelectItem>
                    <SelectItem value="cold_call">Cold Call</SelectItem>
                    <SelectItem value="email">E-mail Marketing</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Criando...' : 'Criar Oportunidade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOpportunityModal;