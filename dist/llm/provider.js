export class BudgetExceededError extends Error {
    limit;
    constructor(limit) {
        super(`Model call budget of ${limit} exhausted`);
        this.limit = limit;
        this.name = "BudgetExceededError";
    }
}
export class RefusalError extends Error {
    role;
    category;
    constructor(role, category) {
        super(`Model declined the ${role} call${category ? ` (${category})` : ""}`);
        this.role = role;
        this.category = category;
        this.name = "RefusalError";
    }
}
/**
 * Wraps a provider with a hard call ceiling and usage accounting.
 * The ceiling is checked before each call, so a run can never exceed it.
 */
export class MeteredProvider {
    inner;
    maxCalls;
    calls = 0;
    inputTokens = 0;
    outputTokens = 0;
    costUsd = 0;
    constructor(inner, maxCalls) {
        this.inner = inner;
        this.maxCalls = maxCalls;
    }
    get name() {
        return this.inner.name;
    }
    get remaining() {
        return Math.max(0, this.maxCalls - this.calls);
    }
    async structured(req) {
        if (this.calls >= this.maxCalls)
            throw new BudgetExceededError(this.maxCalls);
        this.calls++;
        const res = await this.inner.structured(req);
        this.inputTokens += res.usage.inputTokens;
        this.outputTokens += res.usage.outputTokens;
        this.costUsd += this.inner.cost(res.usage);
        return res;
    }
    cost(usage) {
        return this.inner.cost(usage);
    }
}
//# sourceMappingURL=provider.js.map