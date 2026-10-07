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
            { text: "Investigating a delayed shipment across several systems, where each check depends on the last result", why: "Right. The path isn’t known in advance." },
            { text: "Sending a welcome email to every new sign-up", why: "Fixed steps: a workflow does this cheaper and more reliably." },
            { text: "Copying new Stripe invoices into a Google Sheet", why: "A predictable path. No decisions for a model to make." },
            { text: "Posting a sales summary to Slack at 9am daily", why: "A scheduled workflow, possibly with one LLM step to write the summary." },
          ],
          answer: 0,
          explain: "If you can draw it as a flowchart, build a workflow.",
        },
        {
          id: "m9-s0-2", kind: "choice",
          prompt: "In the tool loop, who actually runs the tool?",
          options: [
            { text: "Your code, after the model asks for it", why: "Yes. The model only proposes a tool call; your code decides and executes." },
            { text: "The model, directly", why: "Models produce text. They can’t execute anything themselves." },
            { text: "The model provider’s servers, automatically", why: "For your own tools, the call comes back to your code to run." },
            { text: "The end user", why: "The user gives the goal; your code runs the tools." },
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
            { text: "A confused or manipulated model can read or change anything the database user can", why: "Right. Replace it with narrow tools like get_order(order_id)." },
            { text: "SQL is too slow for agents", why: "Speed isn’t the concern; unlimited power is." },
            { text: "The model can’t write SQL", why: "It often can. That’s exactly why it’s dangerous." },
            { text: "There’s no risk if the prompt says “read-only queries only”", why: "A prompt is a request, not a permission system." },
          ],
          answer: 0,
          explain: "Narrow tools limit what a mistake can do.",
        },
        {
          id: "m9-s1-2", kind: "choice",
          prompt: "A user logged in as customer C-123 gets the agent to call `get_invoices(customer_id='C-999')`. Where should this be stopped?",
          options: [
            { text: "In the tool’s server code, which takes the customer from the login session and refuses others", why: "Yes. Identity comes from the session, not from the model’s arguments." },
            { text: "In the system prompt", why: "Prompts can be ignored or overridden. Enforcement must be in code." },
            { text: "By asking the model to double-check", why: "The model isn’t a security boundary." },
            { text: "It can’t be stopped; agents are unpredictable", why: "The tool code can always refuse. That’s why the check lives there." },
          ],
          answer: 0,
          explain: "Never trust identifiers the model supplies for authorisation.",
        },
        {
          id: "m9-s1-3", kind: "choice",
          prompt: "The prompt says “never refund more than $100”. Is that enough to stop a $5,000 refund?",
          options: [
            { text: "No. The refund tool must check the amount in code before running", why: "Right. Code enforces the limit even if the model is fooled." },
            { text: "Yes, models follow their instructions", why: "Usually, not always. Manipulation and mistakes happen." },
            { text: "Yes, if you write it in capital letters", why: "Emphasis doesn’t turn a prompt into a guarantee." },
            { text: "Only if you use a bigger model", why: "No model is a reliable enforcement layer." },
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
        "An agent in LangGraph is usually a loop: an *LLM node* decides; a conditional edge sends it to a *tools node* if it asked for a tool, or to `END` if it’s done; the tools node goes back to the LLM node. Because you drew it, you can add a rule, an approval step or a limit anywhere.",
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
            { text: "A Webhook trigger", why: "A trigger starts a workflow; it doesn’t choose a branch." },
            { text: "A Set node", why: "Set changes data; it doesn’t route." },
            { text: "A credential", why: "Credentials store secrets, not routing logic." },
          ],
          answer: 0,
          explain: "Conditional edge = routing decision based on the current state.",
        },
        {
          id: "m9-s2-2", kind: "choice",
          prompt: "A graph has edges `llm → tools` and `tools → llm`, but no route from `llm` to `END`. What happens?",
          options: [
            { text: "It loops until it hits the recursion limit and stops with an error", why: "Right. With no exit, the safety net is the only thing that stops it." },
            { text: "It stops when the model feels finished", why: "Without a route to END, the graph can’t finish normally." },
            { text: "It runs once and stops", why: "The edges form a loop, so it keeps going." },
            { text: "LangGraph adds an END edge automatically", why: "You must design the exit yourself." },
          ],
          answer: 0,
          explain: "Every path needs a way to END, plus a limit as backup.",
        },
        {
          id: "m9-s2-3", kind: "choice",
          prompt: "A node returns `{'category': 'refund'}`. What happens to the rest of the state?",
          options: [
            { text: "It stays as it was; only `category` is updated", why: "Yes. Nodes return updates, not a whole new state." },
            { text: "Everything else is deleted", why: "Nodes return partial updates that are merged into the state." },
            { text: "The graph restarts", why: "Returning an update just moves the run forward." },
            { text: "It causes an error because other keys are missing", why: "Partial updates are the normal pattern." },
          ],
          answer: 0,
          explain: "Each node reads the state and returns only what it changes.",
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
            { text: "In-memory checkpoints disappear when the process stops; use a database-backed checkpointer", why: "Right. Durable resume needs durable storage." },
            { text: "You used the wrong thread IDs", why: "Even correct thread IDs can’t find checkpoints that were never saved to disk." },
            { text: "LangGraph can’t resume runs", why: "It can, with a persistent checkpointer." },
            { text: "The restart corrupted the database", why: "The checkpoints were never in a database." },
          ],
          answer: 0,
          explain: "InMemorySaver is for development. Production uses Postgres (or similar).",
        },
        {
          id: "m9-s3-2", kind: "choice",
          prompt: "After a crash and resume, a customer received two refund emails. What would have prevented it?",
          options: [
            { text: "An idempotency key on the email step, so the repeat is recognised and skipped", why: "Yes. A node can run again on resume, so its side effects must be safe to repeat." },
            { text: "Saving checkpoints more often", why: "There’s always a gap between the action and the checkpoint." },
            { text: "Using a bigger model", why: "The model isn’t involved in this duplicate." },
            { text: "Removing the checkpointer", why: "Then the whole run would start again and repeat even more." },
          ],
          answer: 0,
          explain: "Checkpoints + idempotent side effects = safe resume.",
        },
        {
          id: "m9-s3-3", kind: "choice",
          prompt: "The agent tells a customer “your order is pending” using a memory from three days ago. It actually shipped yesterday. What’s the fix?",
          options: [
            { text: "Read live business data from the order system; don’t treat memory as the truth", why: "Right. Memory is context, not the system of record." },
            { text: "Keep memories for longer", why: "Older memories would be even more out of date." },
            { text: "Delete all memory", why: "Memory is useful for preferences; it just shouldn’t replace live data." },
            { text: "Tell the model to be careful", why: "The model can’t know data changed unless it reads fresh data." },
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
        code: `from langgraph.types import interrupt, Command

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
            { text: "It doesn’t show the exact recipient, content and tool, so the person can’t judge it", why: "Right. Approvers must see the exact arguments." },
            { text: "Slack isn’t allowed for approvals", why: "Slack is fine. The content of the request is the problem." },
            { text: "Emails never need approval", why: "Some do, e.g. bulk or external sends." },
            { text: "It should approve automatically after an hour", why: "That defeats the purpose of approval." },
          ],
          answer: 0,
          explain: "Approve the exact action, not a vague description of it.",
        },
        {
          id: "m9-s4-2", kind: "choice",
          prompt: "A node posts a Slack notification, then calls `interrupt()`. After the person approves, Slack shows a second identical notification. Why?",
          options: [
            { text: "On resume, the node runs again from its start, so the post before interrupt repeats", why: "Yes. Keep side effects out of the code before interrupt, or make them idempotent." },
            { text: "Slack sends duplicates", why: "The duplicate came from your node running twice." },
            { text: "The checkpointer is broken", why: "This is normal resume behaviour." },
            { text: "The person clicked Approve twice", why: "The double post happens even with one click." },
          ],
          answer: 0,
          explain: "Resume re-runs the interrupted node from the top.",
        },
        {
          id: "m9-s4-3", kind: "choice",
          prompt: "A person approved a $49 refund. Before it runs, the state now says $490. What should happen?",
          options: [
            { text: "The argument fingerprint no longer matches, so ask for approval again", why: "Right. Approval is bound to exact arguments." },
            { text: "Run it; it was already approved", why: "The approval was for $49, not $490." },
            { text: "Refund $49 and ignore the change", why: "Silently changing the action isn’t safe either. Re-approve." },
            { text: "Let the model decide which amount is right", why: "The model can’t authorise its own action." },
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
"Refund my last invoice"        ask: which invoice?      issue_refund(...)      ❌ guessed
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
            { text: "A per-tool timeout", why: "Each call may have been quick; the problem is repetition." },
            { text: "A smaller eval set", why: "Evals are offline tests; they don’t stop live runs." },
            { text: "A longer system prompt", why: "Limits belong in code, not prompts." },
          ],
          answer: 0,
          explain: "Detect repeats in code and end the run with a clear handoff.",
        },
        {
          id: "m9-s5-2", kind: "choice",
          prompt: "Your agent chose the right tool on 24 of 30 labelled tasks. What’s its tool-selection accuracy?",
          options: [
            { text: "80%", why: "Right: 24 ÷ 30." },
            { text: "24%", why: "That’s the count, not the share." },
            { text: "6%", why: "6 is the number it got wrong." },
            { text: "You need 100 tasks to calculate it", why: "Any labelled set works; 30 is a reasonable minimum." },
          ],
          answer: 0,
          explain: "Then look at the 6 failures: which tools did it confuse?",
        },
        {
          id: "m9-s5-3", kind: "choice",
          prompt: "Most failures are the agent choosing `get_invoice` when it should choose `get_order`. What’s the best first fix?",
          options: [
            { text: "Make both tool descriptions clearer about when to use each, then re-run the eval", why: "Yes. Confused pairs usually mean unclear descriptions." },
            { text: "Remove get_order", why: "Then order questions can’t be answered at all." },
            { text: "Switch to a different model immediately", why: "Try the cheap fix first and measure." },
            { text: "Add more steps to the limit", why: "More steps don’t fix the wrong choice." },
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
        "**[[Transport|Transports]].** **stdio**: the host starts the server as a local program on the same computer. **Streamable HTTP**: the server runs remotely, so a whole team can share it. Messages use [[JSON-RPC]] either way.",
        "**Securing a remote server.** The spec bases remote authorisation on [[OAuth]]: the client gets an [[access token]] for the user and sends it with each request, and the server checks the token was issued *for this server*. The server shouldn’t forward that token to other APIs; it uses its own credentials for those.",
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
            { text: "A resource", why: "Right. Resources are data the app reads into context." },
            { text: "A tool", why: "Tools are actions the model calls, like create_contact." },
            { text: "A prompt", why: "Prompts are reusable templates, not data." },
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
            { text: "stdio", why: "stdio runs a local program on the same computer as the host." },
            { text: "Email", why: "MCP doesn’t use email as a transport." },
            { text: "A webhook", why: "MCP defines its own transports; this one is Streamable HTTP." },
          ],
          answer: 0,
          explain: "Local = stdio. Remote = Streamable HTTP, secured with OAuth-based authorisation.",
        },
        {
          id: "m9-s6-3", kind: "choice",
          prompt: "A colleague says “Our CRM is behind an MCP server, so the agent can only do safe things.” Is that right?",
          options: [
            { text: "No. MCP standardises the connection; the server still needs permission checks, validation and approvals", why: "Right. MCP is a plug, not a security guard." },
            { text: "Yes. MCP blocks dangerous actions automatically", why: "It doesn’t judge what’s dangerous. Your server code must." },
            { text: "Yes, if the server uses stdio", why: "Local doesn’t mean safe. A local tool can still delete data." },
            { text: "Yes, because MCP uses OAuth", why: "OAuth proves who’s calling; it doesn’t decide what each tool call may do." },
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
        { text: "A multi-agent system", why: "Several agents for a fixed path is overkill and harder to debug." },
        { text: "A single agent with access to Xero", why: "There are no decisions that need an agent." },
        { text: "Nothing; invoices can’t be automated", why: "They can, reliably, with a workflow." },
      ],
      answer: 0,
      explain: "Use an agent only when the next step depends on what the model finds.",
    },
    {
      id: "m9-q2", kind: "choice",
      prompt: "Spot the security bug in this tool.",
      code: "def get_invoices(args, session):\n    customer_id = args['customer_id']\n    return db.invoices_for(customer_id)",
      options: [
        { text: "It trusts the model’s customer_id instead of the logged-in session", why: "Right. A fooled model could read any customer’s invoices." },
        { text: "It should return fewer fields", why: "Worth doing, but the identity bug is the serious one." },
        { text: "The function name is too long", why: "Names don’t affect security." },
        { text: "Nothing; the model chose the customer", why: "The model must never decide who the user is." },
      ],
      answer: 0,
      explain: "Use `session.customer_id`, and check the record belongs to that customer.",
    },
    {
      id: "m9-q3", kind: "choice",
      prompt: "In LangGraph, what is the **state**?",
      options: [
        { text: "The shared record of the run that every node reads and updates", why: "Yes. Inputs, messages, tool results and pending actions live here." },
        { text: "The LLM’s settings", why: "Model settings are configuration, not graph state." },
        { text: "The list of edges", why: "Edges define the structure; state is the data moving through it." },
        { text: "The server the graph runs on", why: "State is data, not infrastructure." },
      ],
      answer: 0,
      explain: "State is what the checkpointer saves after each step.",
    },
    {
      id: "m9-q4", kind: "choice",
      prompt: "Your process crashed mid-run. What do you need to resume that run where it stopped?",
      options: [
        { text: "A persistent checkpointer and the same thread ID", why: "Right. Invoke again with that thread ID and it continues from the last checkpoint." },
        { text: "A new thread ID", why: "A new ID starts a brand-new run." },
        { text: "The original prompt only", why: "Without saved state, you’d start from scratch." },
        { text: "Nothing; LangGraph always remembers", why: "Only if checkpoints were saved somewhere that survives a restart." },
      ],
      answer: 0,
      explain: "Thread ID = which run. Checkpointer = where its progress lives.",
    },
    {
      id: "m9-q5", kind: "choice",
      prompt: "Your final proof: kill the process mid-run, restart, resume. What must be true for the test to pass?",
      options: [
        { text: "The run completes, and no external action (email, refund, CRM write) happened twice", why: "Yes. Resume plus idempotent side effects." },
        { text: "The run starts again from the beginning", why: "That’s what you’re trying to avoid." },
        { text: "The process never crashes", why: "Crashes will happen; the test proves recovery." },
        { text: "The model gives the same wording as before", why: "Wording can vary. What matters is no duplicate effects." },
      ],
      answer: 0,
      explain: "Durable state + idempotency keys = recovery without duplicates.",
    },
    {
      id: "m9-q6", kind: "choice",
      prompt: "Which approval request is best?",
      options: [
        { text: "“issue_refund: order 1042, $49.00, to card ending 4421. Approve / Reject”", why: "Yes. Exact tool, target and amount." },
        { text: "“The agent wants to help a customer. Approve?”", why: "Too vague to judge." },
        { text: "“Refund requested. Approve?”", why: "Which order? How much? The approver is guessing." },
        { text: "No request; log it afterwards", why: "Logging after the fact isn’t approval." },
      ],
      answer: 0,
      explain: "Show exact arguments, and bind the approval to them.",
    },
    {
      id: "m9-q7", kind: "choice",
      prompt: "A customer said three weeks ago that they prefer phone calls. Where should the agent keep that fact so it’s available in new conversations?",
      options: [
        { text: "Long-term memory (a store or table shared across threads), with a retention rule", why: "Right. It must outlive one thread." },
        { text: "Short-term thread state", why: "That belongs to one conversation and won’t be there in a new one." },
        { text: "The system prompt for all customers", why: "That would apply one customer’s preference to everyone." },
        { text: "Nowhere; agents can’t remember", why: "They can, if you store it." },
      ],
      answer: 0,
      explain: "Short-term = this thread. Long-term = across threads, with defined retention.",
    },
    {
      id: "m9-q8", kind: "choice",
      prompt: "A weekend agent run made 300 LLM calls and cost far more than expected. Which set of controls was missing?",
      options: [
        { text: "Max steps, a run timeout, a token/cost budget and loop detection", why: "Yes. Each would have stopped it early." },
        { text: "A better system prompt", why: "Prompts don’t enforce limits." },
        { text: "More tools", why: "More tools give it more ways to wander." },
        { text: "A larger context window", why: "That increases cost per call." },
      ],
      answer: 0,
      explain: "Limits are enforced in code and end in a clear handoff state.",
    },
    {
      id: "m9-q9", kind: "choice",
      prompt: "In your eval, the agent calls `issue_refund` when the user says “refund my last invoice” without saying which. What should the label have been?",
      options: [
        { text: "No tool: ask which invoice", why: "Right. Acting on a guess is a failure, even with a valid tool." },
        { text: "issue_refund on the newest invoice", why: "That guesses on a money action." },
        { text: "get_order", why: "That’s the wrong tool for this request." },
        { text: "Any tool counts as correct", why: "Then the eval can’t catch wrong choices." },
      ],
      answer: 0,
      explain: "Include “ask a question” cases in tool-selection evals.",
    },
    {
      id: "m9-q10", kind: "choice",
      prompt: "In MCP, which is the **host**?",
      options: [
        { text: "Claude Desktop, the app the user is working in", why: "Yes. The host contains one client per server connection." },
        { text: "Your CRM MCP server", why: "That’s a server." },
        { text: "The connection inside the app to one server", why: "That’s a client." },
        { text: "The JSON-RPC message", why: "That’s the message format." },
      ],
      answer: 0,
      explain: "Host (the app) → clients (connections) → servers (capabilities).",
    },
    {
      id: "m9-q11", kind: "choice",
      prompt: "A remote MCP server receives a user’s access token. It needs to call the HubSpot API. What should it do?",
      options: [
        { text: "Use its own HubSpot credentials, after checking the user’s token was issued for this server", why: "Right. Validate tokens meant for you; don’t pass them on." },
        { text: "Forward the user’s token to HubSpot", why: "Token passthrough is discouraged: that token was issued for your server, not HubSpot." },
        { text: "Skip checking tokens because MCP handles security", why: "MCP defines how; your server must actually validate." },
        { text: "Ask the model for a HubSpot key", why: "Credentials never go through the model." },
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
