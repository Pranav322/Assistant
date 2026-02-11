# COST MODEL & PROJECTIONS
**Version:** 1.0.1
**Aligned with:** schema.sql v2.2, security.md v3.0, retrieval.md v1.0, deployment.md v1.0.1
**Last Updated:** 2026-02-12

---

## **📊 EXECUTIVE SUMMARY**

The RAG chatbot platform is designed for low operational cost with clear scaling economics. At 1,000 active users, monthly costs are projected at $75-$500, reaching profitability with 50+ paid users.

**Note:** Pricing tiers and plan limits are conceptual only and not implemented in schema.sql or api_spec.md yet.

### **Key Financial Metrics:**
- **Monthly Burn Rate (100 users):** $25-$75
- **Break-even Point:** 3 Pro users or 20 Business users
- **Gross Margin Target:** 60% at scale
- **Customer Acquisition Cost Target:** < $100
- **Lifetime Value Target:** > $500

---

## **💰 FIXED MONTHLY COSTS**

### **Infrastructure (Always On):**
| Service | Provider | Tier | Monthly Cost | Purpose |
|---------|----------|------|--------------|---------|
| **VPS (2x)** | DigitalOcean | 2GB RAM, 1vCPU | $24 ($12 each) | API + Workers |
| **PostgreSQL** | Neon.tech | Hobby | $0 (Free tier) | Database with pgvector |
| **Object Storage** | Cloudflare R2 | 10GB | $0 (Free tier) | File storage |
| **Redis** | Upstash | Free | $0 | Cache & queues |
| **CDN/DNS** | Cloudflare | Free | $0 | Security & caching |
| **Monitoring** | Grafana Cloud | Free | $0 | Metrics & alerts |
| **Error Tracking** | Sentry | Free | $0 | Error monitoring |
| **Domain** | Cloudflare | Basic | $10/year ($0.83/mo) | chatbot.com |
| **Email** | Mailgun | Free | $0 | Notifications |
| **Total Fixed** | | | **$24.83** | |

*Note: Free tiers are sufficient for up to 10,000 active users. Beyond that, costs scale linearly.*

---

## **⚡ VARIABLE COSTS (PER USAGE)**

### **AI/ML API Costs (Biggest Variable):**
| Resource | Provider | Cost per 1M | Notes |
|----------|----------|-------------|-------|
| **Embeddings** | OpenAI | $0.13 | text-embedding-3-small @ $0.13/1M tokens |
| **LLM Completion** | OpenAI GPT-4o-mini | $0.15/$0.60 | Input/Output @ $0.15/$0.60 per 1M tokens |
| **LLM Completion** | Anthropic Claude 3 Haiku | $0.25/$1.25 | Input/Output |
| **LLM Completion** | OpenAI GPT-4 Turbo | $10/$30 | Input/Output (premium tier) |
| **Reranking** | Cohere Rerank | $1.00 | 1M tokens through reranker |
| **Reranking** | Local (BGE) | $0.02 | Self-hosted, compute cost only |

### **Infrastructure Variable Costs:**
| Resource | Cost per 1M | Calculation |
|----------|-------------|-------------|
| **Vector Search** | $0.01 | PostgreSQL compute @ $0.00001 per query |
| **Bandwidth** | $0.50 | S3 egress @ $0.50/GB, ~1GB per 1M requests |
| **PDF Processing** | $0.10 | CPU time for parsing @ $0.0001 per page |
| **Database Operations** | $0.05 | Read/write operations |
| **Redis Operations** | $0.02 | Cache hits/misses |

### **Support & Operational Costs:**
| Activity | Time per 100 users | Equivalent Cost |
|----------|-------------------|-----------------|
| **Customer Support** | 4 hours/week | $80/week ($320/month) |
| **System Maintenance** | 2 hours/week | $40/week ($160/month) |
| **Feature Development** | 20 hours/week | $400/week ($1,600/month) |
| **Total Operational** | 26 hours/week | **$2,080/month** |

*Note: As solo founder, these are opportunity costs, not cash outlays initially.*

---

## **📈 USER-BASED COST PROJECTIONS**

### **Assumptions per User:**
- **Average Queries:** 100/month (active user)
- **Average Tokens/Query:** 1,000 (input + output)
- **Average Files:** 5 PDFs, 100 pages total
- **Storage:** 100MB/user

### **Cost Projections:**
| Users | Requests/Month | Storage (GB) | Estimated Cost | Notes |
|-------|---------------|--------------|----------------|-------|
| **100** | 10,000 | 10 | $25-$75 | Hobby project, mostly free tiers |
| **1,000** | 100,000 | 100 | $75-$500 | Early startup, some paid tiers |
| **10,000** | 1,000,000 | 1,000 | $500-$5,000 | Growing business |
| **100,000** | 10,000,000 | 10,000 | $5,000-$50,000 | Scaling phase |

