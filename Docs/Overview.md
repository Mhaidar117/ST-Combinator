# **Product thesis**





Most startup idea tools do one of two things:



1. generate a polished but shallow report, or
2. scrape demand signals and call that validation.





Your product should do something different:



**It should behave like an adversarial investment committee.**



Instead of “here is your market summary,” it should answer:



- Why will this fail?
- Where is the wedge weak?
- What assumption breaks first?
- What would make an investor pass?
- What would make a founder still pursue it anyway?





That is the gap.



---





# **Product name**





Working title: **StressTested**



Tagline: **Pitch your idea. Get attacked before the market does.**



---





# **Core market gap to hit**







## **What existing tools usually do poorly**





They tend to be:



- too polite
- too generic
- too optimistic
- weak on competitive pressure
- weak on distribution realism
- weak on pricing realism
- weak on assumption sensitivity
- weak on contradiction detection across their own output







## **What your product should do better**





It should provide:



- **adversarial feedback**, not consulting fluff
- **structured failure analysis**
- **multi-perspective critique**
- **clear pass / borderline / kill recommendation**
- **evidence-backed reasoning where possible**
- **repeatable scorecards**, so users can compare revisions
- **versioned idea evolution**, so users can improve over time





The real product is not “analysis.”

The real product is **decision pressure**.



---





# **The user experience**







## **Primary user**





Early-stage founders, students, indie hackers, and PMs who want to test whether an idea is robust before building.





## **First-time user flow**







### **Step 1: Landing page**





Hero copy:



- “Describe your startup in 3 sentences.”
- “We simulate the room that tells you no.”
- CTA: **Stress Test My Idea**







### **Step 2: Intake form**





Collect:



- startup name
- one-line idea
- problem being solved
- target customer
- why now
- pricing model
- go-to-market plan
- competitors
- unfair advantage
- current stage
- optional website / deck / notes upload





Do not make this too long. Use progressive disclosure:



- basic mode: 6 fields
- advanced mode: more structured fields







### **Step 3: Select test mode**





Three options:



- **Quick Roast**
  60–90 seconds, fast, sharp critique
- **Investor Committee**
  Multi-agent analysis with scores and contradictions
- **Deep Stress Test**
  Includes assumption map, competitor pressure, GTM risk, pricing risk, and pivot suggestions







### **Step 4: Processing state**





Display something theatrical:



- “VC partner reviewing your moat”
- “Growth lead attacking your CAC assumptions”
- “Customer skeptic testing willingness to pay”





This makes the product feel alive.





### **Step 5: Results page**





The result should not be a giant essay. It should be a dashboard with sections:



- Verdict
- Kill reasons
- Strongest angle
- Weakest assumption
- Score breakdown
- Contradictions detected
- What would need to be true to win
- Recommended next experiment
- Revised positioning suggestions







### **Step 6: Save / compare / share**





User can:



- save report
- compare v1 vs v2
- export PDF
- create public share link
- run another test after edits





This comparison loop becomes retention.



---





# **Product outputs**





The report should have a consistent schema every time.





## **1. Executive verdict**





One of:



- **Proceed**
- **Proceed with caution**
- **Weak**
- **Likely dead**
- **Needs a different wedge**







## **2. Scorecard**





Each on 1–10 with explanation:



- Problem severity
- Customer clarity
- Market timing
- Distribution plausibility
- Monetization strength
- Competitive defensibility
- Founder-market fit
- Speed to MVP
- Retention potential
- Investor attractiveness







## **3. Kill reasons**





Top 3 reasons this startup might fail.



Example:



- Distribution channel is hand-wavy
- Differentiation is too easy to clone
- Pricing assumes willingness to pay without urgency







## **4. Survive reasons**





Top 3 reasons it might still work.





## **5. Assumption map**





Explicit assumptions such as:



- customers have this pain
- they are actively seeking alternatives
- they can buy without long procurement
- founders can reach them cheaply
- incumbents will not crush the feature





Each assumption gets:



- confidence
- fragility
- suggested test







## **6. Contradiction detector**





Very important.



The system should say things like:



- “You claim SMBs are the customer, but your GTM implies enterprise sales.”
- “You describe this as a workflow tool, but pricing assumes mission-critical value.”
- “Your moat is data, but your acquisition path does not explain how unique data is collected.”





