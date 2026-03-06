import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { requestOtp, verifyOtp, ssoLogin } from '@/api/auth.api';
import { listWorkspaces } from '@/api/workspace.api';
export function useRequestOtp() {
    return useMutation({
        mutationFn: (email) => requestOtp(email),
    });
}
export function useVerifyOtp() {
    const { setAuth } = useAuthStore();
    const { setWorkspaceList, setActiveWorkspace } = useWorkspaceStore();
    const navigate = useNavigate();
    return useMutation({
        mutationFn: ({ email, otp }) => verifyOtp(email, otp),
        onSuccess: async (data) => {
            setAuth({
                token: data.token,
                refreshToken: data.refreshToken,
                paramId: data.user.paramId,
                userId: data.user.userId,
                email: data.user.email,
                name: data.user.name,
            });
            try {
                const res = await listWorkspaces();
                const workspaces = res.workspaces;
                setWorkspaceList(workspaces);
                if (workspaces.length === 1) {
                    setActiveWorkspace(workspaces[0].subdomain);
                    navigate(`/${workspaces[0].subdomain}`);
                }
                else {
                    navigate('/post-login');
                }
            }
            catch {
                navigate('/post-login');
            }
        },
    });
}
export function useSsoLogin() {
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();
    return useMutation({
        mutationFn: ({ provider, code }) => ssoLogin(provider, code),
        onSuccess: (data) => {
            setAuth({
                token: data.token,
                refreshToken: data.refreshToken,
                paramId: data.user.paramId,
                userId: data.user.userId,
                email: data.user.email,
                name: data.user.name,
            });
            navigate('/post-login');
        },
    });
}
