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

type EmailForm = z.infer<typeof emailSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export function Login() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  const onEmailSubmit = async ({ email }: EmailForm) => {
    try {
      await requestOtp.mutateAsync(email);
      setEmail(email);
      setStep('otp');
    } catch {
      toast({ variant: 'destructive', title: 'Failed to send code', description: 'Please check the address and try again.' });
    }
  };

  const onOtpSubmit = async ({ otp }: OtpForm) => {
    try {
      await verifyOtp.mutateAsync({ email, otp });
    } catch {
      toast({ variant: 'destructive', title: 'Invalid code', description: 'The code may have expired. Try again.' });
    }
  };

  /* ── OTP step ── */
  if (step === 'otp') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Icon + heading */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--bg-primary-subtle)',
            border: '1px solid var(--border-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={22} style={{ color: 'var(--text-accent)' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Check your inbox
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
              We sent a code to<br />
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{email}</span>
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="p-form-label">Verification code</label>
            <input
              className={`p-input${otpForm.formState.errors.otp ? ' --error' : ''}`}
              placeholder="Enter 6-digit code"
              autoFocus
              autoComplete="one-time-code"
              {...otpForm.register('otp')}
              style={{
                textAlign: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.15em',
                fontSize: 18,
              }}
            />
            {otpForm.formState.errors.otp && (
              <span className="p-form-error">{otpForm.formState.errors.otp.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={verifyOtp.isPending}
            style={{
              width: '100%', height: 40, borderRadius: 8,
              background: verifyOtp.isPending ? 'var(--bg-primary-subtle)' : 'var(--bg-primary)',
              color: '#fff', border: 'none', cursor: verifyOtp.isPending ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'opacity 0.15s',
            }}
          >
            {verifyOtp.isPending ? (
              <>
                <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                Verifying…
              </>
            ) : (
              <>Verify & Sign in <ArrowRight size={14} /></>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStep('email')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              fontSize: 12, color: 'var(--text-tertiary)',
              padding: '4px 0',
            }}
          >
            <ChevronLeft size={13} /> Use a different email
          </button>
        </form>

        {/* Helper */}
        <p style={{ fontSize: 11, color: 'var(--text-quaternary)', textAlign: 'center', lineHeight: 1.6 }}>
          Didn't receive a code? Check your spam folder or{' '}
          <button
            onClick={() => onEmailSubmit({ email })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-accent)', fontSize: 11, padding: 0, textDecoration: 'underline' }}
          >
            resend
          </button>
        </p>
      </div>
    );
  }

  /* ── Email step ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Icon + heading */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'var(--bg-primary-subtle)',
          border: '1px solid var(--border-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Mail size={22} style={{ color: 'var(--text-accent)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Sign in to Param
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
            Enter your work email to receive a sign-in code
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="p-form-label">Work email</label>
          <input
            className={`p-input${emailForm.formState.errors.email ? ' --error' : ''}`}
            type="email"
            placeholder="you@company.com"
            autoFocus
            autoComplete="email"
            {...emailForm.register('email')}
          />
          {emailForm.formState.errors.email && (
            <span className="p-form-error">{emailForm.formState.errors.email.message}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={requestOtp.isPending}
          style={{
            width: '100%', height: 40, borderRadius: 8,
            background: requestOtp.isPending ? 'var(--bg-primary-subtle)' : 'var(--bg-primary)',
            color: '#fff', border: 'none', cursor: requestOtp.isPending ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'opacity 0.15s',
          }}
        >
          {requestOtp.isPending ? (
            <>
              <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              Sending code…
            </>
          ) : (
            <>Continue <ArrowRight size={14} /></>
          )}
        </button>
      </form>

      <p style={{ fontSize: 11, color: 'var(--text-quaternary)', textAlign: 'center', lineHeight: 1.6 }}>
        By continuing you agree to Param's Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
