/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [msg, setMsg] = useState('');
    const [visible, setVisible] = useState(false);
    const [type, setType] = useState('success'); // success | error
    const timer = useRef(null);

    const showToast = useCallback((message, t = 'success') => {
        setMsg(message);
        setType(t);
        setVisible(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setVisible(false), 3000);
    }, []);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className={`toast ${visible ? 'show' : ''}`}>
                <div className="toast-dot" style={{ background: type === 'error' ? 'var(--rose)' : 'var(--green)' }}></div>
                <div className="toast-msg">{msg}</div>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}