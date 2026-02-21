import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDangerous = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#f0f2f5]">
                    <h3 className="font-bold text-[#111b21] flex items-center gap-2">
                        {isDangerous && <AlertTriangle size={20} className="text-red-500" />}
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-[#54656f] hover:text-[#111b21] hover:bg-black/5 rounded-full p-1 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-[#3b4a54] text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-[#00a884] hover:bg-[#f0f2f5] hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all transform active:scale-[0.98]
                            ${isDangerous
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-[#008069] hover:bg-[#006c59]'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