This is a huge differentiator.





## **7. Next best actions**





Not generic advice. Give concrete validation steps:



- interview 10 users in segment X
- test landing page against pain statement Y
- run pricing smoke test at $49 / $149 / custom quote
- narrow customer from “businesses” to “solo accountants”







## **8. Repositioning options**





Give 3 alternate versions:



- narrower niche
- higher urgency use case
- enterprise version
- prosumer wedge





---





# **Differentiation strategy**







## **The big moat is not the LLM**





Anyone can wrap an LLM around a form.



The moat is:



- structured evaluation framework
- better orchestration
- persistent user history
- revision comparison
- contradiction detection
- opinionated outputs
- clean UX
- better prompts and evaluator rubric
- optional evidence retrieval







## **What makes this product feel smarter than competitors**





Use a **committee model**.



Instead of one model producing one report, use multiple roles:



- Investor Partner
- Skeptical Customer
- Growth Lead
- Product Strategist
- Market Historian
- Technical Feasibility Reviewer





Then synthesize them.



This makes the output feel less generic and more adversarial.



---





# **Recommended architecture**







## **High-level stack**





I would build this as:



- **Frontend:** Next.js
- **Backend:** Next.js server actions + route handlers
- **Database:** Supabase Postgres
- **Auth:** Supabase Auth
- **File storage:** Supabase Storage
- **Embeddings / retrieval:** pgvector in Postgres
- **Payments:** Stripe
- **LLM orchestration:** OpenAI Responses API
- **Observability:** PostHog + Sentry
- **Hosting:** Vercel for app, Supabase for DB/storage





This is a strong stack for a fast-moving SaaS product. Next.js App Router is designed around Server Components and Server Functions, and Server Actions are stable in Next.js 14+. Supabase supports Postgres, pgvector, Edge Functions, and row-level security. Stripe’s subscription flows depend on webhooks, and webhook signatures should be verified. OpenAI’s platform supports the Responses API, structured outputs, and function calling. 



---





# **Why this stack**







## **Next.js**





Use it because:



- excellent for SaaS dashboards
- great auth/session patterns
- fast deployment on Vercel
- server actions simplify form submission and secure server-side workflows
- single codebase for app + API







## **Supabase**





Use it because:



- Postgres is perfect for structured reports and relational data
- pgvector lets you support retrieval over past analyses, uploaded notes, and market snippets
- row-level security gives clean multi-tenant isolation
- auth/storage are already integrated







## **Stripe**





Needed for:



- subscriptions
- free trial
- metered credits later if you want







## **OpenAI**





Needed for:



- multi-agent critique generation
- structured JSON output
- optional web-assisted evidence later
- classification passes
- contradiction checking





---





# **Infrastructure diagram**



```
User Browser
   |
   v
Next.js App (Vercel)
   |-- Landing / Dashboard / Reports
   |-- Server Actions for submissions
   |-- Route Handlers for webhooks / async jobs
   |
   +--> Supabase Auth
   +--> Supabase Postgres
   |      - users
   |      - startups
   |      - analyses
   |      - scorecards
   |      - assumptions
   |      - uploads
   |      - embeddings
   |
   +--> Supabase Storage
   |      - pitch decks
   |      - notes
   |
   +--> OpenAI Responses API
   |      - committee agents
   |      - synthesis agent
   |      - contradiction detector
   |
   +--> Stripe
   |      - checkout
   |      - subscriptions
   |      - webhooks
   |
   +--> PostHog / Sentry
```



---





# **Core backend design**







## **Main entities**







### **users**





- id
- email
- created_at
- plan_tier
- stripe_customer_id
- monthly_credit_limit
- monthly_credit_used







### **startups**





- id
- user_id
- name
- one_liner
- description
- target_customer
- problem
- solution
- pricing_model
- distribution_strategy
- competitors
- unfair_advantage
- stage
- created_at
- updated_at







### **analyses**





- id
- startup_id
- run_type (quick_roast, committee, deep)
- input_snapshot_json
- final_verdict
- final_summary
- confidence_score
- created_at







### **analysis_scores**





- id
- analysis_id
- problem_severity
- customer_clarity
- timing
- distribution
- monetization
- defensibility
- founder_fit
- speed_to_mvp
- retention
- investor_attractiveness







