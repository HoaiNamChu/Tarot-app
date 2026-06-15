import { useState } from 'react';
import './PasswordInput.css';

function EyeIcon({ open }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {open ? (
                <>
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <circle cx="12" cy="12" r="3" />
                </>
            ) : (
                <>
                    <path d="M2.5 12s3.5-6 9.5-6c2.2 0 4 .8 5.5 1.8M21.5 12s-3.5 6-9.5 6c-2.1 0-3.9-.7-5.3-1.7" />
                    <path d="M4 4l16 16" />
                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                </>
            )}
        </svg>
    );
}

export default function PasswordInput({ className = 'input', style, hideToggleWhenEmpty = false, ...props }) {
    const [visible, setVisible] = useState(false);
    const hasValue = Boolean(props.value);
    const showToggle = !hideToggleWhenEmpty || hasValue;

    return (
        <div className="password-input-wrap">
            <input
                {...props}
                className={className}
                style={{ ...style, paddingRight: showToggle ? '2.8rem' : style?.paddingRight }}
                type={visible ? 'text' : 'password'}
            />
            {showToggle && (
                <button
                    type="button"
                    className="password-eye-btn"
                    aria-label={visible ? 'An noi dung' : 'Hien noi dung'}
                    title={visible ? 'An' : 'Hien'}
                    onClick={() => setVisible(v => !v)}
                >
                    <EyeIcon open={visible} />
                </button>
            )}
        </div>
    );
}
