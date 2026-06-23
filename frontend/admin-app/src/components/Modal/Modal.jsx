import { useEffect } from 'react';

export function Modal({ isOpen, onClose, title, size = 'md', children, footer, bodyClassName = '' }) {
    useEffect(() => {
        if (!isOpen) return undefined;

        function onKeyDown(event) {
            if (event.key === 'Escape') onClose?.();
        }

        document.addEventListener('keydown', onKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-bg open" role="presentation" onMouseDown={onClose}>
            <div
                className={`modal-box modal-${size}`}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="modal-head">
                    <div className="modal-title">{title}</div>
                    <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Dong modal">×</button>
                </div>
                <div className={`modal-body ${bodyClassName}`.trim()}>{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Xac nhan thao tac',
    message,
    confirmLabel = 'Xac nhan',
    danger = false,
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={(
                <>
                    <button type="button" className="btn-secondary" onClick={onClose}>Huy</button>
                    <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
                </>
            )}
        >
            {typeof message === 'string' ? <p className="modal-text">{message}</p> : message}
        </Modal>
    );
}

export function InfoRow({ label, value, children }) {
    return (
        <div className="info-row">
            <span className="info-lbl">{label}</span>
            <span className="info-val">{children ?? value ?? '-'}</span>
        </div>
    );
}

export default Modal;
