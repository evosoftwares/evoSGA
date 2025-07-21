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
  paymentMethod?: string;
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
    complexity: 'low' | 'medium' | 'high';
    technologyComplexity: 'low' | 'medium' | 'high';
    estimatedHours: number;
    analysis?: string;
  };
  terms: string;
  nextSteps: string;
}

export interface DetailedComponent {
  id: string;
  name: string;
  type: 'screen' | 'component' | 'api' | 'database' | 'integration';
  description: string;
  complexity: 'low' | 'medium' | 'high';
  functionPoints: number;
  category: string;
  dependencies: string[];
  features: string[];
  techRequirements: string[];
}

export interface DetailedSystemAnalysis {
  modules: {
    name: string;
    description: string;
    screens: DetailedComponent[];
    components: DetailedComponent[];
    apis: DetailedComponent[];
    databases: DetailedComponent[];
    integrations: DetailedComponent[];
  }[];
  totalFunctionPoints: number;
  complexityAnalysis: string;
  technicalArchitecture: string;
  recommendedApproach: string;
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

  async generateProposal(data: ProposalData, selectedDeliverables: string[] = []): Promise<ProcessedProposal> {
    if (!this.apiKey) {
      throw new Error('API Groq não configurada. Verifique a variável VITE_GROQ_API_KEY');
    }

    try {
      logger.info('Generating proposal with Groq AI', { projectTitle: data.projectTitle });

      const prompt = this.buildPrompt(data, selectedDeliverables);

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'moonshotai/kimi-k2-instruct',
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
      return this.parseAIResponse(aiResponse, selectedDeliverables);

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

  private buildPrompt(data: ProposalData, selectedDeliverables: string[] = []): string {
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
- Método de Pagamento: ${data.paymentMethod || 'A definir'}
- Cronograma: ${data.timeline || 'A definir'}
- Entregáveis Selecionados: ${selectedDeliverables.length > 0 ? selectedDeliverables.join(', ') : 'Nenhum entregável adicional selecionado'}

**METODOLOGIA E TECNOLOGIA OBRIGATÓRIAS:**
- Metodologia: Scrum (desenvolvimento ágil com sprints de 2 semanas)
- Tecnologia Principal: Flutter (framework multiplataforma para iOS e Android)
- Backend: Firebase e/ou Supabase (banco de dados em nuvem, autenticação, armazenamento)
- Arquitetura: Clean Architecture com padrões MVVM/BLoC

**INSTRUÇÕES:**
1. Crie um resumo executivo atrativo mencionando o uso de Scrum e Flutter
2. Detalhe o escopo do projeto de forma clara, destacando a metodologia Scrum
3. Use EXATAMENTE os entregáveis selecionados pelo cliente (não invente outros)
4. Defina um cronograma realista baseado em sprints de Scrum (2 semanas cada)
5. Apresente o investimento de forma profissional, incluindo o método de pagamento especificado
6. SEMPRE mencione que será utilizada metodologia Scrum e tecnologia Flutter com Firebase/Supabase
7. CALCULE OS PONTOS DE FUNÇÃO usando metodologia IFPUG baseado EXCLUSIVAMENTE na descrição do escopo:
   - Analise o escopo e identifique as funções de dados (arquivos, entidades, tabelas)
   - Analise o escopo e identifique as funções transacionais (telas, formulários, relatórios, consultas)
   - Calcule dataFunctions e transactionalFunctions separadamente
   - Determine totalFunctionPoints = dataFunctions + transactionalFunctions
8. Analise a complexidade geral do sistema e determine se é 'low', 'medium' ou 'high'
9. Analise a complexidade tecnológica e determine se é 'low', 'medium' ou 'high'
10. Defina termos e condições básicos
11. Sugira próximos passos incluindo reunião de kickoff do projeto Scrum

**IMPORTANTE**: NÃO gere uma lista de entregáveis. Os entregáveis serão fornecidos separadamente baseados na seleção do cliente.

**FORMATO DE RESPOSTA (JSON):**
{
  "executiveSummary": "Resumo executivo do projeto...",
  "projectScope": "Escopo detalhado do projeto...",
  "deliverables": [],
  "timeline": "Cronograma detalhado...",
  "investment": "Apresentação do investimento...",
  "functionPoints": {
    "dataFunctions": 15,
    "transactionalFunctions": 25,
    "totalFunctionPoints": 40,
    "complexity": "medium",
    "technologyComplexity": "medium",
    "estimatedHours": 320,
    "analysis": "Análise detalhada dos pontos de função baseada no escopo..."
  },
  "terms": "Termos e condições...",
  "nextSteps": "Próximos passos sugeridos..."
}

Responda APENAS com o JSON válido, sem texto adicional.
    `;
  }

  private parseAIResponse(response: string, selectedDeliverables: string[] = []): ProcessedProposal {
    try {
      const cleanedJSON = this.cleanAndValidateJSON(response);
      const parsed = this.parseWithFallbacks(cleanedJSON);
      
      // Validação básica da estrutura
      if (!parsed.executiveSummary || !parsed.projectScope) {
        throw new Error('Resposta da IA incompleta');
      }

      // Substituir os entregáveis da IA pelos selecionados pelo usuário
      const result = parsed as ProcessedProposal;
      result.deliverables = selectedDeliverables;
      
      return result;
    } catch (error) {
      logger.error('Error parsing AI response', { 
        response: response.substring(0, 500) + '...',
        errorPosition: this.getErrorPosition(error),
        error 
      });
      
      // Fallback com estrutura básica
      return {
        executiveSummary: 'Proposta gerada com base nas informações fornecidas.',
        projectScope: 'Escopo do projeto conforme especificado.',
        deliverables: selectedDeliverables,
        timeline: 'Cronograma a ser definido em reunião.',
        investment: `Investimento: ${response.includes('valor') ? 'Conforme especificado' : 'A definir'}`,
        functionPoints: {
          dataFunctions: 10,
          transactionalFunctions: 15,
          totalFunctionPoints: 25,
          complexity: 'medium',
          technologyComplexity: 'medium',
          estimatedHours: 200
        },
        terms: 'Termos e condições padrão aplicáveis.',
        nextSteps: 'Agendar reunião para alinhamento de detalhes.'
      };
    }
  }

  async generateDetailedSystemAnalysis(data: ProposalData, basicProposal: ProcessedProposal): Promise<DetailedSystemAnalysis> {
    if (!this.apiKey) {
      throw new Error('API Groq não configurada. Verifique a variável VITE_GROQ_API_KEY');
    }

    try {
      logger.info('Generating detailed system analysis with Groq AI', { projectTitle: data.projectTitle });

      const prompt = this.buildDetailedAnalysisPrompt(data, basicProposal);

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'moonshotai/kimi-k2-instruct',
          messages: [
            {
              role: 'system',
              content: 'Você é um arquiteto de software especialista em análise de sistemas e cálculo de pontos de função IFPUG. Sua tarefa é analisar propostas e decompor sistemas em componentes detalhados para estimativa precisa de pontos de função.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 6000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      return this.parseDetailedAnalysisResponse(aiResponse);

    } catch (error) {
      logger.error('Error generating detailed system analysis with Groq', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Chave da API Groq inválida');
        } else if (error.response?.status === 429) {
          throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
        } else if (error.response?.status >= 500) {
          throw new Error('Erro no servidor da Groq. Tente novamente mais tarde.');
        }
      }
      
      throw new Error('Erro ao gerar análise detalhada com IA. Verifique sua conexão e tente novamente.');
    }
  }

  private buildDetailedAnalysisPrompt(data: ProposalData, basicProposal: ProcessedProposal): string {
    return `
Baseado na proposta inicial abaixo, faça uma análise EXTREMAMENTE DETALHADA do sistema, decompondo em TODOS os módulos, telas, componentes, APIs, bancos de dados e integrações necessários.

**PROPOSTA INICIAL:**
- Projeto: ${data.projectTitle}
- Escopo: ${data.serviceScope}
- Resumo Executivo: ${basicProposal.executiveSummary}
- Escopo Detalhado: ${basicProposal.projectScope}

**METODOLOGIA E TECNOLOGIA OBRIGATÓRIAS:**
- Metodologia: Scrum (desenvolvimento ágil com sprints de 2 semanas)
- Tecnologia Principal: Flutter (framework multiplataforma para iOS e Android)
- Backend: Firebase e/ou Supabase (banco de dados em nuvem, autenticação, armazenamento)
- Arquitetura: Clean Architecture com padrões MVVM/BLoC

**INSTRUÇÕES:**
1. Analise PROFUNDAMENTE o escopo considerando arquitetura Flutter + Firebase/Supabase
2. Para cada módulo, liste TODAS as telas Flutter necessárias com descrições detalhadas
3. Para cada tela, identifique TODOS os widgets e funcionalidades Flutter específicas
4. Para cada tela, calcule pontos de função individuais considerando complexidade
5. Identifique TODAS as APIs Firebase/Supabase e endpoints necessários
6. Mapeie TODAS as coleções Firebase/tabelas Supabase necessárias
7. Liste TODAS as integrações externas necessárias
8. Seja EXTREMAMENTE ESPECÍFICO e DETALHADO com nomes de telas e funcionalidades
9. Considere funcionalidades básicas como login, cadastros, listagens, formulários, relatórios
10. Para cada componente, liste suas funcionalidades específicas
11. Considere padrões Flutter: StatefulWidget, StatelessWidget, BLoC, Provider, etc.
12. Inclua telas de administração, configurações, perfil, ajuda se aplicável ao escopo

**IMPORTANTE:**
- Pense como um arquiteto Flutter experiente
- Considere todas as funcionalidades implícitas (autenticação Firebase, autorização, logs, backup, etc.)
- Inclua widgets Flutter específicos (AppBar, Scaffold, ListView, Forms, etc.)
- Pense em APIs Firebase/Supabase completas (CRUD para cada coleção/tabela)
- Considere integrações necessárias (FCM, Analytics, Crashlytics, etc.)
- Seja realista com a complexidade considerando Flutter + Firebase/Supabase

**FORMATO DE RESPOSTA (JSON):**
{
  "modules": [
    {
      "name": "Nome do Módulo",
      "description": "Descrição detalhada do módulo",
      "screens": [
        {
          "id": "screen_001",
          "name": "Nome da Tela (ex: TelaLoginUsuario, TelaCadastroprodutos)",
          "type": "screen",
          "description": "Descrição MUITO DETALHADA da tela e sua finalidade",
          "complexity": "low|medium|high",
          "functionPoints": 3,
          "category": "Authentication/CRUD/List/Form/Report/Dashboard/Settings",
          "dependencies": ["screen_002", "api_001"],
          "features": ["Funcionalidade específica 1", "Funcionalidade específica 2", "Validação de campos", "Feedback visual", etc.],
          "techRequirements": ["StatefulWidget", "BLoC pattern", "Firebase Auth", "Form validation", etc.]
        }
      ],
      "components": [
        {
          "id": "comp_001",
          "name": "Nome do Componente",
          "type": "component",
          "description": "Descrição do componente",
          "complexity": "low|medium|high",
          "functionPoints": 2,
          "category": "UI/Business Logic/etc",
          "dependencies": [],
          "features": ["Funcionalidades do componente"],
          "techRequirements": ["Requisitos técnicos"]
        }
      ],
      "apis": [
        {
          "id": "api_001",
          "name": "Nome da API",
          "type": "api",
          "description": "Descrição da API",
          "complexity": "low|medium|high",
          "functionPoints": 4,
          "category": "CRUD/Integration/Business",
          "dependencies": ["db_001"],
          "features": ["Endpoints específicos"],
          "techRequirements": ["Requisitos da API"]
        }
      ],
      "databases": [
        {
          "id": "db_001",
          "name": "Nome da Tabela/Entidade",
          "type": "database",
          "description": "Descrição da estrutura",
          "complexity": "low|medium|high",
          "functionPoints": 7,
          "category": "Master Data/Transaction/etc",
          "dependencies": [],
          "features": ["Campos e relacionamentos"],
          "techRequirements": ["Requisitos de BD"]
        }
      ],
      "integrations": [
        {
          "id": "int_001",
          "name": "Nome da Integração",
          "type": "integration",
          "description": "Descrição da integração",
          "complexity": "low|medium|high",
          "functionPoints": 5,
          "category": "External API/Service/etc",
          "dependencies": ["api_001"],
          "features": ["Funcionalidades da integração"],
          "techRequirements": ["Requisitos de integração"]
        }
      ]
    }
  ],
  "totalFunctionPoints": 250,
  "complexityAnalysis": "Análise detalhada da complexidade geral do sistema",
  "technicalArchitecture": "Descrição da arquitetura técnica recomendada",
  "recommendedApproach": "Abordagem recomendada para desenvolvimento"
}

Responda APENAS com o JSON válido, sem texto adicional.
    `;
  }

  /**
   * Robust JSON cleaning with multiple passes to handle various malformation scenarios
   */
  private cleanAndValidateJSON(response: string): string {
    let cleaned = response.trim();
    
    // Step 1: Remove markdown formatting
    cleaned = cleaned.replace(/```json\n?|\n?```/g, '');
    cleaned = cleaned.replace(/^\s*[\r\n]/, '').replace(/[\r\n]\s*$/, '');
    
    // Step 2: Extract JSON from mixed content
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}') + 1;
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd);
    }
    
    // Step 3: Handle Portuguese characters and escape sequences
    cleaned = cleaned
      .replace(/\\n/g, '\\n') // Ensure newlines are properly escaped
      .replace(/\\"/g, '\\"') // Ensure quotes are properly escaped
      .replace(/"/g, '"') // Replace curly quotes with straight quotes
      .replace(/"/g, '"') // Replace curly quotes with straight quotes
      .replace(/'/g, "'") // Replace curly apostrophes
      .replace(/'/g, "'"); // Replace curly apostrophes
    
    // Step 4: Fix common JSON formatting issues
    cleaned = cleaned
      .replace(/,\s*}/g, '}') // Remove trailing commas in objects
      .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
      .replace(/}\s*{/g, '},{') // Add missing commas between objects
      .replace(/]\s*\[/g, '],['); // Add missing commas between arrays
    
    // Step 5: Ensure property keys are properly quoted
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    
    // Step 6: Handle unescaped quotes within string values
    cleaned = this.fixUnescapedQuotes(cleaned);
    
    // Step 7: Fix specific patterns that cause common position errors
    cleaned = this.fixCommonPositionErrors(cleaned);
    
    // Step 8: Validate bracket/brace balance (but don't fail hard)
    if (!this.isBalanced(cleaned)) {
      logger.warn('JSON structure appears unbalanced, but proceeding with parsing');
    }
    
    return cleaned;
  }
  
  /**
   * Fix unescaped quotes within string values
   */
  private fixUnescapedQuotes(json: string): string {
    let result = '';
    let inString = false;
    let lastChar = '';
    
    for (let i = 0; i < json.length; i++) {
      const char = json[i];
      
      if (char === '"' && lastChar !== '\\') {
        inString = !inString;
        result += char;
      } else if (inString && char === '"' && lastChar !== '\\') {
        // Unescaped quote inside string - escape it
        result += '\\"';
      } else {
        result += char;
      }
      
      lastChar = char;
    }
    
    return result;
  }
  
  /**
   * Fix common patterns that cause position-specific JSON errors
   */
  private fixCommonPositionErrors(json: string): string {
    let fixed = json;
    
    // Pattern 1: Fix "property": "value with "quotes" inside"
    // This is what typically causes position 1146 type errors
    fixed = fixed.replace(
      /("[\w\s]+"):\s*"([^"]*)"([^"]*)"([^"]*)"/g, 
      '$1: "$2\\"$3\\"$4"'
    );
    
    // Pattern 2: Fix broken strings that span multiple lines in JSON
    fixed = fixed.replace(
      /"\s*\n\s*([^"]*)\n\s*"/g,
      '"$1"'
    );
    
    // Pattern 3: Fix missing quotes after colons
    fixed = fixed.replace(
      /:\s*([a-zA-ZÀ-ÿ][^,}\]]*[^",}\]]),?/g,
      ': "$1",'
    );
    
    // Pattern 4: Fix double commas and space issues
    fixed = fixed.replace(/,,+/g, ',').replace(/,\s*,/g, ',');
    
    return fixed;
  }
  
  /**
   * Check if brackets and braces are balanced
   */
  private isBalanced(json: string): boolean {
    const stack: string[] = [];
    const pairs: { [key: string]: string } = { '{': '}', '[': ']' };
    let inString = false;
    let lastChar = '';
    
    for (let i = 0; i < json.length; i++) {
      const char = json[i];
      
      if (char === '"' && lastChar !== '\\') {
        inString = !inString;
      } else if (!inString) {
        if (char === '{' || char === '[') {
          stack.push(pairs[char]);
        } else if (char === '}' || char === ']') {
          if (stack.length === 0 || stack.pop() !== char) {
            return false;
          }
        }
      }
      
      lastChar = char;
    }
    
    return stack.length === 0;
  }
  
  /**
   * Parse JSON with multiple fallback strategies
   */
  private parseWithFallbacks(json: string): any {
    const strategies = [
      // Strategy 1: Direct parsing
      () => JSON.parse(json),
      
      // Strategy 2: Remove problematic characters and retry
      () => {
        const cleaned = json
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\n/g, '\\n') // Escape remaining newlines
          .replace(/\r/g, '\\r') // Escape carriage returns
          .replace(/\t/g, '\\t'); // Escape tabs
        return JSON.parse(cleaned);
      },
      
      // Strategy 3: Fix specific character issues at position
      () => {
        let fixed = json;
        
        // Common issues at specific positions
        fixed = fixed
          .replace(/([^\\])"/g, '$1\\"') // Escape unescaped quotes
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([}\]])\s*([{\[])/g, '$1,$2'); // Add missing commas
        
        return JSON.parse(fixed);
      },
      
      // Strategy 4: Handle Portuguese text with quotes specifically 
      () => {
        let fixed = json;
        
        // Fix Portuguese quotes within string values (common cause of position errors)
        fixed = fixed.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1\\"$2\\"$3":');
        fixed = fixed.replace(/:\s*"([^"]*)"([^"]*)"([^"]*)"/g, ': "$1\\"$2\\"$3"');
        
        // Fix specific patterns that cause position 1146 type errors
        fixed = fixed
          .replace(/"\s*([a-zA-ZÀ-ÿ\s]+)\s*"\s*([a-zA-ZÀ-ÿ\s]+)\s*"/g, '"$1 $2"') // Merge broken quoted text
          .replace(/([^:,{\[]\s*)"([^"]*)"([^",}\]]*)/g, '$1"$2$3"'); // Fix broken quote boundaries
        
        return JSON.parse(fixed);
      },
      
      // Strategy 5: Extract valid JSON portions
      () => {
        const lines = json.split('\n');
        let validLines = [];
        let braceCount = 0;
        
        for (const line of lines) {
          for (const char of line) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }
          
          validLines.push(line);
          
          // If we've closed all braces, we might have a complete object
          if (braceCount === 0 && validLines.length > 0) {
            try {
              return JSON.parse(validLines.join('\n'));
            } catch {
              // Continue to next line
            }
          }
        }
        
        throw new Error('No valid JSON found');
      }
    ];
    
    let lastError: Error | null = null;
    
    for (const strategy of strategies) {
      try {
        return strategy();
      } catch (error) {
        lastError = error as Error;
        continue;
      }
    }
    
    throw lastError || new Error('All parsing strategies failed');
  }
  
  /**
   * Extract error position information for debugging
   */
  private getErrorPosition(error: any): { position?: number; line?: number; column?: number; character?: string } {
    if (!error || typeof error.message !== 'string') {
      return {};
    }
    
    const positionMatch = error.message.match(/at position (\d+)/);
    const lineColumnMatch = error.message.match(/line (\d+) column (\d+)/);
    
    const result: { position?: number; line?: number; column?: number; character?: string } = {};
    
    if (positionMatch) {
      result.position = parseInt(positionMatch[1]);
    }
    
    if (lineColumnMatch) {
      result.line = parseInt(lineColumnMatch[1]);
      result.column = parseInt(lineColumnMatch[2]);
    }
    
    return result;
  }

  private parseDetailedAnalysisResponse(response: string): DetailedSystemAnalysis {
    try {
      const cleanedJSON = this.cleanAndValidateJSON(response);
      const parsed = this.parseWithFallbacks(cleanedJSON);
      
      // Validação básica da estrutura
      if (!parsed.modules || !Array.isArray(parsed.modules)) {
        throw new Error('Resposta da IA incompleta - módulos não encontrados');
      }

      return parsed as DetailedSystemAnalysis;
    } catch (error) {
      logger.error('Error parsing detailed analysis response', { 
        response: response.substring(0, 1000) + '...',
        errorPosition: this.getErrorPosition(error),
        error 
      });
      
      // Fallback com estrutura básica
      return {
        modules: [
          {
            name: 'Módulo Principal',
            description: 'Módulo principal do sistema',
            screens: [
              {
                id: 'screen_001',
                name: 'Tela Principal',
                type: 'screen' as const,
                description: 'Tela principal do sistema',
                complexity: 'medium' as const,
                functionPoints: 8,
                category: 'Interface',
                dependencies: [],
                features: ['Autenticação', 'Dashboard', 'Menu Principal'],
                techRequirements: ['React', 'TypeScript']
              }
            ],
            components: [
              {
                id: 'comp_001',
                name: 'Sistema de Autenticação',
                type: 'component' as const,
                description: 'Componente de autenticação e autorização',
                complexity: 'high' as const,
                functionPoints: 15,
                category: 'Segurança',
                dependencies: [],
                features: ['Login', 'Logout', 'Recuperação de senha'],
                techRequirements: ['JWT', 'Bcrypt']
              }
            ],
            apis: [
              {
                id: 'api_001',
                name: 'API Principal',
                type: 'api' as const,
                description: 'API REST principal do sistema',
                complexity: 'medium' as const,
                functionPoints: 12,
                category: 'Backend',
                dependencies: [],
                features: ['CRUD', 'Validação', 'Documentação'],
                techRequirements: ['REST', 'JSON']
              }
            ],
            databases: [
              {
                id: 'db_001',
                name: 'Banco Principal',
                type: 'database' as const,
                description: 'Banco de dados principal',
                complexity: 'medium' as const,
                functionPoints: 10,
                category: 'Dados',
                dependencies: [],
                features: ['Persistência', 'Backup', 'Índices'],
                techRequirements: ['PostgreSQL', 'Migrations']
              }
            ],
            integrations: []
          }
        ],
        totalFunctionPoints: 45,
        complexityAnalysis: 'Sistema de complexidade média com componentes básicos',
        technicalArchitecture: 'Arquitetura moderna com React, TypeScript e PostgreSQL',
        recommendedApproach: 'Desenvolvimento incremental com metodologia ágil'
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
          model: 'moonshotai/kimi-k2-instruct',
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