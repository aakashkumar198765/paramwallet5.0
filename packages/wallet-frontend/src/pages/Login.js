import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, ArrowRight, ChevronLeft } from 'lucide-react';
import { useRequestOtp, useVerifyOtp } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
const emailSchema = z.object({
    email: z.string().email('Enter a valid email address'),
});
const otpSchema = z.object({
    otp: z.string().min(4, 'Enter the verification code'),
});
export function Login() {
    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const requestOtp = useRequestOtp();
    const verifyOtp = useVerifyOtp();
    const emailForm = useForm({ resolver: zodResolver(emailSchema) });
    const otpForm = useForm({ resolver: zodResolver(otpSchema) });
    const onEmailSubmit = async ({ email }) => {
        try {
            await requestOtp.mutateAsync(email);
            setEmail(email);
            setStep('otp');
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to send code', description: 'Please check the address and try again.' });
        }
    };
    const onOtpSubmit = async ({ otp }) => {
        try {
            await verifyOtp.mutateAsync({ email, otp });
        }
        catch {
            toast({ variant: 'destructive', title: 'Invalid code', description: 'The code may have expired. Try again.' });
        }
    };
    /* ── OTP step ── */
    if (step === 'otp') {
        return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 28 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: {
                                width: 48, height: 48, borderRadius: 14,
                                background: 'var(--bg-primary-subtle)',
                                border: '1px solid var(--border-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }, children: _jsx(Lock, { size: 22, style: { color: 'var(--text-accent)' } }) }), _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("h1", { style: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }, children: "Check your inbox" }), _jsxs("p", { style: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }, children: ["We sent a code to", _jsx("br", {}), _jsx("span", { style: { color: 'var(--text-primary)', fontWeight: 600 }, children: email })] })] })] }), _jsxs("form", { onSubmit: otpForm.handleSubmit(onOtpSubmit), style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("label", { className: "p-form-label", children: "Verification code" }), _jsx("input", { className: `p-input${otpForm.formState.errors.otp ? ' --error' : ''}`, placeholder: "Enter 6-digit code", autoFocus: true, autoComplete: "one-time-code", ...otpForm.register('otp'), style: {
                                        textAlign: 'center',
                                        fontFamily: "'JetBrains Mono', monospace",
                                        letterSpacing: '0.15em',
                                        fontSize: 18,
                                    } }), otpForm.formState.errors.otp && (_jsx("span", { className: "p-form-error", children: otpForm.formState.errors.otp.message }))] }), _jsx("button", { type: "submit", disabled: verifyOtp.isPending, style: {
                                width: '100%', height: 40, borderRadius: 8,
                                background: verifyOtp.isPending ? 'var(--bg-primary-subtle)' : 'var(--bg-primary)',
                                color: '#fff', border: 'none', cursor: verifyOtp.isPending ? 'not-allowed' : 'pointer',
                                fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                transition: 'opacity 0.15s',
                            }, children: verifyOtp.isPending ? (_jsxs(_Fragment, { children: [_jsx("span", { style: { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' } }), "Verifying\u2026"] })) : (_jsxs(_Fragment, { children: ["Verify & Sign in ", _jsx(ArrowRight, { size: 14 })] })) }), _jsxs("button", { type: "button", onClick: () => setStep('email'), style: {
                                background: 'none', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                fontSize: 12, color: 'var(--text-tertiary)',
                                padding: '4px 0',
                            }, children: [_jsx(ChevronLeft, { size: 13 }), " Use a different email"] })] }), _jsxs("p", { style: { fontSize: 11, color: 'var(--text-quaternary)', textAlign: 'center', lineHeight: 1.6 }, children: ["Didn't receive a code? Check your spam folder or", ' ', _jsx("button", { onClick: () => onEmailSubmit({ email }), style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-accent)', fontSize: 11, padding: 0, textDecoration: 'underline' }, children: "resend" })] })] }));
    }
    /* ── Email step ── */
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 28 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: {
                            width: 48, height: 48, borderRadius: 14,
                            background: 'var(--bg-primary-subtle)',
                            border: '1px solid var(--border-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }, children: _jsx(Mail, { size: 22, style: { color: 'var(--text-accent)' } }) }), _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("h1", { style: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }, children: "Sign in to Param" }), _jsx("p", { style: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }, children: "Enter your work email to receive a sign-in code" })] })] }), _jsxs("form", { onSubmit: emailForm.handleSubmit(onEmailSubmit), style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("label", { className: "p-form-label", children: "Work email" }), _jsx("input", { className: `p-input${emailForm.formState.errors.email ? ' --error' : ''}`, type: "email", placeholder: "you@company.com", autoFocus: true, autoComplete: "email", ...emailForm.register('email') }), emailForm.formState.errors.email && (_jsx("span", { className: "p-form-error", children: emailForm.formState.errors.email.message }))] }), _jsx("button", { type: "submit", disabled: requestOtp.isPending, style: {
                            width: '100%', height: 40, borderRadius: 8,
                            background: requestOtp.isPending ? 'var(--bg-primary-subtle)' : 'var(--bg-primary)',
                            color: '#fff', border: 'none', cursor: requestOtp.isPending ? 'not-allowed' : 'pointer',
                            fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            transition: 'opacity 0.15s',
                        }, children: requestOtp.isPending ? (_jsxs(_Fragment, { children: [_jsx("span", { style: { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' } }), "Sending code\u2026"] })) : (_jsxs(_Fragment, { children: ["Continue ", _jsx(ArrowRight, { size: 14 })] })) })] }), _jsx("p", { style: { fontSize: 11, color: 'var(--text-quaternary)', textAlign: 'center', lineHeight: 1.6 }, children: "By continuing you agree to Param's Terms of Service and Privacy Policy." })] }));
}