### **Detailed Breakdown (1,000 Users):**
```yaml
Fixed Infrastructure: $24.83
Variable Costs:
  - Embeddings: 100M tokens @ $0.13/1M = $13.00
  - LLM (GPT-4o-mini): 50M in, 50M out = $7.50 + $30.00 = $37.50
  - Bandwidth: 100GB @ $0.50/GB = $50.00
  - Processing: 100k pages @ $0.001/page = $100.00
  - Database: 100k queries @ $0.0001 = $10.00
Total Variable: $210.50
Total Monthly: $235.33
```

---

## **🏷️ PRICING STRATEGY**

### **Free Tier (Acquisition):**
```json
{
  "name": "Free",
  "price": "$0/month",
  "limits": {
    "projects": 1,
    "sources": 10,
    "chunks": 10_000,
    "queries_per_month": 1_000,
    "tokens_per_month": 100_000,
    "file_storage": "100MB",
    "support": "Community forum",
    "features": [
      "Basic chatbot",
      "PDF/URL ingestion",
      "Standard embeddings",
      "Community support"
    ]
  },
  "target": "Hobbyists, students, small projects",
  "conversion_goal": "5% to paid plans"
}
```

### **Pro Tier (Revenue Workhorse):**
```json
{
  "name": "Pro",
  "price": "$49/month",
  "limits": {
    "projects": 10,
    "sources": 100,
    "chunks": 100_000,
    "queries_per_month": 100_000,
    "tokens_per_month": 10_000_000,
    "file_storage": "10GB",
    "support": "Email (24h response)",
    "features": [
      "Everything in Free",
      "Custom domains",
      "Advanced analytics",
      "API access",
      "Priority embedding queue"
    ]
  },
  "cost_to_serve": "$15-$25/month",
  "margin": "50-70%",
  "target": "Startups, small businesses, agencies"
}
```

### **Business Tier (High Value):**
```json
{
  "name": "Business",
  "price": "$299/month",
  "limits": {
    "projects": 100,
    "sources": 1_000,
    "chunks": 1_000_000,
    "queries_per_month": 1_000_000,
    "tokens_per_month": "Unlimited*",
    "file_storage": "100GB",
    "support": "Priority (4h response)",
    "features": [
      "Everything in Pro",
      "SSO/SAML",
      "Custom LLM models",
      "Advanced security",
      "Dedicated support",
      "SLA (99.9% uptime)",
      "Custom integrations"
    ]
  },
  "cost_to_serve": "$75-$150/month",
  "margin": "50-75%",
  "target": "Enterprises, large teams, high-volume"
}
```

### **Enterprise Tier (Custom):**
```json
{
  "name": "Enterprise",
  "price": "$1,500+/month",
  "custom_pricing": true,
  "features": [
    "Everything in Business",
    "On-premise deployment",
    "Custom development",
    "Dedicated infrastructure",
    "Security audits",
    "Training & onboarding",
    "Custom contracts"
  ],
  "target": "Fortune 500, regulated industries"
}
```

### **Add-ons (Incremental Revenue):**
| Add-on | Price | Description |
|--------|-------|-------------|
| **Additional Projects** | $10/month each | Extra projects beyond plan limit |
| **Additional Queries** | $10/100k queries | Pay-as-you-go overages |
| **Premium Support** | $99/month | 1h response time, dedicated contact |
| **White Label** | $199/month | Remove branding, custom CSS |
| **API Only** | $99/month | Higher rate limits, no widget |

---

## **📊 FINANCIAL PROJECTIONS**

### **Year 1 Projections (Conservative):**
| Month | Users (Total) | Paid Users | MRR | Costs | Profit/Loss |
|-------|---------------|------------|-----|-------|-------------|
| 1 | 100 | 5 | $245 | $75 | +$170 |
| 3 | 500 | 25 | $1,225 | $150 | +$1,075 |
| 6 | 2,000 | 100 | $4,900 | $500 | +$4,400 |
| 12 | 10,000 | 500 | $24,500 | $2,500 | +$22,000 |

*Assumptions: 5% conversion to paid, 80% Pro ($49), 20% Business ($299), 2% monthly churn.*

### **Year 2 Projections (Growth):**
| Month | Users (Total) | Paid Users | MRR | Costs | Profit |
|-------|---------------|------------|-----|-------|--------|
| 18 | 50,000 | 2,500 | $122,500 | $12,500 | +$110,000 |
| 24 | 200,000 | 10,000 | $490,000 | $50,000 | +$440,000 |

