import { FastifyInstance } from 'fastify';
import { handleOtpRequest, handleOtpVerify } from './otp.handler.js';
import { handleSsoVerify, handleDomainRegister } from './sso.handler.js';
import { handleRefreshToken, handleLogout, handleAddApp } from './session.handler.js';

export async function authRouter(fastify: FastifyInstance): Promise<void> {
  // OTP flows — no auth required
  fastify.post('/auth/otp/request', handleOtpRequest);
  fastify.post('/auth/otp/verify', handleOtpVerify);

  // SSO flow — no auth required
  fastify.post<{ Params: { provider: string } }>(
    '/auth/sso/:provider',
    handleSsoVerify
  );

  // Token refresh — no auth required (refreshToken in body)
  fastify.post('/auth/refresh', handleRefreshToken);

  // Domain/partner registration — no auth required
  fastify.post('/auth/domain/register', handleDomainRegister);

  // Authenticated routes
  fastify.post('/auth/logout', handleLogout);
  fastify.post('/auth/addapp', handleAddApp);
}
