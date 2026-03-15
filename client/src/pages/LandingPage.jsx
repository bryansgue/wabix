import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Bot, MessageSquare, Zap, Shield, Users, BarChart3,
    ChevronRight, Star, Check, ArrowRight, Sparkles,
    Brain, Globe, Clock, Headphones, Menu, X
} from 'lucide-react';

const NAV_LINKS = [
    { label: 'Funciones', href: '#features' },
    { label: 'Planes', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
];

const FEATURES = [
    {
        icon: Brain,
        title: 'IA Conversacional',
        description: 'GPT-4o responde a tus clientes con contexto real de tu negocio, 24/7.',
        color: 'from-purple-500 to-indigo-600',
    },
    {
        icon: MessageSquare,
        title: 'WhatsApp Directo',
        description: 'Conecta tu número de WhatsApp real. Sin APIs intermedias ni números ficticios.',
        color: 'from-green-500 to-emerald-600',
    },
    {
        icon: Users,
        title: 'CRM Integrado',
        description: 'Gestiona clientes, estados, etiquetas y seguimiento desde un solo panel.',
        color: 'from-blue-500 to-cyan-600',
    },
    {
        icon: Zap,
        title: 'Difusiones Masivas',
        description: 'Envía campañas segmentadas a todos tus contactos con un clic.',
        color: 'from-yellow-500 to-orange-600',
    },
    {
        icon: Shield,
        title: 'Multi-Usuario',
        description: 'Cada usuario tiene su propio espacio, bot y configuración independiente.',
        color: 'from-red-500 to-pink-600',
    },
    {
        icon: BarChart3,
        title: 'Analíticas',
        description: 'Dashboard con métricas de conversaciones, clientes y rendimiento del bot.',
        color: 'from-teal-500 to-cyan-600',
    },
];

const PLANS = [
    {
        id: 'prueba',
        name: 'Trial',
        price: 'Gratis',
        period: '3 días',
        description: 'Prueba todo el sistema sin compromiso.',
        credits: '50 créditos',
        features: [
            'Bot IA conectado a WhatsApp',
            '50 mensajes de IA',
            'CRM básico',
            'Soporte por email',
        ],
        cta: 'Empezar Gratis',
        popular: false,
        gradient: 'from-slate-600 to-slate-700',
    },
    {
        id: 'starter',
        name: 'Esencial',
        price: '$12',
        period: '/mes',
        description: 'Para emprendedores y pequeños negocios.',
        credits: '800 créditos/mes',
        features: [
            'Bot IA conectado a WhatsApp',
            '800 mensajes de IA al mes',
            'CRM completo con estados y tags',
            'Difusiones masivas',
            'Exportación de contactos',
            'Soporte prioritario',
        ],
        cta: 'Comenzar Ahora',
        popular: false,
        gradient: 'from-emerald-500 to-teal-600',
    },
    {
        id: 'infinito',
        name: 'Infinito',
        price: '$17',
        period: '/mes',
        description: 'Mensajes ilimitados con tu propia API Key.',
        credits: 'Ilimitado (BYOK)',
        features: [
            'Todo en Esencial',
            'Mensajes ilimitados',
            'Usa tu propia API Key de OpenAI',
            'Sin límite de créditos',
            'Modelos GPT-4o / GPT-4-turbo',
            'Soporte prioritario',
        ],
        cta: 'Elegir Infinito',
        popular: true,
        gradient: 'from-purple-500 to-indigo-600',
    },
    {
        id: 'business',
        name: 'Business',
        price: '$25',
        period: '/mes',
        description: 'Para negocios con alto volumen de mensajes.',
        credits: '2,500 créditos/mes',
        features: [
            'Todo en Infinito',
            '2,500 mensajes de IA al mes',
            'API Key de plataforma incluida',
            'Soporte 1-on-1',
            'Onboarding personalizado',
            'Prioridad en nuevas funciones',
        ],
        cta: 'Contactar Ventas',
        popular: false,
        gradient: 'from-blue-500 to-cyan-600',
    },
];

const FAQS = [
    {
        q: '¿Cómo funciona la conexión a WhatsApp?',
        a: 'Conectas tu número escaneando un QR desde nuestro panel. El bot responde automáticamente usando tu número real de WhatsApp.',
    },
    {
        q: '¿Qué es un crédito?',
        a: 'Cada respuesta generada por la IA consume un crédito. Por ejemplo, el plan Esencial incluye 800 respuestas de IA por mes.',
    },
    {
        q: '¿Puedo usar mi propia API Key de OpenAI?',
        a: 'Sí, con el plan Infinito puedes conectar tu propia API Key y tener mensajes ilimitados pagando directamente a OpenAI.',
    },
    {
        q: '¿Mis datos están seguros?',
        a: 'Sí. Cada usuario tiene su propio espacio aislado. Los datos están encriptados y nunca se comparten entre usuarios.',
    },
    {
        q: '¿Puedo cancelar en cualquier momento?',
        a: 'Sí, puedes cancelar o cambiar de plan cuando quieras. No hay contratos ni permanencia.',
    },
    {
        q: '¿Funciona con grupos de WhatsApp?',
        a: 'El bot está optimizado para conversaciones individuales (1 a 1). No responde en grupos para evitar spam.',
    },
];

export const LandingPage = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
            {/* ═══════════════ NAVBAR ═══════════════ */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3">
                            <div className="bg-gradient-to-tr from-emerald-500 to-cyan-500 p-2 rounded-xl">
                                <Bot size={24} className="text-white" />
                            </div>
                            <span className="text-xl font-black tracking-tight">
                                Huao<span className="text-emerald-400">.cloud</span>
                            </span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-8">
                            {NAV_LINKS.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className="text-sm text-slate-400 hover:text-white transition-colors font-medium"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>

                        {/* CTA Buttons */}
                        <div className="hidden md:flex items-center gap-3">
                            <Link
                                to="/login"
                                className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-4 py-2"
                            >
                                Iniciar Sesión
                            </Link>
                            <Link
                                to="/register"
                                className="text-sm font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
                            >
                                Empezar Gratis
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden text-slate-400 hover:text-white"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-[#0f172a] border-t border-white/5 animate-slideDown">
                        <div className="px-4 py-4 space-y-3">
                            {NAV_LINKS.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className="block text-sm text-slate-300 hover:text-white py-2"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {link.label}
                                </a>
                            ))}
                            <div className="pt-3 border-t border-white/10 space-y-2">
                                <Link
                                    to="/login"
                                    className="block text-center text-sm font-semibold text-slate-300 hover:text-white py-2"
                                >
                                    Iniciar Sesión
                                </Link>
                                <Link
                                    to="/register"
                                    className="block text-center text-sm font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl"
                                >
                                    Empezar Gratis
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* ═══════════════ HERO ═══════════════ */}
            <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32">
                {/* Background Effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold mb-8 animate-fadeIn">
                            <Sparkles size={14} />
                            POTENCIADO POR GPT-4o
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
                            Tu asistente de ventas en{' '}
                            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                WhatsApp
                            </span>
                            <br />
                            con IA
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                            Conecta tu WhatsApp y deja que la inteligencia artificial atienda, venda y gestione
                            a tus clientes automáticamente. 24/7, sin pausas.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                            <Link
                                to="/register"
                                className="group flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg px-8 py-4 rounded-2xl hover:shadow-2xl hover:shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Empezar Gratis
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <a
                                href="#features"
                                className="flex items-center gap-2 text-slate-400 hover:text-white font-semibold text-lg px-8 py-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all"
                            >
                                Ver Funciones
                                <ChevronRight size={20} />
                            </a>
                        </div>

                        {/* Social Proof */}
                        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    {[...Array(4)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 border-2 border-[#020617] flex items-center justify-center text-xs font-bold text-white"
                                        >
                                            {['B', 'M', 'L', 'J'][i]}
                                        </div>
                                    ))}
                                </div>
                                <span>+100 negocios activos</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={16} className="text-yellow-500 fill-yellow-500" />
                                ))}
                                <span className="ml-1">4.9/5</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Globe size={16} />
                                <span>Funciona en todo LATAM</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ FEATURES ═══════════════ */}
            <section id="features" className="py-20 sm:py-32 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
                            Todo lo que necesitas para{' '}
                            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                vender más
                            </span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            Un ecosistema completo para automatizar tu atención al cliente por WhatsApp.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={i}
                                    className="group bg-[#0f172a] border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div
                                        className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-5`}
                                    >
                                        <Icon size={24} className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══════════════ HOW IT WORKS ═══════════════ */}
            <section className="py-20 sm:py-32 bg-[#0f172a]/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
                            Listo en{' '}
                            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                                3 minutos
                            </span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            Sin código, sin complicaciones, sin servidores. Solo configura y listo.
                        </p>
                    </div>

                    {/* Steps Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
                        {[
                            {
                                step: '01',
                                icon: Globe,
                                title: 'Crea tu cuenta',
                                desc: 'Regístrate gratis y accede a tu panel de control personalizado.',
                                color: 'from-emerald-500 to-teal-500',
                            },
                            {
                                step: '02',
                                icon: Headphones,
                                title: 'Conecta WhatsApp',
                                desc: 'Escanea un código QR desde tu panel y vincula tu número de WhatsApp real en segundos.',
                                color: 'from-blue-500 to-cyan-500',
                            },
                            {
                                step: '03',
                                icon: Brain,
                                title: 'Enséñale a tu bot',
                                desc: 'Define cómo debe responder y dale el conocimiento de tu negocio. ¡Es como entrenar a tu mejor vendedor!',
                                color: 'from-purple-500 to-pink-500',
                            },
                            {
                                step: '04',
                                icon: Sparkles,
                                title: 'La IA trabaja por ti',
                                desc: 'Relájate. La IA atiende, vende y gestiona a tus clientes 24/7 sin descanso.',
                                color: 'from-yellow-500 to-orange-500',
                            },
                        ].map((item, i) => {
                            const Icon = item.icon;
                            return (
                                <div key={i} className="relative">
                                    {/* Connector line (hidden on mobile) */}
                                    {i < 3 && (
                                        <div className="hidden lg:block absolute top-12 left-[calc(50%+40px)] w-[calc(100%-40px)] h-[2px] bg-gradient-to-r from-white/10 to-transparent"></div>
                                    )}
                                    <div className="text-center">
                                        <div className="relative inline-block mb-6">
                                            <div className="text-7xl font-black text-white/[0.03] absolute -top-6 -left-4 select-none">
                                                {item.step}
                                            </div>
                                            <div className={`relative bg-gradient-to-br ${item.color} p-4 rounded-2xl shadow-lg`}>
                                                <Icon size={28} className="text-white" />
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                                        <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Detailed Explanation: Prompt + Context */}
                    <div className="max-w-5xl mx-auto">
                        <div className="bg-[#0f172a] border border-white/5 rounded-3xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-purple-500/10 via-emerald-500/10 to-blue-500/10 border-b border-white/5 px-8 py-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Brain size={24} className="text-purple-400" />
                                    <h3 className="text-2xl font-black text-white">¿Cómo entrenas a tu bot?</h3>
                                </div>
                                <p className="text-slate-400">
                                    Solo necesitas hacer dos cosas: decirle <strong className="text-white">quién es</strong> y <strong className="text-white">qué sabe</strong>.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
                                {/* Prompt Section */}
                                <div className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-purple-500/20 p-2.5 rounded-xl border border-purple-500/20">
                                            <MessageSquare size={20} className="text-purple-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-lg">1. La Personalidad</h4>
                                            <p className="text-xs text-slate-500">System Prompt</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-5">
                                        Define <strong className="text-slate-200">cómo quieres que responda</strong> tu bot. Dale un nombre, un tono, y dile las reglas de tu negocio.
                                    </p>
                                    <div className="bg-black/30 rounded-xl p-4 border border-white/5 font-mono text-xs leading-relaxed">
                                        <p className="text-purple-400 mb-2">// Ejemplo de personalidad:</p>
                                        <p className="text-slate-300">
                                            "Eres <span className="text-emerald-400">Ana</span>, la asistente virtual de <span className="text-emerald-400">MiTienda</span>. 
                                            Eres amable, profesional y siempre ofreces ayuda. 
                                            Responde en español, usa emojis ocasionalmente. 
                                            Si no sabes algo, di que un agente humano contactará al cliente."
                                        </p>
                                    </div>
                                </div>

                                {/* Context Section */}
                                <div className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/20">
                                            <Clock size={20} className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-lg">2. El Conocimiento</h4>
                                            <p className="text-xs text-slate-500">Contexto del negocio</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-5">
                                        Sube un archivo o escribe toda la <strong className="text-slate-200">información de tu negocio</strong>: productos, precios, horarios, políticas, ubicación, etc.
                                    </p>
                                    <div className="bg-black/30 rounded-xl p-4 border border-white/5 font-mono text-xs leading-relaxed">
                                        <p className="text-emerald-400 mb-2">// Ejemplo de contexto:</p>
                                        <p className="text-slate-300">
                                            "📍 Ubicación: Av. Principal 123, Quito<br/>
                                            🕐 Horario: Lunes a Sábado 9am - 7pm<br/>
                                            📦 Productos: Camisetas ($15), Gorras ($8), Sudaderas ($25)<br/>
                                            🚚 Envío gratis en compras +$50<br/>
                                            💳 Aceptamos: Transferencia, tarjeta, efectivo"
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Result Footer */}
                            <div className="bg-emerald-500/5 border-t border-white/5 px-8 py-6">
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="bg-emerald-500 p-2 rounded-full">
                                            <Check size={16} className="text-white" />
                                        </div>
                                        <p className="text-slate-300 text-sm">
                                            <strong className="text-white">¡Listo!</strong> Con eso tu bot ya sabe quién es y qué responder. 
                                            Cada cliente que te escriba recibirá respuestas inteligentes, personalizadas y basadas en <strong className="text-emerald-400">tu información real</strong>.
                                        </p>
                                    </div>
                                    <Link
                                        to="/register"
                                        className="shrink-0 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
                                    >
                                        Probar Ahora →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ PRICING ═══════════════ */}
            <section id="pricing" className="py-20 sm:py-32 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px]"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
                            Planes{' '}
                            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                simples y transparentes
                            </span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            Empieza gratis, escala cuando lo necesites. Sin letras pequeñas.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {PLANS.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative bg-[#0f172a] border rounded-2xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                                    plan.popular
                                        ? 'border-purple-500/50 shadow-lg shadow-purple-500/10'
                                        : 'border-white/5 hover:border-white/10'
                                }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                                        MÁS POPULAR
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                                    <p className="text-slate-500 text-sm">{plan.description}</p>
                                </div>

                                <div className="mb-6">
                                    <span className="text-4xl font-black">{plan.price}</span>
                                    <span className="text-slate-500 text-sm">{plan.period}</span>
                                </div>

                                <div className="mb-2 text-sm font-semibold text-emerald-400">
                                    {plan.credits}
                                </div>

                                <ul className="space-y-3 mb-8 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                            <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    to="/register"
                                    className={`text-center font-bold py-3 px-6 rounded-xl transition-all text-sm ${
                                        plan.popular
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25'
                                            : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                                    }`}
                                >
                                    {plan.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ FAQ ═══════════════ */}
            <section id="faq" className="py-20 sm:py-32 bg-[#0f172a]/50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
                            Preguntas Frecuentes
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {FAQS.map((faq, i) => (
                            <div
                                key={i}
                                className="bg-[#0f172a] border border-white/5 rounded-2xl overflow-hidden"
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                                >
                                    <span className="font-semibold pr-4">{faq.q}</span>
                                    <ChevronRight
                                        size={20}
                                        className={`text-slate-400 shrink-0 transition-transform ${
                                            openFaq === i ? 'rotate-90' : ''
                                        }`}
                                    />
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-6 text-slate-400 leading-relaxed animate-slideDown">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ CTA FINAL ═══════════════ */}
            <section className="py-20 sm:py-32 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent"></div>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-6">
                        ¿Listo para automatizar tu{' '}
                        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            WhatsApp
                        </span>
                        ?
                    </h2>
                    <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
                        Únete a cientos de negocios en Latinoamérica que ya usan IA para atender a sus clientes.
                    </p>
                    <Link
                        to="/register"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg px-10 py-4 rounded-2xl hover:shadow-2xl hover:shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Crear Cuenta Gratis
                        <ArrowRight size={20} />
                    </Link>
                </div>
            </section>

            {/* ═══════════════ FOOTER ═══════════════ */}
            <footer className="border-t border-white/5 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-tr from-emerald-500 to-cyan-500 p-2 rounded-xl">
                                <Bot size={20} className="text-white" />
                            </div>
                            <span className="text-lg font-bold">
                                Huao<span className="text-emerald-400">.cloud</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-slate-500">
                            <a href="#features" className="hover:text-white transition-colors">Funciones</a>
                            <a href="#pricing" className="hover:text-white transition-colors">Planes</a>
                            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
                        </div>
                        <p className="text-sm text-slate-600">
                            © {new Date().getFullYear()} Huao.cloud — Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
