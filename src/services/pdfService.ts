import jsPDF from 'jspdf';
import { ProcessedProposal, ProposalData } from './groqService';
import { createLogger } from '@/utils/logger';

const logger = createLogger('PDFService');

export interface PDFGenerationOptions {
  includeHeader?: boolean;
  includeFooter?: boolean;
  companyLogo?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
}

class PDFService {
  private defaultOptions: PDFGenerationOptions = {
    includeHeader: true,
    includeFooter: true,
    companyName: 'EvoSGA',
    companyAddress: 'Endereço da Empresa',
    companyPhone: '(11) 99999-9999',
    companyEmail: 'contato@evosga.com'
  };

  async generateProposalPDF(
    proposalData: ProposalData,
    processedProposal: ProcessedProposal,
    options: Partial<PDFGenerationOptions> = {}
  ): Promise<Blob> {
    try {
      logger.info('Generating PDF proposal', { projectTitle: proposalData.projectTitle });

      const finalOptions = { ...this.defaultOptions, ...options };
      const doc = new jsPDF();
      
      // Configurações básicas
      let yPosition = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Header da empresa
      if (finalOptions.includeHeader) {
        yPosition = this.addHeader(doc, finalOptions, yPosition);
      }

      // Título da proposta
      yPosition = this.addTitle(doc, proposalData, yPosition, margin);

      // Informações do cliente
      yPosition = this.addClientInfo(doc, proposalData, yPosition, margin, contentWidth);

      // Resumo executivo
      yPosition = this.addSection(doc, 'RESUMO EXECUTIVO', processedProposal.executiveSummary, yPosition, margin, contentWidth);

      // Metodologia e Tecnologias
      yPosition = this.addMethodologyAndTech(doc, yPosition, margin, contentWidth);

      // Escopo do projeto
      yPosition = this.addSection(doc, 'ESCOPO DO PROJETO', processedProposal.projectScope, yPosition, margin, contentWidth);

      // Entregáveis
      yPosition = this.addDeliverables(doc, processedProposal.deliverables, yPosition, margin, contentWidth);

      // Cronograma
      yPosition = this.addSection(doc, 'CRONOGRAMA', processedProposal.timeline, yPosition, margin, contentWidth);

      // Pontos de Função IFPUG
      yPosition = this.addFunctionPoints(doc, processedProposal.functionPoints, yPosition, margin, contentWidth);

      // Investimento
      yPosition = this.addSection(doc, 'INVESTIMENTO', processedProposal.investment, yPosition, margin, contentWidth);

      // Método de Pagamento
      yPosition = this.addPaymentMethod(doc, proposalData, yPosition, margin, contentWidth);

      // Termos e condições
      yPosition = this.addSection(doc, 'TERMOS E CONDIÇÕES', processedProposal.terms, yPosition, margin, contentWidth);

      // Próximos passos
      yPosition = this.addSection(doc, 'PRÓXIMOS PASSOS', processedProposal.nextSteps, yPosition, margin, contentWidth);

      // Footer
      if (finalOptions.includeFooter) {
        this.addFooter(doc, finalOptions);
      }

      // Converter para Blob
      const pdfBlob = doc.output('blob');
      logger.info('PDF generated successfully');
      
      return pdfBlob;

    } catch (error) {
      logger.error('Error generating PDF', error);
      throw new Error('Erro ao gerar PDF. Tente novamente.');
    }
  }

  private addHeader(doc: jsPDF, options: PDFGenerationOptions, yPosition: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Logo da empresa
    try {
      // Load logo from public folder - use async method properly
      this.addLogoToHeader(doc, yPosition);
    } catch (error) {
      logger.warn('Failed to add logo to PDF', error);
    }

    // Nome da empresa
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(options.companyName || 'EvoSGA', 80, yPosition);

    // Informações da empresa
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const companyInfo = [
      options.companyAddress,
      options.companyPhone,
      options.companyEmail
    ].filter(Boolean);

    companyInfo.forEach((info, index) => {
      if (info) {
        doc.text(info, 80, yPosition + 15 + (index * 5));
      }
    });

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(20, yPosition + 35, pageWidth - 20, yPosition + 35);

    return yPosition + 45;
  }

