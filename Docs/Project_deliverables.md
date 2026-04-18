For the final project, you will design, build, and deploy an agentic LLM-based web application of your choice.

This project is open-ended. You are not restricted to a single use case or domain. Your goal is to create a working application that demonstrates your ability to design and implement an AI system in which an LLM can make decisions about what to do next.

Your application may support any meaningful use case. Examples include, but are not limited to:

a study assistant for course materials or research papers
a document analysis or review assistant
a customer support triage tool
a travel planning assistant
a personal productivity or task-routing agent
a knowledge assistant for a business, lab, or organization
a recommendation or search assistant
a workflow automation assistant
These are only examples; you are free to choose another use case.

The emphasis of this project is not on a particular framework, model provider, or deployment platform. Instead, the emphasis is on your ability to:

Design an agentic system around an LLM
Justify the choices you made
Build a usable web application
Deploy it publicly
Observe how it behaves
Evaluate it in a reasonable way
Team Structure

You may complete the project:

individually
in pairs
What counts as an Agentic System?

For this project, an agentic system is any LLM-based system that can make decisions about what to do, including:

Selecting among one or more tools
Deciding whether or not to use a tool
Dynamically choosing context or information sources
Routing between steps or components
Otherwise, controlling part of the workflow based on the input or intermediate results
A simple workflow can count as agentic if the LLM is making a real decision.

A system is not considered sufficiently agentic if:

The same tool is always called in the same way every time
The workflow is entirely fixed and deterministic, with no LLM decision-making
The LLM only produces a response with no dynamic control over the process
In other words, there must be some meaningful sense in which the LLM is deciding what happens next.

Project Requirements

1. Build a Working Agentic Application

You must build a web application that includes a genuine agentic LLM-based component.

Your application may be chat-based, form-based, search-based, dashboard-based, or any other interface style, as long as it is a web app and the agentic behavior is part of the system.

The system must include at least one tool or dynamically controlled component that the LLM can choose to use, invoke, or route through.

Examples of valid agentic patterns include:

Tool use/function calling
Retrieval used conditionally
Touting between prompts or sub-systems
Multi-step planning
Multi-agent or supervisor-style systems
Dynamic query rewriting
Dynamic memory or context selection
You are free to decide what is appropriate for your use case.

2. Deployment

Your application must be deployed and publicly accessible.

This means:

There must be a working URL
The application must be reachable and usable by the instructor for evaluation
You may deploy anywhere you like. AWS is allowed, but not required.

Examples of acceptable platforms include AWS, Vercel, Netlify, Render, Hugging Face Spaces, or any other suitable deployment option.

3. Technology Choices

You may use any reasonable stack, framework, API, database, vector store, model provider, or deployment platform.

Examples include, but are not limited to:

OpenAI, Anthropic, Bedrock, Hugging Face
LangGraph, CrewAI, custom orchestration
Pinecone, Weaviate, Supabase, Convex, OpenSearch, pgvector
React, Next.js, Flask, FastAPI, Django, or other web frameworks
There is no required framework. Your responsibility is to choose tools that fit your use case and to explain why you made those choices.

4. Observability

Your system must include an observability layer.

This does not need to be heavy or vendor-specific. Lightweight and custom implementations are acceptable. The goal is that if something fails, you can inspect what happened.

Your observability setup should allow you to understand at least some of the following:

user inputs
model outputs
tool calls or workflow decisions
failures or errors
latency or timing information
Examples of acceptable approaches include:

LangSmith
Langfuse
application logs
custom traces
stored request/response records
simple dashboards or monitoring views
What matters is that you can inspect and reason about system behavior.

5. Metrics

You must define and track at least two metrics that are relevant to your application.

Because use cases are open-ended, the metrics are also flexible. However, they should be meaningful for your system, and you must explain why they matter.

A good rule of thumb is to include:

one metric related to quality or usefulness
one metric related to system behavior or operations
Examples include:

Task success rate
Relevance or answer quality
Hallucination or failure rate
Retrieval quality
User completion rate
Tool success rate
Latency
Cost per request
Abandonment rate
Escalation rate
You do not need a highly formal evaluation setup, but your report should show that you measured something real and that you thought carefully about what success means for your application.

6. Evaluation

Your evaluation does not need to be benchmark-heavy or highly formal, but it must exist.

At a minimum, you should evaluate your system on a small set of representative scenarios and discuss:

Where it works well
Where it fails or struggles
What tradeoffs did you observe
What would you improve next
Your evaluation should be credible and aligned with your use case.

Deliverables

The following must be submitted on Brightspace

1. Publicly Accessible Deployed Application

Submit the public URL to your deployed web application. The app should be live and working.

2. Public GitHub Repository

Submit a link to a public GitHub repository containing your code.

Your repository should include enough information for someone technical to understand how the project works and how it could be run or reproduced.

At a minimum, include:

a README
setup instructions
dependencies (requirements.txt, pyproject.toml, package.json, or equivalent)
environment variable documentation
List the variable names that are needed
Do not commit secrets
deployment notes if relevant
You may use generative AI tools, starter code, external libraries, and publicly available resources. However:

Do not share code across teams
Clearly acknowledge important external resources, frameworks, or codebases that influenced your project
3. Technical Report

Submit a technical report describing your system.

The report should be complete, clear, and well-organized. Focus more on substance than page count.

Your report should include the following:

a. Problem and Use Case

What problem are you solving?
Who is the user?
What does the application do?
b. System Design

High-level architecture of the system
Main components of the application
How the agentic behavior is implemented
c. Why the System is Agentic

What decisions is the LLM making
What tools or workflow choices does it control
Why is this meaningfully agentic rather than just a fixed pipeline
d. Technical Choices and Rationale

Models used
Frameworks or orchestration methods
Tools or APIs
Data sources, retrieval methods, memory, or other supporting components
Why these choices made sense for your use case
e. Observability

What observability mechanism did you implement
What it captures
How it helps you inspect failures, outputs, or system behavior
f. Metrics

The two or more metrics you chose
Why those metrics matter
How you tracked or computed them
g. Evaluation

Representative examples or test scenarios
Successes and failure cases
Strengths and limitations of your system
Discussion of tradeoffs
h. Deployment

Shere and how the system is deployed
Any relevant practical constraints, limitations, or setup decisions
i. Reflection

Shat you learned
What would you improve with more time
What design choices would you revisit
NOTES

Your project does not need to use a chatbot interface.
Your project does not need to use RAG unless it makes sense for your use case.
Your project does not need to use a specific cloud platform or framework.
The project is intended to be ambitious but manageable. Scope your idea accordingly.