*Assumptions: Word-of-mouth growth, 10% month-over-month, improved conversion to 10%.*

### **Break-even Analysis:**
```yaml
Fixed Monthly Costs: $24.83
Average Revenue Per User (ARPU): $49 (Pro plan)
Contribution Margin: 70% ($34.30 after variable costs)
Break-even Users: 1 user (covers fixed costs)
Profitability Threshold: 3 users (> $100/month profit)
```

---

## **💡 COST OPTIMIZATION STRATEGIES**

### **Technical Optimizations:**

**1. Caching Strategy (70% cost reduction):**
```python
# Embedding cache hit rate targets
TARGET_HIT_RATES = {
    "embeddings": 0.70,  # 70% of queries hit cache
    "responses": 0.30,   # 30% of similar questions cached
    "chunks": 0.50       # 50% of chunks reused across projects
}

# Implementation
REDIS_CONFIG = {
    "embedding_cache_ttl": 30 * 86400,  # 30 days
    "response_cache_ttl": 7 * 86400,    # 7 days
    "max_cache_size_mb": 1024           # 1GB max
}
```

**2. Token Optimization:**
```yaml
Strategies:
  - Chunk size optimization: 384 tokens optimal
  - Context window management: Trim to necessary context
  - Response length limiting: Default 500 tokens
  - Model selection: GPT-4o-mini for 95% of queries
  
Targets:
  - Tokens per query: < 1,000
  - Embeddings cached: > 70%
  - Chunk reuse: > 50%
```

**3. Batch Processing:**
```python
# Instead of per-request embedding
embeddings = await embed_texts([chunk1, chunk2, chunk3])  # 1 API call

# Instead of per-file processing
process_batch([file1, file2, file3])  # Better resource utilization
```

### **Business Optimizations:**

**1. Tiered Service Levels:**
- **Free:** Community support, slower processing
- **Pro:** Email support, standard processing
- **Business:** Priority support, faster processing
- **Enterprise:** Dedicated resources

**2. Usage-Based Billing:**
*This assumes a future plan model (no plan fields in schema.sql yet).*

```python
def calculate_usage_cost(project):
    base_cost = PLAN_PRICES[project.plan]
    overage_cost = 0
    
    if project.queries > plan_limits[project.plan]:
        overage = project.queries - plan_limits[project.plan]
        overage_cost = overage * 0.0001  # $0.10 per 1,000 queries
    
    return base_cost + overage_cost
```

---

## **⚠️ HIDDEN & UNEXPECTED COSTS**

### **Often Overlooked:**
- **Payment Processing:** 2.9% + $0.30 per transaction (Stripe)
- **Compliance:** GDPR/CCPA legal consultation ($5,000 one-time)
- **Security:** Annual penetration test ($3,000-$10,000)
- **Insurance:** Professional liability insurance ($1,500/year)
- **Accounting:** Bookkeeping, taxes ($200/month)
- **Marketing:** Content, ads, conferences ($500-$5,000/month)

### **Scaling Costs:**
| Stage | Unexpected Costs | Mitigation |
|-------|------------------|------------|
| Early | Support time (2-4h/week per 100 users) | Better documentation, FAQ |
| Growth | Infrastructure complexity | Managed services, automation |
| Scale | Compliance, security, legal | Budget 20% for "unknown unknowns" |
| Enterprise | Custom demands, SLAs | Clear contracts, scope definition |

### **Opportunity Costs:**
- **Development Time:** 40 hours/week @ $100/hour = $16,000/month
- **Marketing Time:** 10 hours/week @ $50/hour = $2,000/month
- **Support Time:** 20 hours/week @ $30/hour = $2,400/month
- **Total opportunity cost:** ~$20,400/month (for solo founder with market-rate skills)

---

## **🎯 PRICING PSYCHOLOGY**

### **Price Anchoring:**
```text
Business: $299/month
Pro: $49/month  ← Looks like great value
Free: $0/month
```

### **Feature Grading:**
```yaml
Free:
  - ✓ Basic chatbot
  - ✓ 10 sources
  - ✓ Community support
  - ✗ No API access
  
Pro:
  - ✓ Everything in Free
  - ✓ 100 sources
  - ✓ API access
  - ✓ Email support
  - ✗ No SSO
  
Business:
  - ✓ Everything in Pro
  - ✓ 1,000 sources
  - ✓ SSO/SAML
  - ✓ Priority support
  - ✓ SLA guarantee
```

### **Annual Discount:**
- **Monthly:** $49/month
- **Annual:** $490/year (16% discount = $40.83/month)
- **Effect:** Improves cash flow, reduces churn

---

## **📋 COST MONITORING DASHBOARD**

