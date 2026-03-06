import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { requestOtp, verifyOtp } from '@/api/auth.api';
import { Mail, KeyRound } from 'lucide-react';

const emailSchema = z.object({ email: z.string().email('Enter a valid email') });
const otpSchema = z.object({ otp: z.string().length(6, 'OTP must be 6 digits') });

type EmailForm = z.infer<typeof emailSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { toast } = useToast();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
  });

  const handleEmailSubmit = async (data: EmailForm) => {
    setLoading(true);
    try {
      await requestOtp(data.email);
      setEmail(data.email);
      setStep('otp');
      toast({ title: 'OTP sent', description: `Check your email: ${data.email}` });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send OTP. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (data: OtpForm) => {
    setLoading(true);
    try {
      const result = await verifyOtp(email, data.otp);
      setAuth({
        token: result.token,
        refreshToken: result.refreshToken,
        paramId: result.paramId,
        userId: result.userId,
        email: result.email,
      });
      navigate('/post-login');
    } catch {
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'Please check the code and try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{step === 'email' ? 'Sign In' : 'Verify OTP'}</CardTitle>
        <CardDescription>
          {step === 'email'
            ? 'Enter your email to receive a one-time password'
            : `Enter the 6-digit code sent to ${email}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'email' ? (
          <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="pl-8"
                  {...emailForm.register('email')}
                />
              </div>
              {emailForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Request OTP'}
            </Button>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">One-Time Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="pl-8 tracking-widest text-center text-lg"
                  {...otpForm.register('otp')}
                />
              </div>
              {otpForm.formState.errors.otp && (
                <p className="text-xs text-destructive">
                  {otpForm.formState.errors.otp.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setStep('email')}
            >
              Back
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
