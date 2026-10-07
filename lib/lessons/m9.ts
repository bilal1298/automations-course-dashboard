import type { Lesson } from './types';

export const m9: Lesson = {
  intro: "An agent is an AI model that decides its own next step: which tool to use, with what details, and when it’s finished. That’s powerful and risky. This module teaches when an agent is worth it (often it isn’t), how to give it narrow, safe tools, and how to build one with LangGraph that pauses for approval, survives a restart and stops when it should. It ends with MCP, the standard way to plug tools into AI apps. Job ads list these as “agentic workflows”, “LangGraph” and “MCP”.",
  glossary: {
    "agent": "An AI system where the model decides which steps and tools to use next, in a loop, instead of following a fixed path.",
    "tool loop": "The agent cycle: the model asks for a tool, your code runs it, the result goes back to the model, repeat until done.",
    "tool call": "The model’s request to use a tool: a tool name plus arguments, e.g. get_order(order_id='1042'). Your code decides whether to run it.",
    "json schema": "A standard way to describe what valid JSON looks like: which fields, which types, which are required.",
    "langgraph": "A Python/JavaScript library for building agents as a graph of steps, with saved state, branching and pauses.",
    "state": "In LangGraph, the shared record of everything a run has done so far: inputs, messages, tool results, pending actions.",
    "graph node": "In LangGraph, one step of the graph: a function that reads the state and returns updates to it.",
    "edge": "In LangGraph, an arrow saying which node runs next. A conditional edge picks the next node based on the state.",
    "checkpointer": "The part of LangGraph that saves a checkpoint of the state after each step, e.g. into Postgres.",
    "thread": "In LangGraph, one conversation or job with its own saved history, identified by a thread ID.",
    "short-term memory": "What an agent remembers within one thread: this conversation’s messages and results.",
    "long-term memory": "Facts an agent keeps across threads, e.g. a customer’s preferences. Stored separately, with its own retention rules.",
    "human-in-the-loop": "A design where the automation pauses and a person approves, edits or rejects before it continues.",
    "tool-selection accuracy": "The share of test tasks where the agent chose the correct tool (or correctly chose no tool).",
    "mcp": "Model Context Protocol: an open standard for connecting AI apps to tools and data through a common interface.",
    "mcp host": "The AI app the user works in (e.g. Claude Desktop, an IDE or your own agent) that connects to MCP servers.",
    "mcp client": "The connector inside a host that holds one connection to one MCP server.",
    "mcp server": "A program that offers tools, resources and prompts to AI apps through MCP, e.g. a CRM server.",
    "transport": "How MCP messages travel: stdio for a local program on the same computer, Streamable HTTP for a remote server.",
    "json-rpc": "A simple standard format for sending “call this method with these parameters” messages as JSON. MCP uses it.",
  },
  sections: [
    {
      title: "What is an AI agent, and when not to use one",
      minutes: 6,
      body: [
        "**A normal workflow** is what you build in n8n: you decide the steps in advance. New lead → enrich → score → add to CRM. An LLM might do one step, but *you* fixed the path.",
        "**An [[agent]]** gets a goal and a set of tools, and the model decides the path: which tool to use next, based on what the last one returned. “Find out why order 1042 hasn’t shipped and tell the customer” might mean checking the order, then the warehouse, then the courier, depending on each answer.",
        "**The analogy.** A workflow is a recipe. An agent is a cook you give ingredients and a goal: more flexible, less predictable.",
        "**How it works: the [[tool loop]].**",
        "1. Your code sends the model the goal plus a list of tools it may use.\n2. The model replies with a [[tool call]]: a tool name and arguments, e.g. `get_order(order_id='1042')`.\n3. **Your code** runs the tool and sends the result back.\n4. Repeat until the model gives a final answer, or a limit stops it.",
        "The model never runs anything itself; it only *asks*. That’s your control point. This pattern is often called **ReAct** (reason, then act). Log every tool call and result, so you can see what the agent did and why.",
        "**When NOT to use an agent.** If you can draw the steps as a flowchart, build a workflow. It’s cheaper, faster, easier to test and does the same thing every time. Use an agent only when the next step genuinely depends on what the model finds along the way. Employers test this judgement. And several agents talking to each other isn’t automatically better: one clear agent inside a deterministic workflow is often the stronger design.",
        "**In n8n**, employers expect you to know the **AI Agent** node, with its memory and tool sub-nodes attached underneath. They also test the **MCP Server Trigger** node (offers your workflow as MCP tools) and the **MCP Client Tool** node (lets an n8n agent use another MCP server). MCP is covered in the last lesson.",
      ],
      example: {
        caption: "A logged agent run: the model asks, your code acts",
        code: `goal: "Why hasn't order 1042 shipped? Reply to the customer."

step 1  model → get_order(order_id='1042')
        tool  → {status: 'paid', warehouse: 'SYD'}
step 2  model → get_warehouse_status(order_id='1042')
        tool  → {status: 'on hold', reason: 'address invalid'}
step 3  model → draft_reply(ticket_id='T-88', topic='confirm address')
        tool  → {draft_id: 'd-77'}
step 4  model → final: "Drafted d-77 asking the customer to confirm their address."`,
      },
      interview: "I use a deterministic workflow when the path is known, and an agent only when the next action depends on intermediate observations. The agent is a bounded tool loop: the model proposes tool calls, my code validates and executes them, and every call and result is logged so the run is observable and debuggable.",
      check: [
        {
          id: "m9-s0-1", kind: "choice",
          prompt: "Which task most justifies an agent rather than a fixed workflow?",
          options: [
            { text: "Chasing a delayed shipment, where each check depends on what the last one found", why: "Right. The path isn’t known in advance, so the model choosing the next step earns its cost." },
            { text: "Drafting replies to support tickets, since every ticket is worded differently", why: "Varied input isn’t a varied path. One LLM step inside a fixed workflow handles this." },
            { text: "Copying Stripe invoices into a Google Sheet, with an LLM tidying descriptions", why: "An LLM step doesn’t make it an agent. The steps are fixed, so a workflow is cheaper and more reliable." },
            { text: "Any process with more than ten steps, because long workflows are hard to maintain", why: "Length isn’t the test. If you can draw the steps as a flowchart, it’s still a workflow." },
          ],
          answer: 0,
          explain: "If you can draw it as a flowchart, build a workflow.",
        },
        {
          id: "m9-s0-2", kind: "choice",
          prompt: "In the tool loop, who actually runs the tool?",
          options: [
            { text: "Your code, after the model has asked for it by name", why: "Yes. The model only proposes a tool call; your code decides whether to run it, runs it and sends the result back." },
            { text: "The model, directly, once you’ve given it the tool", why: "Giving the model a tool only describes it. The model outputs text; it can’t execute anything itself." },
            { text: "The provider’s servers, as part of the same API call", why: "For your own tools, the provider just returns the request. Your code has to run it." },
            { text: "The tool’s own API, triggered by the model’s reply", why: "Nothing is triggered automatically. Your code reads the reply and decides whether to make the call." },
          ],
          answer: 0,
          explain: "Because your code runs the tools, your code is where you check, limit and log.",
        },
        {
          id: "m9-s0-3", kind: "order",
          prompt: "Put one turn of the tool loop in order.",
          items: ["Send the goal and the list of tools to the model", "The model replies with a tool call", "Your code runs the tool", "Send the result back to the model"],
          explain: "This repeats until the model gives a final answer or a limit stops it.",
        },
      ],
    },
    {
      title: "Designing narrow, safe tools",
      minutes: 6,
      body: [
        "**The problem.** It’s tempting to give an agent one powerful tool, like `run_sql(query)` or `call_api(url, body)`. Then a confused or manipulated model can do *anything* that tool allows: delete tables, email everyone. The fix is **narrow tools**: each does one job with tightly limited inputs.",
        "- ❌ `run_sql(query)` → ✅ `get_order(order_id)`\n- ❌ `send_email(to, body)` to anyone → ✅ `draft_reply(ticket_id, body)`, which only goes to that ticket’s customer",
        "Each tool has a name, a description the model reads to decide when to use it, and a [[JSON Schema]] describing its inputs. The schema lets you reject bad arguments before anything runs: wrong types, missing fields, values outside an allowed list.",
        "**Permission checks happen in your server code, not the prompt.** The model doesn’t decide who the user is. Your tool takes the user and tenant from the logged-in session, then checks: may *this* user see *this* order? If the model passes another customer’s ID, the check refuses. A system prompt saying “only access the current customer” is a request, not a lock.",
        "**Validate every side effect in code.** Before a tool that changes something (refund, update, send) runs, plain code checks the proposal: Is the amount within limits? Does the order belong to this customer? Only then execute.",
        "**Make tools easy for the model:** descriptions that say when *not* to use them, short structured results, and errors it can act on (“order not found; ask the customer for the order number”).",
      ],
      example: {
        caption: "A tool definition (field names vary by provider) and the server code behind it",
        code: `# What the model sees
{
  "name": "get_order",
  "description": "Look up one order by ID. Read-only. Use when the customer mentions an order.",
  "input_schema": {
    "type": "object",
    "properties": { "order_id": { "type": "string", "pattern": "^[0-9]{4,10}$" } },
    "required": ["order_id"]
  }
}

# What your server runs
def get_order(order_id, session):
    order = db.find_order(order_id)
    if order is None or order.tenant_id != session.tenant_id:  # who's asking: from the login session
        return {'error': 'order not found'}   # same reply either way: don't reveal it exists
    return {'id': order.id, 'status': order.status}   # only the fields needed`,
      },
      interview: "I expose narrow, single-purpose tools with strict JSON Schemas, and enforce authorisation inside the tool from the authenticated session, never from model-supplied identifiers. Every state-changing call passes deterministic validation of its arguments before execution, and tool results are minimal and structured.",
      check: [
        {
          id: "m9-s1-1", kind: "choice",
          prompt: "Your agent has a single tool, `run_sql(query)`, connected to the production database. What’s the main risk?",
          options: [
            { text: "A fooled model can read or change anything the database login allows", why: "Right. Replace it with narrow tools like get_order(order_id)." },
            { text: "Generated SQL is often slow, so the agent will time out on large tables", why: "Speed is a minor concern next to unlimited access to the data." },
            { text: "None, as long as the system prompt says to run SELECT queries only", why: "A prompt is a request, not a permission system. A manipulated model can ignore it." },
            { text: "Models write invalid SQL, so most calls will fail with syntax errors", why: "Models often write valid SQL. That’s exactly why the tool is dangerous." },
          ],
          answer: 0,
          explain: "Narrow tools limit what a mistake can do.",
        },
        {
          id: "m9-s1-2", kind: "choice",
          prompt: "A user logged in as customer C-123 gets the agent to call `get_invoices(customer_id='C-999')`. Where should this be stopped?",
          options: [
            { text: "In the tool’s code, using the customer from the login session", why: "Yes. Identity comes from the session, not from the model’s arguments." },
            { text: "In the system prompt: “only ever access the logged-in customer’s data”", why: "Prompts can be ignored or overridden. Enforcement must be in code." },
            { text: "In the tool’s JSON Schema, by checking customer_id has the right format", why: "C-999 has a valid format. A schema checks shape, not who owns the record." },
            { text: "By having a second LLM review every tool call before your code runs it", why: "Another model can be fooled the same way. It isn’t a security boundary." },
          ],
          answer: 0,
          explain: "Never trust identifiers the model supplies for authorisation.",
        },
        {
          id: "m9-s1-3", kind: "choice",
          prompt: "The prompt says “never refund more than $100”. Is that enough to stop a $5,000 refund?",
          options: [
            { text: "No. The refund tool must check the amount in code before running", why: "Right. Code enforces the limit even if the model is fooled." },
            { text: "Yes, provided the rule is repeated at the end of the prompt as well", why: "Repetition helps the model comply more often, but it’s still not a guarantee." },
            { text: "Yes, if temperature is 0 so the model always follows the rule", why: "Temperature 0 makes output less varied, not obedient. Manipulation still works." },
            { text: "Only with a bigger model, which follows instructions more reliably", why: "More reliable isn’t guaranteed. A fooled big model still issues the refund." },
          ],
          answer: 0,
          explain: "Prompts guide behaviour; code enforces limits.",
        },
      ],
    },
    {
      title: "LangGraph: your agent as a graph",
      minutes: 7,
      body: [
        "**The problem.** A plain tool loop is a black box: it keeps going until the model says stop. Real systems need more control: “always classify first”, “refunds go through approval”, “save progress so a crash doesn’t lose work”.",
        "[[LangGraph]] is a Python (and JavaScript) library for building agents as a graph: boxes joined by arrows, like an n8n canvas. You decide the structure; the model makes decisions only where you allow it.",
        "Five ideas:",
        "- **[[State]]**: one shared record of everything so far: the ticket, messages, tool results, the pending action. Like the data flowing between n8n nodes, but kept in one place.\n- **[[Graph node|Nodes]]**: plain functions. Each reads the state and returns updates to it. A node might call the LLM, run a tool or apply a rule.\n- **[[Edge|Edges]]**: arrows saying which node runs next.\n- **Conditional edges**: a function looks at the state and picks the next node, like an n8n IF or Switch node.\n- **Termination**: the special `END` node. Every path must be able to reach it.",
        "An agent in LangGraph is usually a loop: an *LLM node* decides; a conditional edge sends it to a *tools node* if it asked for a tool, or to `END` if it’s done; the tools node goes back to the LLM node. Because you drew it, you can add a rule, an approval step or a limit anywhere. You don’t have to wire this loop by hand: LangChain’s `create_agent` (which replaces the deprecated `create_react_agent`) builds it for you on LangGraph.",
        "**Updates merge into the state.** By default a returned key overwrites the old value. List keys like the message history use a **reducer** instead, e.g. `messages: Annotated[list, add_messages]`, so returned messages are *appended*, not overwritten.",
        "**Make the exit explicit.** A loop with no exit runs until something breaks. LangGraph stops a run that takes too many steps (the `recursion_limit` setting) with an error. That’s a safety net, not a plan: also design proper exits, like a “done” condition and an escalate-to-human route.",
      ],
      example: {
        caption: "A small LangGraph router (Python)",
        code: `from typing import TypedDict
from langgraph.graph import StateGraph, START, END

class State(TypedDict):          # the shared record
    ticket: str
    category: str

def classify(state: State):      # a node: read the state, return updates
    return {'category': llm_classify(state['ticket'])}

def route(state: State):         # picks which node runs next
    return 'refund' if state['category'] == 'refund' else 'general'

builder = StateGraph(State)
builder.add_node('classify', classify)
builder.add_node('refund', handle_refund)
builder.add_node('general', handle_general)
builder.add_edge(START, 'classify')
builder.add_conditional_edges('classify', route)
builder.add_edge('refund', END)              # every path reaches END
builder.add_edge('general', END)
graph = builder.compile()

graph.invoke({'ticket': 'I want my money back'}, {'recursion_limit': 10})`,
      },
      interview: "In LangGraph I model the agent as an explicit state machine: typed state, nodes that return partial state updates, and conditional edges for routing. Deterministic steps like validation and approval are their own nodes, every path can reach END, and the recursion limit is a backstop rather than the termination strategy.",
      check: [
        {
          id: "m9-s2-1", kind: "choice",
          prompt: "What’s the closest n8n equivalent of a LangGraph **conditional edge**?",
          options: [
            { text: "An IF or Switch node", why: "Yes. It looks at the data and chooses the next branch." },
            { text: "A Merge node", why: "Merge joins branches back together; it doesn’t choose between them." },
            { text: "A Loop Over Items node", why: "It repeats over a batch of items; it doesn’t pick a branch from the data." },
            { text: "An Execute Workflow node", why: "It always calls the same sub-workflow. No decision is made." },
          ],
          answer: 0,
          explain: "Conditional edge = routing decision based on the current state.",
        },
        {
          id: "m9-s2-2", kind: "choice",
          prompt: "A graph has edges `llm → tools` and `tools → llm`, but no route from `llm` to `END`. What happens?",
          options: [
            { text: "It loops until the recursion limit stops it and raises an error", why: "Right. With no exit, the safety net is the only thing that stops it." },
            { text: "It stops when the model gives a final answer without a tool call", why: "The only edge out of llm goes to tools, so even a final answer can’t reach END." },
            { text: "LangGraph adds an implicit END edge after the last node runs", why: "It doesn’t. You must design the exit yourself." },
            { text: "It runs forever, burning tokens until someone kills the process", why: "The recursion_limit stops it with an error first, which is why it exists." },
          ],
          answer: 0,
          explain: "Every path needs a way to END, plus a limit as backup.",
        },
        {
          id: "m9-s2-3", kind: "choice",
          prompt: "A node returns `{'category': 'refund'}`. What happens to the rest of the state?",
          options: [
            { text: "It stays as it was; only the `category` key is updated", why: "Yes. Nodes return updates, not a whole new state." },
            { text: "It’s replaced, so the state now holds only `category`", why: "Nodes return partial updates that are merged into the existing state." },
            { text: "Other keys reset to their default values for the next node", why: "Keys the node didn’t return are left untouched." },
            { text: "`category` is appended to a list of earlier categories", why: "Appending only happens for keys with a reducer like add_messages. Plain keys are overwritten." },
          ],
          answer: 0,
          explain: "Each node returns only what it changes. Plain keys like `category` are overwritten; list keys with a reducer like `add_messages` are appended to.",
        },
      ],
    },
    {
      title: "Checkpoints, memory and resuming after a crash",
      minutes: 7,
      body: [
        "**The problem.** An agent is halfway through a 10-step job when the server restarts for an update. Without saved progress, it starts again from scratch, or worse, repeats things it already did, like sending an email.",
        "LangGraph handles this with a [[checkpointer]]. After each step it saves a [[checkpoint]] of the state into a database. Each conversation or job gets a [[thread]] ID, like `ticket-42`. Run the graph again with the same thread ID and it carries on from the last saved checkpoint.",
        "In development, `InMemorySaver` keeps checkpoints in memory, so they vanish on restart. In production, use a database-backed one, such as the Postgres checkpointer.",
        "**The catch: a step can run twice.** A checkpoint is saved *after* a node finishes. If the process dies after a node sent the email but before its checkpoint saved, that node runs again on resume. So every side effect still needs an [[idempotency key]] (from the APIs module), e.g. `refund:ticket-42`, so the repeat is recognised and skipped.",
        "**Two kinds of memory:**",
        "- **[[Short-term memory]]**: the state of one thread: this ticket’s messages, tool results and pending action. The checkpointer handles it.\n- **[[Long-term memory]]**: facts kept across threads, e.g. “this customer prefers email”. LangGraph has a separate *store* for this, or you use your own table.",
        "Two rules. Memory is **not** your source of truth: order status lives in the order system, so read it fresh. And decide **retention** up front: how long threads and memories are kept, who can see them, and how they’re deleted when a customer asks. They often contain personal data.",
      ],
      example: {
        caption: "Saving progress in Postgres and resuming (pip install langgraph-checkpoint-postgres)",
        code: `from langgraph.checkpoint.postgres import PostgresSaver

with PostgresSaver.from_conn_string(DB_URL) as checkpointer:
    checkpointer.setup()                   # creates its tables (first run)
    graph = builder.compile(checkpointer=checkpointer)
    config = {'configurable': {'thread_id': 'ticket-42'}}

    graph.invoke({'ticket': '…'}, config)  # saves a checkpoint after each step

    # …process crashes and restarts…
    graph.invoke(None, config)             # None = no new input: resume ticket-42`,
      },
      interview: "I compile the graph with a durable checkpointer keyed by thread ID, so a run resumes from its last checkpoint after a restart. A node can re-execute if the process dies before its checkpoint is written, so every external side effect carries an idempotency key. Thread state is short-term memory; long-term memory lives in a separate store with defined retention, and neither replaces the system of record.",
      check: [
        {
          id: "m9-s3-1", kind: "choice",
          prompt: "You compiled your graph with `InMemorySaver`. After a server restart, every in-progress run is gone. Why?",
          options: [
            { text: "InMemorySaver lost them on restart; use a database-backed checkpointer", why: "Right. Durable resume needs durable storage." },
            { text: "The runs were resumed with new thread IDs instead of the old ones", why: "Even the right thread ID can’t find checkpoints that only existed in the stopped process’s memory." },
            { text: "Checkpoints are only saved when a run finishes, not part-way through", why: "A checkpoint is saved after every step. They were lost because they lived in memory." },
            { text: "LangGraph clears all threads on startup unless you call setup()", why: "setup() creates the Postgres tables. Nothing clears threads; these were never on disk." },
          ],
          answer: 0,
          explain: "InMemorySaver is for development. Production uses Postgres (or similar).",
        },
        {
          id: "m9-s3-2", kind: "choice",
          prompt: "After a crash and resume, a customer received two refund emails. What would have prevented it?",
          options: [
            { text: "An idempotency key on the email, so the repeat is skipped", why: "Yes. A node can run again on resume, so its side effects must be safe to repeat." },
            { text: "Saving a checkpoint before each node as well as after it", why: "There’s always a gap between sending and saving. A crash in that gap still repeats the send." },
            { text: "Resuming with a new thread ID so the old run is left alone", why: "A new thread starts the job from scratch, which repeats even more." },
            { text: "Setting temperature to 0 so the rerun makes the same decisions", why: "The duplicate comes from the node running again. The same decision just sends the same email again." },
          ],
          answer: 0,
          explain: "Checkpoints + idempotent side effects = safe resume.",
        },
        {
          id: "m9-s3-3", kind: "choice",
          prompt: "The agent tells a customer “your order is pending” using a memory from three days ago. It actually shipped yesterday. What’s the fix?",
          options: [
            { text: "Read the status live from the order system each time", why: "Right. Memory is context, not the system of record." },
            { text: "Save memories more often so they stay up to date", why: "It’s still a copy, and it can go stale between saves." },
            { text: "Add a timestamp to each memory so the model knows its age", why: "The model would know the memory is old, but still not know the current status." },
            { text: "Expire memories after 24 hours so stale ones are dropped", why: "Order status can change within hours. Any copy can be out of date." },
          ],
          answer: 0,
          explain: "Memory remembers; systems of record decide.",
        },
      ],
    },
    {
      title: "Human approval before irreversible actions",
      minutes: 6,
      body: [
        "**The problem.** Some actions can’t be undone: refunding money, emailing a customer list, deleting records. You don’t want a model doing those alone. So the agent **pauses**, a person approves or rejects, and it continues. That’s [[human-in-the-loop]].",
        "In LangGraph, a node calls `interrupt(...)` with what it wants approved. The run stops, the checkpointer saves its state, and your app shows the request to a person: in Slack, an n8n form or a dashboard. It can wait for hours. When they decide, you resume the same thread with `Command(resume=...)`, and `interrupt()` returns their answer.",
        "**Approve the exact action, not the idea.** The approval screen shows the tool, exact arguments and target: “Refund **$49.00** to order **1042**”, not “Agent wants to process a refund”. Then bind the approval to those values: store a fingerprint (hash) of the arguments with the approval, and just before executing check that they still match. If anything changed, ask again.",
        "Two details that catch people:",
        "- **On resume, the node runs again from its start**, not from the `interrupt` line. Anything before `interrupt` runs twice, so don’t put side effects there.\n- **Approval doesn’t replace other checks.** The tool still checks permissions and limits in code after a human clicks “Approve”.",
        "Where you can, prefer **drafts**: the agent prepares the email or refund, and a person sends it.",
      ],
      example: {
        caption: "Pausing for approval in LangGraph (needs a checkpointer)",
        code: `import hashlib, json
from langgraph.types import interrupt, Command

hash_of = lambda a: hashlib.sha256(json.dumps(a, sort_keys=True).encode()).hexdigest()  # not hash(): it changes every time the process restarts

def approve_refund(state):
    action = {'tool': 'issue_refund',
              'order_id': state['order_id'],
              'amount_cents': state['amount_cents']}
    decision = interrupt(action)        # pause; your app shows 'action' to a person
    if not decision['approved']:
        return {'status': 'rejected'}
    if decision['action_hash'] != hash_of(action):   # approved something different?
        return {'status': 'needs_new_approval'}
    return {'approved_action': action}

# later, when the person clicks Approve:
graph.invoke(Command(resume={'approved': True, 'action_hash': h}), config)`,
      },
      interview: "I put an interrupt before every irreversible write, persist the proposed tool call, and show the reviewer the exact tool, arguments and target. The approval is bound to a hash of those arguments and re-verified at execution; any change requires re-approval. Because the node re-executes on resume, nothing with side effects runs before the interrupt, and server-side authorisation still applies after approval.",
      check: [
        {
          id: "m9-s4-1", kind: "choice",
          prompt: "Your approval message in Slack says “The agent wants to send an email. Approve?”. What’s wrong?",
          options: [
            { text: "It hides the recipient and content, so there’s nothing to judge", why: "Right. Approvers must see the exact tool and arguments." },
            { text: "Emails can be corrected later, so this step doesn’t need approval", why: "A sent email can’t be unsent. External sends are a classic approval case." },
            { text: "Approvals belong in a dashboard, not Slack, for audit reasons", why: "Slack is fine if the message shows the exact action. Where isn’t the problem." },
            { text: "It should include the agent’s reasoning so the person can trust it", why: "Reasoning without the exact recipient and content still doesn’t let them judge the action." },
          ],
          answer: 0,
          explain: "Approve the exact action, not a vague description of it.",
        },
        {
          id: "m9-s4-2", kind: "choice",
          prompt: "A node posts a Slack notification, then calls `interrupt()`. After the person approves, Slack shows a second identical notification. Why?",
          options: [
            { text: "On resume the node reruns from its start, repeating the post", why: "Yes. Keep side effects out of the code before interrupt, or make them idempotent." },
            { text: "The checkpoint wasn’t saved, so the whole graph restarted", why: "The graph resumed correctly. Only the interrupted node re-ran, which is normal." },
            { text: "Slack retried the post because the first request timed out", why: "The duplicate came from your node running twice, not from Slack." },
            { text: "Command(resume=...) replays every node since the thread started", why: "Only the interrupted node re-runs. Nodes that already finished aren’t replayed." },
          ],
          answer: 0,
          explain: "Resume re-runs the interrupted node from the top.",
        },
        {
          id: "m9-s4-3", kind: "choice",
          prompt: "A person approved a $49 refund. Before it runs, the state now says $490. What should happen?",
          options: [
            { text: "The fingerprint no longer matches, so ask for approval again", why: "Right. Approval is bound to the exact arguments." },
            { text: "Run it at $490, since the person already approved this refund", why: "The approval was for $49, not $490." },
            { text: "Refund the approved $49 and log the change for later review", why: "Quietly running a different action from what the state says isn’t safe either. Re-approve." },
            { text: "Let the model compare both amounts and pick the correct one", why: "The model can’t authorise its own action." },
          ],
          answer: 0,
          explain: "Changed arguments = new approval.",
        },
      ],
    },
    {
      title: "Limits, and testing which tools the agent picks",
      minutes: 6,
      body: [
        "**The problem.** Agents get stuck: calling the same search over and over, or wandering for 40 steps. Every step is an LLM call, so a stuck agent burns money and time, and may repeat actions.",
        "Put hard limits **in code**, checked on every step:",
        "- **Max steps**: e.g. 10 tool calls, then stop and hand over to a human. LangGraph’s `recursion_limit` is the backstop.\n- **Timeouts**: a deadline for the whole run, plus a [[timeout]] on each tool call.\n- **Token and cost budget**: count usage per run; stop when it’s used up.\n- **Loop detection**: the same tool with the same arguments three times in a row? Stop.",
        "When a limit trips, end cleanly: save the state, mark the run “needs human”, and log which limit fired.",
        "**Evaluating tool selection.** Agents fail quietly by picking the wrong tool, inventing arguments, or acting when they should ask. Build a labelled set of **at least 30 tasks**, each with the expected tool and key arguments, or “no tool, ask a question”. Run it with tools not really executing (or on test data) and measure:",
        "- **[[Tool-selection accuracy]]**: share of tasks where it chose the right tool.\n- **Argument accuracy**: right order ID, right amount.\n- **Unnecessary calls**: tools used when none was needed.\n- **Which tools it confuses**, e.g. `get_order` vs `get_invoice`. That usually means the descriptions need to be clearer.",
        "Re-run the set after every prompt, tool-description or model change.",
      ],
      example: {
        caption: "Part of a tool-selection eval",
        code: `task                            expected                 agent chose            ok?
"Where's order 1042?"           get_order('1042')        get_order('1042')      ✅
"Refund my invoice"             ask: which invoice?      issue_refund(...)      ❌ guessed
"What's your returns policy?"   search_docs(...)         get_order(?)           ❌ wrong tool
"Change my email to ana@x.com"  update_contact(...)      update_contact(...)    ✅

tool-selection accuracy: 2/4 = 50%  → fix descriptions, re-run`,
      },
      interview: "Every run has a step cap, a wall-clock timeout, per-tool timeouts, a token and cost budget, and loop detection on repeated identical calls, and hitting any of them ends in a defined handoff state. I evaluate tool selection offline on a labelled task set, scoring tool choice, argument correctness and unnecessary calls, and re-run it on every prompt or model change.",
      check: [
        {
          id: "m9-s5-1", kind: "choice",
          prompt: "A run log shows `search_docs(query='refund')` called six times in a row with identical arguments. Which limit should have stopped it?",
          options: [
            { text: "Loop detection on repeated identical calls", why: "Right. Same tool, same arguments, again and again = stuck." },
            { text: "A per-tool timeout on each search_docs call", why: "Each call may have been quick. The problem is repetition." },
            { text: "A higher recursion_limit so the graph can finish", why: "A higher limit lets a stuck run go on longer." },
            { text: "A nightly tool-selection eval on live runs", why: "Evals are offline tests. They don’t stop a live run." },
          ],
          answer: 0,
          explain: "Detect repeats in code and end the run with a clear handoff.",
        },
        {
          id: "m9-s5-2", kind: "choice",
          prompt: "Your agent chose the right tool on 24 of 30 labelled tasks. What’s its tool-selection accuracy?",
          options: [
            { text: "80%", why: "Right: 24 ÷ 30." },
            { text: "20%", why: "That’s the share it got wrong: 6 ÷ 30." },
            { text: "24%", why: "That’s the count of correct tasks, not the share." },
            { text: "Too few tasks to say", why: "30 labelled tasks is a reasonable minimum. Any labelled set gives a figure." },
          ],
          answer: 0,
          explain: "Then look at the 6 failures: which tools did it confuse?",
        },
        {
          id: "m9-s5-3", kind: "choice",
          prompt: "Most failures are the agent choosing `get_invoice` when it should choose `get_order`. What’s the best first fix?",
          options: [
            { text: "Clarify both tool descriptions, then re-run the eval", why: "Yes. Confused pairs usually mean unclear descriptions. Measure before and after." },
            { text: "Switch to a larger model, which reasons about tools better", why: "Try the cheap fix first, and measure. A bigger model may still confuse unclear tools." },
            { text: "Merge them into one get_record tool that handles both", why: "A broader tool is harder to validate and secure, and hides the confusion." },
            { text: "Add a prompt line: “prefer get_order over get_invoice”", why: "That biases every choice towards one tool, so real invoice questions now fail." },
          ],
          answer: 0,
          explain: "Tool descriptions are prompts too. Measure before and after.",
        },
      ],
    },
    {
      title: "MCP: a standard plug for AI tools",
      minutes: 7,
      body: [
        "**The problem.** Every AI app (Claude Desktop, ChatGPT, Cursor, your own agent) used to need custom code to connect to each tool: your CRM, Google Drive, a database. Ten apps × ten tools = a hundred integrations.",
        "[[MCP]] (Model Context Protocol) is an open standard for that connection. Build an MCP server for your CRM once, and any app that supports MCP can use it. **The analogy:** USB-C for AI tools.",
        "Three roles:",
        "- **[[MCP host|Host]]**: the AI app the user works in, e.g. Claude Desktop or your agent.\n- **[[MCP client|Client]]**: the connector inside the host; one per server connection.\n- **[[MCP server|Server]]**: the program offering capabilities, e.g. a CRM server.",
        "A server can offer three kinds of things:",
        "- **Tools**: actions the model can call, e.g. `create_contact`.\n- **Resources**: data the app can read into context, like a file or record, identified by a URI.\n- **Prompts**: reusable prompt templates a user can pick, e.g. “summarise this account”.",
        "**[[Transport|Transports]].** **stdio**: the host starts the server as a local program on the same computer. **Streamable HTTP**: the server runs remotely, so a whole team can share it. Messages use [[JSON-RPC]] either way. The older HTTP+SSE transport is deprecated in favour of Streamable HTTP.",
        "**Securing a remote server.** The spec bases remote authorisation on [[OAuth]]: the client gets an [[access token]] for the user and sends it with each request, and the server checks the token was issued *for this server*. Remote servers publish **Protected Resource Metadata** (a small file saying which login server to use), and clients request tokens for that specific server. The server shouldn’t forward that token to other APIs; it uses its own credentials for those.",
        "**MCP is a plug, not a security guard.** Everything in this module still applies: narrow tools, permission checks in server code, validation and approval for writes, logging.",
      ],
      example: {
        caption: "A tiny MCP server with a read tool and a protected write tool (official Python SDK)",
        code: `from mcp.server.fastmcp import FastMCP

mcp = FastMCP('crm')

@mcp.tool()
def get_contact(email: str) -> dict:
    """Read-only: look up a CRM contact by email."""
    return crm.find_contact(email)

@mcp.tool()
def update_stage(contact_id: str, stage: str) -> dict:
    """Write: move a contact to a pipeline stage."""
    if stage not in ALLOWED_STAGES:        # validate in code
        raise ValueError('unknown stage')
    require_permission('crm:write')        # your own check, not the prompt
    return crm.set_stage(contact_id, stage)

if __name__ == '__main__':
    mcp.run()    # stdio by default: a local host starts this program`,
      },
      interview: "MCP standardises how a host’s clients discover and call a server’s tools, resources and prompts over JSON-RPC, using stdio locally or Streamable HTTP remotely. For remote servers, authorisation follows the spec’s OAuth-based model: the server validates access tokens issued for it and doesn’t pass them through to upstream APIs. MCP doesn’t replace authorisation, so write tools still enforce permissions, validation and approval server-side.",
      check: [
        {
          id: "m9-s6-1", kind: "choice",
          prompt: "Your MCP server offers a company’s price list for the app to load into context, read by a URI. What kind of capability is that?",
          options: [
            { text: "A resource", why: "Right. Resources are data the app reads into context, identified by a URI." },
            { text: "A tool", why: "Tools are actions the model calls, like create_contact." },
            { text: "A prompt", why: "Prompts are reusable templates a user picks, not data." },
            { text: "A transport", why: "Transports are how messages travel, not what’s offered." },
          ],
          answer: 0,
          explain: "Tools = actions, resources = data, prompts = templates.",
        },
        {
          id: "m9-s6-2", kind: "choice",
          prompt: "You want one MCP server that your whole team’s AI apps can use over the internet. Which transport?",
          options: [
            { text: "Streamable HTTP", why: "Yes. It’s for remote servers shared over the network." },
            { text: "stdio, run on a shared server", why: "stdio means the host starts the server as a local program. Others can’t connect to it." },
            { text: "The older HTTP+SSE transport", why: "It’s deprecated in favour of Streamable HTTP. Don’t build new servers on it." },
            { text: "stdio over the office VPN", why: "stdio is a local pipe between two programs on one computer, not a network connection." },
          ],
          answer: 0,
          explain: "Local = stdio. Remote = Streamable HTTP, secured with OAuth-based authorisation.",
        },
        {
          id: "m9-s6-3", kind: "choice",
          prompt: "A colleague says “Our CRM is behind an MCP server, so the agent can only do safe things.” Is that right?",
          options: [
            { text: "No. MCP is just a plug; the server must still enforce limits", why: "Right. Permission checks, validation and approvals stay in your server code." },
            { text: "Yes. MCP hosts ask the user before any tool runs, so it’s safe", why: "Some hosts ask, but not all, people click through, and your own agent may not ask at all." },
            { text: "Yes, if it runs over stdio, because it stays on one computer", why: "Local doesn’t mean safe. A local tool can still delete data." },
            { text: "Yes, because remote MCP uses OAuth to authorise each request", why: "OAuth proves who’s calling; it doesn’t decide what each tool call may do." },
          ],
          answer: 0,
          explain: "Authorisation and validation are still your job inside the server.",
        },
      ],
    },
  ],
  quiz: [
    {
      id: "m9-q1", kind: "choice",
      prompt: "A client wants AI to process invoices: read the PDF, extract fields, check the PO number, post to Xero. The steps never change. What do you build?",
      options: [
            { text: "A workflow with an LLM extraction step, plus validation in code", why: "Yes. The path is fixed, so an agent adds cost and unpredictability." },
            { text: "A single agent with Xero tools, so it can adapt to unusual invoices", why: "Unusual invoices need validation and a review route, not a model choosing the steps." },
            { text: "A multi-agent system: one to extract, one to check, one to post", why: "Several agents for a fixed path is more cost and much harder to debug." },
            { text: "An agent, but with a strict step limit to keep it predictable", why: "A limit bounds cost, but the model still chooses a path that never needs choosing." },
          ],
      answer: 0,
      explain: "Use an agent only when the next step depends on what the model finds.",
    },
    {
      id: "m9-q2", kind: "choice",
      prompt: "Spot the security bug in this tool.",
      code: "def get_invoices(args, session):\n    customer_id = args['customer_id']\n    return db.invoices_for(customer_id)",
      options: [
            { text: "It takes the customer_id from the model, not from the session", why: "Right. A fooled model could read any customer’s invoices." },
            { text: "It doesn’t validate customer_id against a JSON Schema first", why: "C-999 would pass a format check. Ownership is the bug." },
            { text: "It returns every invoice field instead of only the ones needed", why: "Worth fixing, but the identity bug is the serious one." },
            { text: "It needs try/except so database errors don’t reach the model", why: "Good error handling, but it doesn’t close the security hole." },
          ],
      answer: 0,
      explain: "Use `session.customer_id`, and check the record belongs to that customer.",
    },
    {
      id: "m9-q3", kind: "choice",
      prompt: "In LangGraph, what is the **state**?",
      options: [
            { text: "The shared record of the run that every node reads and updates", why: "Yes. Inputs, messages, tool results and pending actions live here." },
            { text: "The model’s chat history, which LangGraph sends with each call", why: "Messages are often one key in the state, but it also holds tool results, pending actions and more." },
            { text: "The structure of nodes and edges you defined with the builder", why: "That’s the graph. State is the data moving through it." },
            { text: "The settings passed at run time, like thread_id and recursion_limit", why: "Those are run config, not state." },
          ],
      answer: 0,
      explain: "State is what the checkpointer saves after each step.",
    },
    {
      id: "m9-q4", kind: "choice",
      prompt: "Your process crashed mid-run. What do you need to resume that run where it stopped?",
      options: [
            { text: "A persistent checkpointer, and the same thread ID as before", why: "Right. Invoke again with that thread ID and it continues from the last checkpoint." },
            { text: "A persistent checkpointer and a fresh thread ID for the retry", why: "A new thread ID starts a brand-new run." },
            { text: "The original input, passed to invoke again from the start", why: "That starts from scratch and may repeat finished steps." },
            { text: "InMemorySaver, as long as the server restarts quickly", why: "In-memory checkpoints are gone the moment the process stops, however fast it restarts." },
          ],
      answer: 0,
      explain: "Thread ID = which run. Checkpointer = where its progress lives.",
    },
    {
      id: "m9-q5", kind: "choice",
      prompt: "Your final proof: kill the process mid-run, restart, resume. What must be true for the test to pass?",
      options: [
            { text: "It finishes, and no email, refund or CRM write happens twice", why: "Yes. Resume plus idempotent side effects." },
            { text: "It restarts from the first step and completes without errors", why: "Restarting from scratch is what you’re avoiding, and it can repeat actions." },
            { text: "The model produces exactly the same final reply as the first run", why: "Wording can vary. What matters is no duplicate effects." },
            { text: "Every node runs exactly once, including the one that crashed", why: "The interrupted node may legitimately run again. Its side effects must be idempotent." },
          ],
      answer: 0,
      explain: "Durable state + idempotency keys = recovery without duplicates.",
    },
    {
      id: "m9-q6", kind: "choice",
      prompt: "Which approval request is best?",
      options: [
            { text: "“issue_refund: order 1042, $49.00 to card ending 4421. Approve?”", why: "Yes. Exact tool, target and amount." },
            { text: "“Agent recommends a refund for order 1042 (high confidence). Approve?”", why: "How much, and to where? Confidence isn’t the details." },
            { text: "“Refund $49.00? The agent explains its reasoning below. Approve?”", why: "Which order, and where does the money go? Reasoning doesn’t replace exact arguments." },
            { text: "No pause; refunds run at once and are listed in a daily review report", why: "Reviewing after the fact isn’t approval for an action that can’t be undone." },
          ],
      answer: 0,
      explain: "Show exact arguments, and bind the approval to them.",
    },
    {
      id: "m9-q7", kind: "choice",
      prompt: "A customer said three weeks ago that they prefer phone calls. Where should the agent keep that fact so it’s available in new conversations?",
      options: [
            { text: "Long-term memory shared across threads, with a retention rule", why: "Right. It must outlive one conversation, and personal data needs a retention rule." },
            { text: "The thread’s short-term state, which the checkpointer keeps safe", why: "That belongs to one conversation and won’t be there in a new one." },
            { text: "The shared system prompt, so every conversation can see it", why: "That would apply one customer’s preference to everyone." },
            { text: "The chat history, by resending all old threads in each new one", why: "Slow, costly and growing forever. Store the fact itself, once." },
          ],
      answer: 0,
      explain: "Short-term = this thread. Long-term = across threads, with defined retention.",
    },
    {
      id: "m9-q8", kind: "choice",
      prompt: "A weekend agent run made 300 LLM calls and cost far more than expected. Which set of controls was missing?",
      options: [
            { text: "Max steps, a run timeout, a token/cost budget and loop detection", why: "Yes. Each would have stopped it early." },
            { text: "A system prompt telling the agent to finish in as few steps as possible", why: "Prompts don’t enforce limits. A confused model will still wander." },
            { text: "A cheaper, faster model so each of the 300 calls costs less", why: "That cuts the price per call, but nothing stops the runaway." },
            { text: "Retries with exponential backoff on every failing LLM call", why: "Backoff handles temporary errors. It doesn’t stop a loop, and can add calls." },
          ],
      answer: 0,
      explain: "Limits are enforced in code and end in a clear handoff state.",
    },
    {
      id: "m9-q9", kind: "choice",
      prompt: "In your eval, a customer with five invoices says “refund my invoice” without saying which. The agent calls `issue_refund`. What should the label have been?",
      options: [
            { text: "No tool yet: ask the customer which invoice", why: "Right. Acting on a guess is a failure, even with a valid tool." },
            { text: "issue_refund on the most recent invoice", why: "That guesses on a money action." },
            { text: "get_invoice, then issue_refund on whichever matches best", why: "It still guesses which invoice the customer meant." },
            { text: "issue_refund, since approval will catch a wrong pick", why: "Approval is a safety net, not a substitute. The label should be the correct behaviour." },
          ],
      answer: 0,
      explain: "Include “ask a question” cases in tool-selection evals.",
    },
    {
      id: "m9-q10", kind: "choice",
      prompt: "In MCP, which is the **host**?",
      options: [
            { text: "Claude Desktop, the app the user is working in", why: "Yes. The host contains one client per server connection." },
            { text: "The CRM MCP server, since it hosts the tools", why: "That’s a server. It offers tools; it isn’t the host." },
            { text: "The connector inside the app that links to one server", why: "That’s a client." },
            { text: "The cloud machine where the remote server is deployed", why: "That’s infrastructure. “Host” in MCP means the AI app the user works in." },
          ],
      answer: 0,
      explain: "Host (the app) → clients (connections) → servers (capabilities).",
    },
    {
      id: "m9-q11", kind: "choice",
      prompt: "A remote MCP server receives a user’s access token. It needs to call the HubSpot API. What should it do?",
      options: [
            { text: "Validate the token, then call HubSpot with its own credentials", why: "Right. Check the token was issued for this server, and don’t pass it on." },
            { text: "Forward the user’s token to HubSpot so actions run as that user", why: "Token passthrough is forbidden by the MCP spec: that token was issued for your server, not HubSpot." },
            { text: "Accept the token without checks, since the client already verified it", why: "The server must validate every token itself. MCP defines how; it doesn’t do it for you." },
            { text: "Ask the user to paste their HubSpot API key into the chat", why: "Credentials never go through the conversation or the model." },
          ],
      answer: 0,
      explain: "Remote MCP authorisation is OAuth-based, and tokens are for the server they were issued to.",
    },
    {
      id: "m9-q12", kind: "order",
      prompt: "Order the safe path for a refund the agent proposes.",
      items: ["The model proposes issue_refund with arguments", "Code validates the arguments and the user’s permissions", "The graph interrupts and a person approves the exact arguments", "Code checks the arguments still match the approval", "The refund runs with an idempotency key"],
      explain: "Propose → validate → approve → re-check → execute safely.",
    },
  ],
  tasks: [
    { device: "phone", plain: "Learn when to use an agent and when a fixed workflow is better.", done: "You can name two tasks that need an agent and two that don’t, and you’ve passed the Lesson 1 check." },
    { device: "phone", plain: "Learn the tool loop (ReAct): the model asks for a tool, your code runs it, the result goes back. Learn why every call should be logged.", done: "You can draw the loop from memory and say where your code gets control." },
    { device: "computer", plain: "Build three narrow tools with JSON Schemas, each checking permissions in server code using the logged-in user.", done: "A test shows a tool refusing a request for another customer’s data, even when the model asks for it." },
    { device: "phone", plain: "Learn LangGraph’s building blocks: state, nodes, edges, conditional routing and END.", done: "You can sketch a graph for a support agent with a clear exit, and you’ve passed the Lesson 3 check." },
    { device: "computer", plain: "Save LangGraph checkpoints in Postgres and resume a run after restarting the process.", done: "A run stopped mid-way continues from its last step after a restart, using the same thread ID." },
    { device: "computer", plain: "Add a human approval pause (interrupt) before any action that can’t be undone.", done: "A demo where the agent pauses, shows the exact action, and continues only after approval." },
    { device: "phone", plain: "Learn the difference between short-term thread memory and long-term memory, and write a retention rule for each.", done: "A short note saying what each stores, for how long, and how it’s deleted." },
    { device: "computer", plain: "Add a step limit, a timeout, a token/cost budget and loop detection to your agent.", done: "A test run hits each limit and ends cleanly in a “needs human” state, with the limit logged." },
    { device: "computer", plain: "Test which tools the agent picks on at least 30 labelled tasks.", done: "A results table with tool-selection accuracy and the most-confused tool pairs." },
    { device: "phone", plain: "Learn the MCP basics: host, client, server; tools, resources and prompts; stdio and Streamable HTTP.", done: "You can explain each in one sentence, and you’ve passed the Lesson 7 check." },
    { device: "computer", plain: "Build a small MCP server with one read tool and one write tool, and protect the write tool with checks in code.", done: "The server works from an MCP host, and the write tool refuses invalid or unauthorised requests." },
    { device: "phone", plain: "Learn how a remote MCP server is secured: OAuth-based access tokens issued for that server, and no passing tokens on.", done: "You can explain in three sentences how a remote MCP server knows who is calling and what they may do." },
    { device: "computer", plain: "Make plain code check every proposed side effect (amount, target, ownership) before a tool runs.", done: "Tests show invalid proposals are rejected before any external call is made." },
    { device: "computer", plain: "Kill the process mid-run, restart it, resume, and prove the same external action didn’t happen twice.", done: "Logs or database rows show one action only, with its idempotency key, after the crash and resume." },
  ],
};