### **Key Metrics to Track Daily:**
```sql
-- Daily cost report
SELECT
    DATE(m.created_at) as day,
    COUNT(*) as messages,
    SUM(COALESCE(m.token_count, 0)) as total_tokens,
    COUNT(DISTINCT c.project_id) as active_projects
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
WHERE m.created_at >= NOW() - INTERVAL '1 day'
GROUP BY DATE(m.created_at);
```

### **Cost Alerts:**
```yaml
alerts:
  - metric: daily_cost_per_user
    threshold: > $0.50
    action: Review usage patterns
    
  - metric: embedding_cache_hit_rate
    threshold: < 60%
    action: Optimize caching strategy
    
  - metric: token_cost_per_query
    threshold: > $0.01
    action: Review chunking/context strategies
    
  - metric: support_costs_per_user
    threshold: > $5/month
    action: Improve documentation/onboarding
```

### **Monthly Cost Report Template:**
```markdown
# Monthly Cost Report - March 2026

## Summary
- Total Revenue: $4,900
- Total Costs: $500
- Net Profit: $4,400 (90% margin)

## Cost Breakdown
1. **Infrastructure:** $24.83 (5%)
2. **OpenAI API:** $210.50 (42%)
3. **Bandwidth:** $50.00 (10%)
4. **Support (opportunity):** $320.00 (64%)

## Per-User Metrics
- Cost per Free User: $0.05/month
- Cost per Pro User: $15.00/month
- Revenue per Pro User: $49.00/month
- LTV/CAC Ratio: 8:1 (target: 3:1)

## Recommendations
1. Implement response caching (save ~$100/month)
2. Add usage alerts for high-volume users
3. Consider tiered embeddings (free=small, paid=large)
```

---

## **🔄 COST REVIEW PROCESS**

### **Monthly Review:**
- Compare actual vs projected costs
- Identify cost outliers (projects/users)
- Review optimization opportunities
- Adjust pricing if necessary
- Update financial projections

### **Quarterly Review:**
- Benchmark against competitors
- Review market pricing trends
- Evaluate feature/price alignment
- Plan infrastructure upgrades
- Budget for next quarter

### **Annual Review:**
- Comprehensive financial audit
- Pricing strategy overhaul
- Infrastructure cost optimization
- Plan for scaling (12-24 months)
- Set financial goals for next year

---

## **🚀 GROWTH FUNDING REQUIREMENTS**

### **Bootstrapped Path:**
```yaml
Phase 1 (Months 1-6): 
  - Investment: $5,000 savings
  - Goal: 100 users, $500 MRR
  - Focus: Product-market fit
  
Phase 2 (Months 7-12):
  - Investment: Revenue reinvestment
  - Goal: 1,000 users, $5,000 MRR
  - Focus: Automation, scaling
  
Phase 3 (Year 2):
  - Investment: $50,000 revenue
  - Goal: 10,000 users, $50,000 MRR
  - Focus: Team hire, marketing
```

### **Venture Funding Path:**
```yaml
Pre-seed ($250k):
  - Valuation: $2M
  - Use: 12 months runway
  - Goal: 1,000 users, $5,000 MRR
  
Seed ($1M):
  - Valuation: $8M
  - Use: Hire team (3-5), marketing
  - Goal: 10,000 users, $50,000 MRR
  
Series A ($5M):
  - Valuation: $30M
  - Use: Scale team (20), enterprise sales
  - Goal: 100,000 users, $500,000 MRR
```

---

## **✅ COST MANAGEMENT CHECKLIST**

### **Monthly Tasks:**
- [ ] Review AWS/Cloud bills
- [ ] Analyze OpenAI API usage
- [ ] Check cache hit rates
- [ ] Review support time/costs
- [ ] Update financial projections
- [ ] Send invoices to customers

### **Quarterly Tasks:**
- [ ] Benchmark infrastructure costs
- [ ] Review pricing competitiveness
- [ ] Optimize database/indexes
- [ ] Evaluate new cost-saving technologies
- [ ] Plan capacity upgrades

### **Annual Tasks:**
- [ ] Renegotiate provider contracts
- [ ] Complete financial audit
- [ ] Set annual budget
- [ ] Review insurance coverage
- [ ] Plan major infrastructure changes

---

## **📞 FINANCIAL CONTACTS**

### **Service Providers:**
- **AWS/Cloud:** billing@chatbot.com
- **OpenAI:** api-support@openai.com
- **Payment Processor:** stripe@chatbot.com
- **Accounting:** accounting@chatbot.com

### **Internal Contacts:**
- **Financial Decisions:** CEO/Founder
- **Billing Issues:** Support team
- **Cost Optimization:** Engineering lead
- **Budget Approval:** Founder + Advisor