### **analysis_sections**





- id
- analysis_id
- section_type
- content_json





Possible section types:



- kill_reasons
- survive_reasons
- assumption_map
- contradiction_report
- experiments
- repositioning_options
- raw_committee_outputs







### **uploads**





- id
- startup_id
- file_path
- file_type
- extracted_text
- created_at







### **embeddings**





- id
- owner_type
- owner_id
- chunk_text
- embedding vector
- metadata_json





---





# **Multi-agent analysis pipeline**





This is the heart of the product.





## **Stage 1: Normalize input**





Take user form input and convert it into a canonical startup brief JSON.



Example schema:

```
{
  "startup_name": "string",
  "core_problem": "string",
  "target_customer": "string",
  "value_prop": "string",
  "pricing_model": "string",
  "distribution_strategy": "string",
  "competitors": ["..."],
  "claimed_moat": "string",
  "current_stage": "idea | mvp | revenue",
  "constraints": ["..."]
}
```

Do this with a deterministic prompt and structured output.





## **Stage 2: Committee critique**





Run parallel agents on the same canonical brief.





### **Agent roles**





- **VC Partner Agent**
  asks whether this is venture-scale and defensible
- **Customer Skeptic Agent**
  asks whether users care enough to buy
- **Growth Agent**
  attacks CAC, acquisition loops, and channel realism
- **Product Agent**
  checks workflow pain, retention, and wedge clarity
- **Technical Risk Agent**
  checks feasibility, implementation burden, dependency risk
- **Competitor Agent**
  asks whether incumbents can copy this instantly





Each returns structured JSON:



- score
- main concerns
- strongest angle
- what would change their mind
- 3 quotes / punchy lines for UI







## **Stage 3: Contradiction pass**





Run a dedicated agent whose only job is to detect internal inconsistency.



Input:



- canonical brief
- all committee outputs





Output:



- contradictions list
- severity
- exact conflicting claims
- suggested rewrite







## **Stage 4: Assumption extraction**





Run an agent that extracts hidden assumptions from the brief and committee comments.



Each assumption gets:



- assumption statement
- category
- fragility
- evidence quality
- suggested test







## **Stage 5: Synthesis**





A final synthesis agent produces:



- final verdict
- scorecard
- 3 kill reasons
- 3 survive reasons
- recommended next experiment
- 3 repositioning options







## **Stage 6: Optional evidence retrieval**





Later, you can enrich outputs with:



- uploaded deck snippets
- prior user analyses
- market notes
- user research transcripts





This is where pgvector helps.



---





# **Scoring framework**





Do not let the model invent arbitrary scores.



Use explicit rubric logic.





## **Example rubric**





For each 1–10 score, define anchors.





### **Distribution plausibility**





- 1–2: no real channel named
- 3–4: channel named but no reason it is low-cost or reachable
- 5–6: plausible channel with weak proof
- 7–8: strong channel with founder access or natural loop
- 9–10: proven low-cost acquisition wedge or strong distribution advantage





Do that for every dimension.



Then either:



- have the model assign score using rubric text, or
- combine model judgments into a final weighted score







## **Suggested weights**





For early-stage ideas:



- problem severity: 0.14
- customer clarity: 0.12
- timing: 0.08
- distribution: 0.16
- monetization: 0.10
- defensibility: 0.14
- speed to MVP: 0.08
- retention potential: 0.08
- investor attractiveness: 0.10





You can tune later.



---





# **Key product features for MVP**







## **Free tier**





- 3 quick roasts per month
- no history compare
- no export
- no deep test







## **Pro tier**





- unlimited quick roasts
- 20 committee analyses
- compare revisions
- PDF export
- saved startup workspaces
- uploaded notes/decks







## **Team tier later**





- multiple collaborators
- shared workspaces
- comments
- founder/investor review links





---





# **UX details that matter**







## **Results page layout**





Use cards and gauges, not walls of text.



Sections:



- top banner verdict
- score radar or bar list
- “Why this dies”
- “Why this might live”
- “What must be true”
- contradiction panel
- recommended experiments
- alternate wedges







## **Tone toggle**





A good viral feature:



- polite
- direct
- brutal





This is easy to implement and highly shareable.





