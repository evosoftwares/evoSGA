import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SalesOpportunity } from '@/types/database';

interface DeleteOpportunityConfirmationModalProps {
  opportunity: SalesOpportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const DeleteOpportunityConfirmationModal: React.FC<DeleteOpportunityConfirmationModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const expectedText = opportunity?.title || '';
  const isConfirmationValid = confirmationText.trim() === expectedText.trim();

  const handleConfirm = async () => {
    if (!isConfirmationValid) return;

    setIsDeleting(true);
    try {
      await onConfirm();
      handleClose();
    } catch (error) {
      console.error('Erro ao excluir oportunidade:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmationText('');
    setIsDeleting(false);
    onClose();
  };

  if (!opportunity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-12">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Confirmar Exclusão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 px-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-12">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800 mb-2">
                  Ação Irreversível
                </h4>
                <p className="text-sm text-red-700">
                  Esta ação não pode ser desfeita. A oportunidade será permanentemente removida do sistema.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Oportunidade a ser excluída:
              </h4>
              <div className="bg-gray-50 border rounded-lg p-8">
                <div className="font-medium text-gray-900 mb-2">{opportunity.title}</div>
                {opportunity.client_name && (
                  <div className="text-sm text-gray-600 mb-1">Cliente: {opportunity.client_name}</div>
                )}
                {opportunity.deal_value > 0 && (
                  <div className="text-sm text-gray-600">
                    Valor: R$ {opportunity.deal_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Para confirmar, digite o título da oportunidade:
                <span className="font-mono text-red-600 ml-1">"{expectedText}"</span>
              </label>
              <Input
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={`Digite: ${expectedText}`}
                className={`${
                  confirmationText && !isConfirmationValid 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : ''
                }`}
                disabled={isDeleting}
              />
              {confirmationText && !isConfirmationValid && (
                <p className="text-sm text-red-600 mt-2">
                  O texto deve corresponder exatamente ao título da oportunidade.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-12 border-t px-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmationValid || isDeleting}
            className="min-w-[100px]"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Excluindo...
              </div>
            ) : (
              'Excluir'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteOpportunityConfirmationModal;