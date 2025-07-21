import axios from 'axios';
import { createLogger } from '@/utils/logger';

const logger = createLogger('GroqService');

export interface ProposalData {
  clientName?: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  projectTitle: string;
  projectDescription?: string;
  dealValue: number;
  currency: string;
  serviceScope: string;
  additionalRequirements?: string;
  timeline?: string;
  deliverables?: string;
}

export interface ProcessedProposal {
  executiveSummary: string;
  projectScope: string;
  deliverables: string[];
  timeline: string;
  investment: string;
  functionPoints: {
    dataFunctions: number;
    transactionalFunctions: number;
    totalFunctionPoints: number;
    complexity: 'Baixa' | 'Média' | 'Alta';
    estimatedHours: number;
  };
  terms: string;
  nextSteps: string;
}

class GroqService {
  private apiKey: string;
  private baseURL: string = 'https://api.groq.com/openai/v1';

  constructor() {
    this.apiKey = import.meta.env.VITE_GROQ_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('GROQ API key not found in environment variables');
    }
  }

  async generateProposal(data: ProposalData): Promise<ProcessedProposal> {
    if (!this.apiKey) {
      throw new Error('API Groq não configurada. Verifique a variável VITE_GROQ_API_KEY');
    }

    try {
      logger.info('Generating proposal with Groq AI', { projectTitle: data.projectTitle });

      const prompt = this.buildPrompt(data);

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'mixtral-8x7b-32768', // Usando Mixtral como alternativa ao KIMI
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em elaboração de propostas comerciais e análise de pontos de função IFPUG. Sua tarefa é criar propostas profissionais e detalhadas.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      return this.parseAIResponse(aiResponse);

    } catch (error) {
      logger.error('Error generating proposal with Groq', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Chave da API Groq inválida');
        } else if (error.response?.status === 429) {
          throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
        } else if (error.response?.status >= 500) {
          throw new Error('Erro no servidor da Groq. Tente novamente mais tarde.');
        }
      }
      
      throw new Error('Erro ao gerar proposta com IA. Verifique sua conexão e tente novamente.');
    }
  }

  private buildPrompt(data: ProposalData): string {
    return `
Crie uma proposta comercial profissional baseada nas seguintes informações:

**DADOS DO CLIENTE:**
- Nome: ${data.clientName || 'Não informado'}
- Empresa: ${data.clientCompany || 'Não informado'}
- Email: ${data.clientEmail || 'Não informado'}
- Telefone: ${data.clientPhone || 'Não informado'}

**DADOS DO PROJETO:**
- Título: ${data.projectTitle}
- Descrição: ${data.projectDescription || 'Não informado'}
- Valor: ${data.dealValue} ${data.currency}
- Escopo do Serviço: ${data.serviceScope}
- Requisitos Adicionais: ${data.additionalRequirements || 'Não informado'}
- Cronograma: ${data.timeline || 'A definir'}
- Entregáveis: ${data.deliverables || 'A definir'}

**INSTRUÇÕES:**
1. Crie um resumo executivo atrativo
2. Detalhe o escopo do projeto de forma clara
3. Liste os entregáveis principais
4. Defina um cronograma realista
5. Apresente o investimento de forma profissional
6. Calcule os pontos de função usando metodologia IFPUG (estime funções de dados e transacionais)
7. Defina termos e condições básicos
8. Sugira próximos passos

**FORMATO DE RESPOSTA (JSON):**
{
  "executiveSummary": "Resumo executivo do projeto...",
  "projectScope": "Escopo detalhado do projeto...",
  "deliverables": ["Entregável 1", "Entregável 2", "..."],
  "timeline": "Cronograma detalhado...",
  "investment": "Apresentação do investimento...",
  "functionPoints": {
    "dataFunctions": 15,
    "transactionalFunctions": 25,
    "totalFunctionPoints": 40,
    "complexity": "Média",
    "estimatedHours": 320
  },
  "terms": "Termos e condições...",
  "nextSteps": "Próximos passos sugeridos..."
}

Responda APENAS com o JSON válido, sem texto adicional.
    `;
  }

  private parseAIResponse(response: string): ProcessedProposal {
    try {
      // Remove possíveis caracteres extras e tenta fazer parse do JSON
      const cleanResponse = response.trim().replace(/```json\n?|\n?```/g, '');
      const parsed = JSON.parse(cleanResponse);
      
      // Validação básica da estrutura
      if (!parsed.executiveSummary || !parsed.projectScope) {
        throw new Error('Resposta da IA incompleta');
      }

      return parsed as ProcessedProposal;
    } catch (error) {
      logger.error('Error parsing AI response', { response, error });
      
      // Fallback com estrutura básica
      return {
        executiveSummary: 'Proposta gerada com base nas informações fornecidas.',
        projectScope: 'Escopo do projeto conforme especificado.',
        deliverables: ['Entregável principal'],
        timeline: 'Cronograma a ser definido em reunião.',
        investment: `Investimento: ${response.includes('valor') ? 'Conforme especificado' : 'A definir'}`,
        functionPoints: {
          dataFunctions: 10,
          transactionalFunctions: 15,
          totalFunctionPoints: 25,
          complexity: 'Média',
          estimatedHours: 200
        },
        terms: 'Termos e condições padrão aplicáveis.',
        nextSteps: 'Agendar reunião para alinhamento de detalhes.'
      };
    }
  }

  // Método para testar a conexão com a API
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'mixtral-8x7b-32768',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.status === 200;
    } catch (error) {
      logger.error('Groq connection test failed', error);
      return false;
    }
  }
}

export const groqService = new GroqService();