## **Public share page**





Users love sharing:



- “Roast my startup”
- “My startup got a 38/100”





This becomes acquisition.



---





# **API design**







## **POST /api/analyze**





Input:



- startup_id
- run_type





Server flow:



1. load startup brief
2. enforce credit usage
3. normalize input
4. call committee agents
5. contradiction pass
6. synthesis
7. save analysis and sections
8. return analysis_id







## **GET /api/analysis/:id**





Returns hydrated report JSON.





## **POST /api/checkout**





Create Stripe Checkout Session.





## **POST /api/stripe/webhook**





Handle:



- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted





Stripe recommends handling subscription activity via webhooks and verifying events are authentic. 





## **POST /api/upload**





Upload file to Supabase Storage and queue text extraction.



---





# **Suggested folder structure**



```
app/
  (marketing)/
    page.tsx
    pricing/page.tsx
  dashboard/
    page.tsx
    startups/[id]/page.tsx
    analyses/[id]/page.tsx
  api/
    analyze/route.ts
    checkout/route.ts
    stripe/webhook/route.ts
    upload/route.ts

components/
  landing/
  dashboard/
  report/
  ui/

lib/
  auth/
  db/
  stripe/
  openai/
  scoring/
  prompts/
  validators/
  usage/

lib/prompts/
  normalize.ts
  vc_partner.ts
  customer_skeptic.ts
  growth.ts
  product.ts
  technical.ts
  competitor.ts
  contradictions.ts
  synthesis.ts

types/
  startup.ts
  analysis.ts
  scoring.ts

supabase/
  migrations/
  functions/
```



---





# **Recommended TypeScript interfaces**



```
export type RunType = "quick_roast" | "committee" | "deep";

export interface StartupBrief {
  id: string;
  name: string;
  oneLiner: string;
  problem: string;
  targetCustomer: string;
  solution: string;
  pricingModel?: string;
  distributionStrategy?: string;
  competitors?: string[];
  unfairAdvantage?: string;
  stage?: "idea" | "mvp" | "revenue";
}

export interface CommitteeOutput {
  agent: "vc_partner" | "customer_skeptic" | "growth" | "product" | "technical" | "competitor";
  score: number;
  strongestAngle: string;
  biggestConcern: string;
  concerns: string[];
  whatWouldChangeMyMind: string[];
  oneLiner: string;
}

export interface ContradictionItem {
  title: string;
  severity: "low" | "medium" | "high";
  explanation: string;
  conflictingClaims: string[];
  suggestedFix: string;
}

export interface AssumptionItem {
  assumption: string;
  category: "customer" | "distribution" | "pricing" | "competition" | "technical";
  fragility: number;
  confidence: number;
  test: string;
}

export interface FinalAnalysis {
  verdict: "proceed" | "proceed_with_caution" | "weak" | "likely_dead" | "different_wedge";
  summary: string;
  scores: Record<string, number>;
  killReasons: string[];
  surviveReasons: string[];
  contradictions: ContradictionItem[];
  assumptions: AssumptionItem[];
  experiments: string[];
  repositioningOptions: string[];
}
```



---





# **Prompting strategy**







## **Important rule**





Do not ask the model for prose first.



Ask for **strict structured output** first.

Then render the UI from JSON.

Then optionally ask for punchy display copy.



This will make the system much more stable.





## **Prompt design principles**





Each agent prompt should include:



- role identity
- rubric
- what to optimize for
- what to distrust
- output schema
- forbidden behaviors







### **Example: VC Partner prompt**





System intent:



- Evaluate whether this is a compelling venture-scale company.
- Be skeptical of weak moats, small markets, unclear urgency, and hand-wavy GTM.
- Do not provide encouragement unless justified.
- Return valid JSON only.







### **Example: Contradiction detector prompt**





System intent:



- Find internal inconsistencies between business claims, pricing, target customer, and go-to-market.
- Prefer precision over breadth.
- Return only contradictions that materially weaken the business case.





---





# **Retrieval and memory**







## **MVP**





You can skip external web retrieval initially.



Use:



- current user inputs
- uploaded materials
- prior analyses for this startup







## **V2**





Add retrieval from:



- previous founder interview notes
- landing page copy
- uploaded pitch deck
- product requirements docs
- customer feedback transcripts





