import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
export function AuthLayout() {
    return (_jsxs("div", { style: { display: 'flex', minHeight: '100vh', background: 'var(--bg-root)' }, children: [_jsxs("div", { style: {
                    width: '42%',
                    minWidth: 340,
                    background: 'linear-gradient(160deg, #0c1a4e 0%, #1740a0 50%, #2563eb 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '40px 48px',
                    position: 'relative',
                    overflow: 'hidden',
                }, children: [_jsx("div", { style: {
                            position: 'absolute', inset: 0, opacity: 0.04,
                            backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
                            backgroundSize: '32px 32px',
                            pointerEvents: 'none',
                        } }), _jsx("div", { style: {
                            position: 'absolute', top: -80, right: -80, width: 360, height: 360,
                            background: 'radial-gradient(circle, rgba(96,165,250,0.22) 0%, transparent 65%)',
                            pointerEvents: 'none',
                        } }), _jsx("div", { style: {
                            position: 'absolute', bottom: -60, left: -60, width: 280, height: 280,
                            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
                            pointerEvents: 'none',
                        } }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }, children: [_jsx("div", { style: {
                                    width: 38, height: 38,
                                    background: 'rgba(255,255,255,0.15)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255,255,255,0.25)',
                                    borderRadius: 10,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.02em',
                                }, children: "P" }), _jsx("span", { style: { fontWeight: 700, fontSize: 15, color: '#ffffff', letterSpacing: '-0.01em' }, children: "Param Wallet" })] }), _jsxs("div", { style: { marginTop: 'auto', marginBottom: 'auto', position: 'relative', zIndex: 1 }, children: [_jsxs("div", { style: {
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: 99, padding: '4px 12px',
                                    marginBottom: 20,
                                }, children: [_jsx("div", { style: { width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 5px #4ade80' } }), _jsx("span", { style: { fontSize: 11, fontWeight: 600, color: 'rgba(203,213,225,0.9)', letterSpacing: '0.05em', textTransform: 'uppercase' }, children: "v5.0 \u00B7 Enterprise" })] }), _jsxs("h2", { style: {
                                    fontSize: 34, fontWeight: 800, color: '#ffffff',
                                    lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 16,
                                }, children: ["The operating", _jsx("br", {}), "system for your", _jsx("br", {}), "supply chain"] }), _jsx("p", { style: { fontSize: 13, color: 'rgba(203,213,225,0.75)', lineHeight: 1.7, maxWidth: 300 }, children: "Automate document workflows, enforce multi-org RBAC, and maintain a blockchain-backed audit trail." }), _jsx("div", { style: { marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }, children: [
                                    'State Machine-driven document lifecycle',
                                    'Role-based access control per state',
                                    'Immutable on-chain transaction history',
                                    'Multi-org, multi-plant support',
                                ].map((feat) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("div", { style: {
                                                width: 18, height: 18, borderRadius: '50%',
                                                background: 'rgba(255,255,255,0.1)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            }, children: _jsx("svg", { width: "8", height: "8", viewBox: "0 0 8 8", fill: "none", children: _jsx("path", { d: "M1 4L3 6L7 2", stroke: "#93c5fd", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsx("span", { style: { fontSize: 12, color: 'rgba(203,213,225,0.8)', lineHeight: 1.4 }, children: feat })] }, feat))) })] }), _jsx("div", { style: {
                            position: 'relative', zIndex: 1,
                            paddingTop: 20,
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', alignItems: 'center', gap: 8,
                        }, children: _jsx("span", { style: {
                                fontSize: 10, color: 'rgba(148,163,184,0.6)',
                                fontFamily: "'JetBrains Mono', monospace",
                            }, children: "\u00A9 2026 Param Technologies \u00B7 All rights reserved" }) })] }), _jsxs("div", { style: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 32px',
                    background: 'var(--bg-surface)',
                }, children: [_jsx("div", { style: { width: '100%', maxWidth: 380 }, children: _jsx(Outlet, {}) }), _jsx("p", { style: {
                            marginTop: 32, fontSize: 11,
                            color: 'var(--text-quaternary)',
                            textAlign: 'center',
                            fontFamily: "'JetBrains Mono', monospace",
                        }, children: "Secure \u00B7 Encrypted \u00B7 SOC2 Ready" })] })] }));
}
