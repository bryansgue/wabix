const PLAN_CATALOG = {
    none: {
        id: 'none',
        label: 'Sin plan',
        description: 'Usuario sin suscripción activa.',
        quotaType: 'restricted',
        monthlyLimit: 0,
        allowsPlatformKey: true,
        requiresCustomKey: false,
        upgradeHint: 'Contrata un plan para habilitar el bot.',
        priceUsd: 0,
        billingCycle: null,
        currency: 'USD',
        trialDays: 0,
        visible: false
    },
    prueba: {
        id: 'prueba',
        label: 'Plan Trial 3 días',
        description: 'Incluye 50 créditos para validar el bot en menos de 72h.',
        quotaType: 'credits',
        monthlyLimit: 50,
        allowsPlatformKey: true,
        requiresCustomKey: false,
        upgradeHint: 'Tu prueba terminó. Contrata un plan para continuar.',
        priceUsd: 0,
        billingCycle: 'trial',
        currency: 'USD',
        trialDays: 3,
        visible: true
    },
    starter: {
        id: 'starter',
        label: 'Plan Esencial',
        description: '800 créditos mensuales para pequeños negocios.',
        quotaType: 'credits',
        monthlyLimit: 800,
        allowsPlatformKey: true,
        requiresCustomKey: false,
        upgradeHint: 'Alcanza Infinito ($17) o Business para más mensajes.',
        priceUsd: 12,
        billingCycle: 'monthly',
        currency: 'USD',
        visible: true
    },
    infinito: {
        id: 'infinito',
        label: 'Plan Infinito (BYOK)',
        description: 'Uso ilimitado con tu propia API Key de OpenAI.',
        quotaType: 'custom-key',
        monthlyLimit: null,
        allowsPlatformKey: false,
        requiresCustomKey: true,
        upgradeHint: 'Agrega tu propia OpenAI API Key para uso ilimitado.',
        priceUsd: 17,
        billingCycle: 'monthly',
        currency: 'USD',
        visible: true
    },
    business: {
        id: 'business',
        label: 'Plan Business',
        description: '2,500 créditos al mes + soporte prioritario.',
        quotaType: 'credits',
        monthlyLimit: 2500,
        allowsPlatformKey: true,
        requiresCustomKey: false,
        upgradeHint: 'Contacta a soporte para subir a Enterprise.',
        priceUsd: 25,
        billingCycle: 'monthly',
        currency: 'USD',
        visible: true
    },
    admin: {
        id: 'admin',
        label: 'Administrador',
        description: 'Acceso total sin límites ni facturación.',
        quotaType: 'unlimited',
        monthlyLimit: null,
        allowsPlatformKey: true,
        requiresCustomKey: false,
        upgradeHint: null,
        priceUsd: 0,
        billingCycle: null,
        currency: 'USD',
        visible: false
    },
};

export class PlanLimitError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'PlanLimitError';
        this.code = code;
        this.isPlanLimit = true;
    }
}

export function getPlanPolicy(planType = 'none', role = 'user') {
    if (role === 'admin') {
        return PLAN_CATALOG.admin;
    }
    return PLAN_CATALOG[planType] || PLAN_CATALOG.none;
}

export function getInitialCredits(planType = 'none', role = 'user') {
    const policy = getPlanPolicy(planType, role);
    return typeof policy.monthlyLimit === 'number' ? policy.monthlyLimit : 0;
}

export function isUnlimitedPlan(planType = 'none', role = 'user') {
    const policy = getPlanPolicy(planType, role);
    return policy.quotaType === 'unlimited' || policy.quotaType === 'custom-key';
}

export function describeUpgradeHint(planType = 'none', role = 'user') {
    const policy = getPlanPolicy(planType, role);
    return policy.upgradeHint;
}

export function getDefaultExpirationDate(planType = 'none', role = 'user', baseDate = new Date()) {
    if (role === 'admin') return null;

    const policy = getPlanPolicy(planType, role);
    if (!policy) return null;

    const expiration = new Date(baseDate);

    if (policy.billingCycle === 'trial') {
        const days = typeof policy.trialDays === 'number' ? policy.trialDays : 0;
        if (days <= 0) return expiration;
        expiration.setDate(expiration.getDate() + days);
        return expiration;
    }

    if (policy.billingCycle === 'monthly') {
        expiration.setMonth(expiration.getMonth() + 1);
        return expiration;
    }

    if (policy.billingCycle === 'annual') {
        expiration.setFullYear(expiration.getFullYear() + 1);
        return expiration;
    }

    if (policy.billingCycle === 'lifetime' || policy.billingCycle === null) {
        return null;
    }

    return null;
}

export function listPlanDefinitions({ includeAdmin = false, includeHidden = false } = {}) {
    return Object.values(PLAN_CATALOG)
        .filter(plan => (includeAdmin ? true : plan.id !== 'admin'))
        .filter(plan => (includeHidden ? true : plan.visible !== false))
        .map(plan => ({ ...plan }));
}

export { PLAN_CATALOG };