Supabase supports vector search through pgvector, and because it sits on Postgres you can pair retrieval with row-level access control. 



---





# **Billing design**







## **Suggested pricing**





- Free: 3 quick roasts
- Pro: $19–29/month
- Team: $79–149/month later







## **Why this works**





The use case is high-value and recurring:



- founders revise constantly
- users want compare-over-time
- teams want shared debate around positioning







## **Stripe integration**





Use:



- Stripe Checkout for first version
- webhook sync into subscriptions table
- feature gates based on plan tier





Stripe docs recommend listening for subscription lifecycle changes with webhooks and granting or revoking access accordingly. 



---





# **Security and abuse prevention**







## **Must-have**





- auth required for saving reports
- rate limits on anonymous runs
- server-side credit enforcement
- prompt injection filtering for uploads
- file type validation
- strip HTML/script content from uploads
- redact secrets from uploaded docs if possible







## **Why server actions help**





Server Actions run on the server, which keeps sensitive logic and API keys out of the client flow. Next also documents security considerations around action IDs and server-side handling. 



---





# **Observability**





Use:



- **PostHog**
  - funnel events
  - pricing page conversion
  - report share clicks
  - compare report usage
- **Sentry**
  - failed runs
  - malformed JSON from model
  - webhook failures





Track:



- completed analyses
- upgrade conversion
- re-run rate
- number of revised startup briefs per user
- share link creation rate





---





# **Performance strategy**







## **Fast path**





For Quick Roast:



- one fast normalize pass
- one critique pass
- one synthesis pass





Target: under 20 seconds





## **Deep path**





For Committee:



- parallel agent calls
- contradiction pass
- synthesis







## **Async pattern**





When run starts:



- create analysis row with status = processing
- stream progress states to UI
- save partial outputs
- let user refresh safely





---





# **What a coding agent should build first**







## **Phase 1: MVP in 7 components**





1. landing page
2. auth
3. startup intake form
4. analysis pipeline
5. report page
6. Stripe billing
7. dashboard with saved reports







## **Phase 2**





1. comparison mode
2. uploads
3. contradiction detector polish
4. tone toggle
5. public share pages







## **Phase 3**





1. team workspaces
2. collaborative comments
3. investor mode
4. benchmark library of successful startups
5. suggested pivots trained from prior user outcomes





---





# **Exact build order**







## **Week 1**







### **Day 1**





- initialize Next.js app
- configure Supabase
- configure auth
- create DB schema
- set up env management







### **Day 2**





- build marketing page
- pricing page
- dashboard shell
- startup creation form







### **Day 3**





- implement canonical brief generator
- implement one-agent quick roast
- save analysis rows







### **Day 4**





- add committee agents in parallel
- add synthesis pass
- display basic scorecards







### **Day 5**





- add contradiction detector
- polish results page
- add loading/progress states







### **Day 6**





- Stripe Checkout
- subscription sync webhook
- feature gates







### **Day 7**





- QA
- error handling
- analytics
- deploy





---





# **Failure modes to guard against**







## **1. Generic outputs**





Fix by:



- strict rubrics
- role separation
- contradiction pass
- banning generic language in prompts







## **2. Hallucinated certainty**





Fix by:



- confidence fields
- assumption framing
- “what would change my mind” fields







## **3. Ugly giant reports**





Fix by:



- JSON-first rendering
- short cards
- progressive disclosure







## **4. Users run once and leave**





Fix by:



- compare revisions
- public share pages
- recommended experiments
- saved startup workspace







## **5. Easy to clone**





Fix by:



- better evaluation design
- historical versioning
- product UX
- strong rubric tuning
- founder workflow integration





---





# **MVP success metric**





Your MVP is working if, within the first month, you see:



- users submitting multiple revisions of the same idea
- users sharing results publicly
- users coming back before building their next version
- paid conversion from people wanting deeper tests or saved history





The biggest sign of product-market pull is not raw signup volume.

It is **re-analysis of edited ideas**.



That means the product is becoming part of how people think.



---





# **One strong product opinion**





Do **not** position this as “AI startup advisor.”



Position it as:



**“The fastest way to find out why your startup gets rejected.”**



That is sharper, more memorable, and more differentiated.