  private addLogoToHeader(doc: jsPDF, yPosition: number): void {
    // Create a simple rectangular logo placeholder
    const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAoAAAAGQCAYAAAAMEqKAAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAApySURBVHja7N0xbttAEEBBLpAbiCVLoB8AyQmsVCm5hC0nsBG3aVJEhWEUpoAKbyE48gFcugDpBNZ3gCEBFcTMDClfyNkhOd93AKhQVdVN13U3mTk8fLwDgKo0TXPT/4xhGNZd1/0ZhuHfHQBU5eD58+e3I39t13Xfd133/g4AdXnz5s2n0QAtSZIs//79+64OAKryzz9v7w5/X9VrGIb3dwCoSvNfO7dLkyRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkvQrkiRJ+hVJkiT9iiRJkn5FkiRJvyJJkqRfkSRJ0q9IkiTpVyRJkl0QGwBJGOzq7KzVBAAAAQMSRBJVk0BAAABCA==';
    
    try {
      // Use a simple rectangular logo placeholder
      // Blue rectangle matching the EvoSGA color scheme
      doc.setFillColor(53, 108, 255); // EvoSGA blue color
      doc.rect(20, yPosition - 5, 50, 25, 'F');
      
      // Add "EvoSGA" text in white over the blue rectangle
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255); // White text
      doc.text('EvoSGA', 33, yPosition + 7);
      
      // Reset text color to black for other text
      doc.setTextColor(0, 0, 0);
      
      logger.info('Logo placeholder added successfully to PDF header');
    } catch (error) {
      logger.warn('Failed to add logo image to PDF', error);
    }
  }

  private addTitle(doc: jsPDF, proposalData: ProposalData, yPosition: number, margin: number): number {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSTA COMERCIAL', margin, yPosition);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    const projectTitle = proposalData.projectTitle || 'Projeto sem título';
    doc.text(projectTitle, margin, yPosition + 10);

    // Data
    const currentDate = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(10);
    doc.text(`Data: ${currentDate}`, margin, yPosition + 20);

    return yPosition + 35;
  }

  private addClientInfo(doc: jsPDF, proposalData: ProposalData, yPosition: number, margin: number, contentWidth: number): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMAÇÕES DO CLIENTE', margin, yPosition);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const clientInfo = [
      proposalData.clientCompany && `Empresa: ${proposalData.clientCompany}`,
      proposalData.clientName && `Contato: ${proposalData.clientName}`,
      proposalData.clientEmail && `Email: ${proposalData.clientEmail}`,
      proposalData.clientPhone && `Telefone: ${proposalData.clientPhone}`
    ].filter(Boolean);

    clientInfo.forEach((info, index) => {
      if (info) {
        doc.text(info, margin, yPosition + 15 + (index * 5));
      }
    });

    return yPosition + 15 + (clientInfo.length * 5) + 10;
  }

  private addSection(doc: jsPDF, title: string, content: string, yPosition: number, margin: number, contentWidth: number): number {
    // Verificar se precisa de nova página
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Título da seção
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPosition);

    // Conteúdo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const safeContent = content || 'Conteúdo não disponível';
    const lines = doc.splitTextToSize(safeContent, contentWidth);
    doc.text(lines, margin, yPosition + 10);

    return yPosition + 10 + (lines.length * 5) + 10;
  }

  private addDeliverables(doc: jsPDF, deliverables: string[], yPosition: number, margin: number, contentWidth: number): number {
    // Verificar se precisa de nova página
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ENTREGÁVEIS', margin, yPosition);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    deliverables.forEach((deliverable, index) => {
      const safeDeliverable = deliverable || 'Entregável não especificado';
      const bulletPoint = `• ${safeDeliverable}`;
      const lines = doc.splitTextToSize(bulletPoint, contentWidth);
      doc.text(lines, margin, yPosition + 15 + (index * 8));
    });

    return yPosition + 15 + (deliverables.length * 8) + 10;
  }

  private addMethodologyAndTech(doc: jsPDF, yPosition: number, margin: number, contentWidth: number): number {
    // Verificar se precisa de nova página
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('METODOLOGIA E TECNOLOGIAS', margin, yPosition);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const methodologyContent = `Este projeto será desenvolvido utilizando metodologia ágil Scrum, com sprints de 2 semanas, reuniões diárias de alinhamento e entregas incrementais que garantem maior qualidade e controle do projeto.

TECNOLOGIAS UTILIZADAS:
• Flutter: Framework multiplataforma para desenvolvimento de aplicativos iOS e Android
• Firebase/Supabase: Backend como serviço para banco de dados, autenticação e armazenamento
• Clean Architecture: Arquitetura que garante código limpo, testável e manutenível
• Padrões MVVM/BLoC: Gerenciamento de estado reativo e organizado

BENEFÍCIOS DA ESCOLHA TECNOLÓGICA:
• Desenvolvimento multiplataforma: uma única base de código para iOS e Android
• Redução de custos de desenvolvimento e manutenção
• Performance nativa em ambas as plataformas
• Escalabilidade garantida pela infraestrutura em nuvem
• Facilidade de manutenção e atualizações`;

    const lines = doc.splitTextToSize(methodologyContent, contentWidth);
    doc.text(lines, margin, yPosition + 10);

    return yPosition + 10 + (lines.length * 5) + 10;
  }

  private addFunctionPoints(doc: jsPDF, functionPoints: ProcessedProposal['functionPoints'], yPosition: number, margin: number, contentWidth: number): number {
    // Verificar se precisa de nova página
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ANÁLISE DE PONTOS DE FUNÇÃO (IFPUG)', margin, yPosition);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const fpInfo = [
      `Funções de Dados: ${functionPoints.dataFunctions}`,
      `Funções Transacionais: ${functionPoints.transactionalFunctions}`,
      `Total de Pontos de Função: ${functionPoints.totalFunctionPoints}`,
      `Complexidade: ${functionPoints.complexity}`,
      `Estimativa de Horas: ${functionPoints.estimatedHours}h`
    ];

    fpInfo.forEach((info, index) => {
      doc.text(info, margin, yPosition + 15 + (index * 5));
    });

    return yPosition + 15 + (fpInfo.length * 5) + 10;
  }

  private addPaymentMethod(doc: jsPDF, proposalData: ProposalData, yPosition: number, margin: number, contentWidth: number): number {
    // Verificar se precisa de nova página
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDIÇÕES DE PAGAMENTO', margin, yPosition);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const paymentContent = proposalData.paymentMethod || 'Condições de pagamento a serem definidas em contrato.';
    const lines = doc.splitTextToSize(paymentContent, contentWidth);
    doc.text(lines, margin, yPosition + 10);

    return yPosition + 10 + (lines.length * 5) + 10;
  }

  private addFooter(doc: jsPDF, options: PDFGenerationOptions): void {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);

    // Texto do footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Esta proposta é válida por 30 dias a partir da data de emissão.', 20, pageHeight - 20);
    doc.text(`Gerado por ${options.companyName} - Sistema EvoSGA`, 20, pageHeight - 15);

    // Número da página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 40, pageHeight - 10);
    }
  }

  // Método para download direto do PDF
  downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Método para preview do PDF
  previewPDF(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}

export const pdfService = new PDFService();