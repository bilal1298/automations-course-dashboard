import type { Lesson } from './types';

export const m7: Lesson = {
  intro: "An LLM is a powerful component with one awkward property: it’s probabilistic. The same input can give different outputs, and a confident-sounding answer can be wrong. This module teaches you to use it like an engineer: know what each call costs, force answers into a shape your code can check, let the model use tools safely, and above all **measure** how well it works with an evaluation set, instead of trusting a prompt that “feels better”. That last skill is what separates an AI demo from an AI system.",
  glossary: {
    'llm': 'Large Language Model: an AI model that reads text and writes text, like the models behind ChatGPT and Claude.',
    'token': 'The small chunk of text an LLM reads and writes, on average a bit less than one English word. You pay per token.',
    'context window': 'The most tokens a model can handle in one call: your input plus its reply.',
    'latency': 'How long you wait for a response.',
    'time to first token': 'How long before the first word of the reply arrives. In a chat, this is the wait users actually feel.',
    'streaming': 'Receiving the reply piece by piece as it’s generated, instead of all at once at the end.',
    'reasoning model': 'A model that writes hidden “thinking” before its answer. Better at hard problems, but slower and uses more output tokens.',
    'system prompt': 'Standing instructions sent with every call that set the model’s job and rules, separate from the user’s input.',
    'temperature': 'A setting for how varied the output is. Lower is more predictable, but never perfectly repeatable.',
    'json schema': 'A standard way to describe the shape of JSON data: which fields, which types and which values are allowed.',
    'structured output': 'A provider feature that makes the model reply with JSON that matches a schema you supply.',
    'tool calling': 'Letting a model ask your code to run a named function (a “tool”) with arguments it chooses. Your code decides whether to run it.',
    'eval set': 'A fixed list of example inputs with the correct answer for each, decided by a person. Also called a golden dataset.',
    'eval': 'An evaluation: running your LLM feature over the eval set and scoring the results.',
    'held-out set': 'Examples you set aside and never look at while improving the prompt, so the final score isn’t flattering itself.',
    'false positive': 'The model said yes, but the truth is no. E.g. a cold lead labelled hot.',
    'false negative': 'The model said no, but the truth is yes. E.g. a hot lead it missed.',
    'precision': 'Of everything the model flagged, the share that was really correct.',
    'recall': 'Of everything that should have been flagged, the share the model actually found.',
    'f1': 'One score that balances precision and recall. It’s low if either of them is low.',
    'calibrated': 'A confidence score is calibrated if, of all answers marked 90% sure, about 90% are actually right.',
    'fallback': 'What the system does when the normal path fails: retry, a backup model, a rule or a person.',
    'model gateway': 'A service between your code and LLM providers that gives one API for many models, with fallback and cost tracking.',
    'prompt caching': 'A provider feature that charges less, and often responds faster, when the start of your prompt matches a recent call.',
    'batch api': 'A provider option where you submit many requests at once and get results back hours later, at a much lower price.',
    'regression': 'Something that used to work getting worse after a change.',
    'llm-as-judge': 'Using a second LLM call, with a grading rubric, to score outputs that have no single correct answer.',
    'tracing': 'Recording every step of each request (LLM calls, tool calls, timings, tokens) so you can inspect it later.',
    'span': 'One step inside a trace, such as a single LLM call or tool call, with its own input, output and timing.',
  },
  sections: [
    {
      title: "What an LLM API call actually is",
      minutes: 6,
      body: [
        "In n8n, an AI node feels like magic: text in, clever text out. Underneath, it’s one ordinary HTTP request to a provider such as OpenAI or Anthropic. Knowing what’s in that request explains most of the cost, speed and reliability problems you’ll meet.",
        "**What you send:**",
        "- A [[system prompt]]: the standing instructions (“You classify support tickets…”).\n- **Messages**: the conversation so far, each tagged with a role: `user` for input, `assistant` for the model’s earlier replies.\n- **Settings**: which model, the maximum length of the reply, and [[temperature]] (lower = more predictable).",
        "**What you get back:** the generated text, a **stop reason** (finished normally, or cut off at the length limit) and a **usage** count of tokens in and out. Log all three.",
        "**Tokens are the unit of everything.** An [[LLM]] reads and writes in [[token|tokens]], chunks of text a bit smaller than a word on average. You pay per token, input and output priced separately; output usually costs more. The [[context window]] is the most tokens one call can hold, input plus reply.",
        "**The model remembers nothing between calls.** A chatbot only “remembers” because your code resends the whole conversation each time, so long conversations get slower and dearer every turn.",
        "**[[Latency]]** depends mostly on how much the model writes. A one-word label comes back far faster than a 500-word email. In a chat, what users feel is **[[time to first token]]**: turn on **[[streaming]]** so words appear as they’re generated, not after the whole reply.",
        "**[[Reasoning model|Reasoning (“thinking”) models]]** write hidden reasoning tokens before answering. Those are billed as output, count towards your max-tokens limit and add seconds. Cap one at 20 tokens and you can get back nothing at all: the budget went on thinking.",
        "**Cost per call** = input tokens × input price + output tokens × output price. Prices change often, so check the provider’s pricing page rather than memorising numbers.",
      ],
      example: {
        caption: 'One call, simplified (field names differ slightly by provider)',
        code: `Request
{
  "model": "<a small, fast model>",
  "max_tokens": 20,                  // cap the reply length
  "temperature": 0,                  // as predictable as possible
  "system": "Classify the support ticket as billing, bug or other. Reply with one word.",
  "messages": [
    {"role": "user", "content": "I was charged twice this month."}
  ]
}
// Anthropic takes "system" as its own field; OpenAI puts it in the messages list.

Response (illustrative)
  text:   "billing"
  stop:   finished normally        // "hit max tokens" would mean it was cut off
  usage:  38 input tokens, 2 output tokens`,
      },
      interview: "An LLM call is a stateless HTTP request: system instructions plus message history in, generated text out with a stop reason and token usage. Cost scales with input and output tokens, including hidden reasoning tokens on thinking models, and latency mostly with output length, so I stream chat replies to cut time to first token. I log usage, latency and stop reason on every call.",
      check: [
        {
          id: 'm7-s0-1', kind: 'choice',
          prompt: "Your support chatbot’s cost per message keeps rising the longer a conversation goes on. Why?",
          options: [
            { text: "Your code resends the whole conversation on every turn", why: "Yes. The model is stateless, so input tokens grow with the history." },
            { text: "The provider charges a higher rate as the chat grows longer", why: "The rate per token stays the same; the number of tokens is what grows." },
            { text: "The model’s replies get longer as it learns the user", why: "The model learns nothing between calls; the growth is in the input." },
            { text: "Temperature drifts upward as a conversation goes on", why: "Temperature is a fixed setting you choose, and it doesn’t affect price." },
          ],
          answer: 0,
          explain: "Trim or summarise old history to keep long conversations affordable.",
        },
        {
          id: 'm7-s0-2', kind: 'choice',
          prompt: "Generated summaries keep ending mid-sentence. The log shows the stop reason “hit max tokens”. What’s happening?",
          options: [
            { text: "The reply hit your length limit; raise it or ask for less", why: "Right. The stop reason says it was cut off, not finished." },
            { text: "The provider timed out and returned what it had so far", why: "A timeout gives an error, not a reply with this stop reason." },
            { text: "Temperature is too high, so the model wanders and stops", why: "Temperature changes variety, not where the reply stops." },
            { text: "The context window is full, so the input must be shortened", why: "An oversized input is rejected with an error; this stop reason means your reply cap was reached." },
          ],
          answer: 0,
          explain: "Always check the stop reason. A cut-off reply can look like a complete one.",
        },
        {
          id: 'm7-s0-3', kind: 'choice',
          prompt: "Your ticket classifier replies with a label plus a paragraph explaining its reasoning. Which change cuts latency the most?",
          options: [
            { text: "Ask for the label only, with no explanation", why: "Yes. Latency is driven mainly by how much the model writes." },
            { text: "Switch to a reasoning model so it decides faster", why: "Reasoning models write hidden thinking first, which adds time." },
            { text: "Lower the temperature so it hesitates less", why: "Temperature changes variety, not how many tokens are written." },
            { text: "Shorten the system prompt to a single line", why: "Input length matters a little; a paragraph of output matters far more." },
          ],
          answer: 0,
          explain: "Short outputs are fast and cheap.",
        },
      ],
    },
    {
      title: "Structured outputs: answers your code can use",
      minutes: 6,
      body: [
        "**The problem.** You ask the model to classify a ticket. One reply says `billing`, the next says `Billing.`, the next says “This appears to be a billing issue.” Your n8n Switch node can’t route any of them reliably.",
        "**Structured output fixes the shape.** You give the provider a [[JSON schema]] describing exactly what to return: fields, types and allowed values. With its [[structured output]] mode on, the reply is JSON that fits. (Defining a tool whose inputs are the schema has a similar effect; tools are next lesson.)",
        "Two common jobs:",
        "- **Classification**: pick one label from a fixed list. Use an `enum` (`billing`, `bug`, `other`), and always include an escape label like `other` or `unclear` so the model isn’t forced to guess.\n- **Extraction**: pull fields out of messy text, like the invoice number, amount and due date from an email. Make fields nullable and say “use null if not present”, or the model will invent something plausible.",
        "**It can still fail.** The model may **refuse** (a refusal message instead of your JSON). The JSON may be **truncated** if the reply hits max tokens. Strict modes have rules, often that every field is listed as required (use nullable for optional ones) and no extra properties are allowed.",
        "**So validate again in your own code.** Parse the reply with a Pydantic model (the FastAPI module); on failure, retry once with the error message. Libraries such as Instructor wrap that validate-and-retry loop for you. Then apply business rules a schema can’t express: the due date isn’t in the past, the amount is positive.",
        "**The big catch: structured output fixes shape, not truth.** `{\"category\": \"billing\"}` is valid JSON even when the ticket is about a bug. Only measuring against labelled examples tells you how often it’s right (Lesson 4).",
        "Keep predictable work out of the model: if a pattern match can find the order number, use that.",
      ],
      example: {
        caption: 'One schema, used twice: sent to the provider, then checked in code',
        code: `from typing import Literal
from pydantic import BaseModel, Field

class TicketLabel(BaseModel):
    category: Literal["billing", "bug", "feature_request", "other"]
    urgent: bool
    order_id: str | None = Field(default=None, description="null if not mentioned")

schema = TicketLabel.model_json_schema()      # JSON Schema to send with the request
                                              # (some providers need small tweaks)
raw = call_llm(ticket_text, schema)           # your provider call
label = TicketLabel.model_validate_json(raw)  # raises an error if the shape is wrong

if label.order_id and not label.order_id.startswith("ORD-"):
    label.order_id = None                     # a business rule the schema can’t express`,
      },
      interview: "I define the output as a schema, with enums for labels and nullable fields for extraction, and use the provider’s structured-output mode to constrain the shape. I still handle refusals and truncated JSON, parse with Pydantic, retry once with the validation error, and apply business rules in code. Structured output guarantees shape, not correctness, so accuracy is measured on an eval set.",
      check: [
        {
          id: 'm7-s1-1', kind: 'choice',
          prompt: "For the ticket “The app crashes when I open settings”, the model returns `{\"category\": \"billing\", \"urgent\": false}`. It passed schema validation. What does this show?",
          options: [
            { text: "Valid shape isn’t a correct answer; only evals measure that", why: "Yes. The JSON is fine; the label is wrong." },
            { text: "The schema needs more categories so the model can be precise", why: "More categories wouldn’t stop it choosing the wrong one." },
            { text: "Structured output mode must have been switched off", why: "Even with it on, the model can choose a wrong but valid label." },
            { text: "Pydantic should have rejected the wrong category", why: "Pydantic checks shape and allowed values, not whether a label is true." },
          ],
          answer: 0,
          explain: "Shape is enforced by schemas; truth is measured with labelled examples.",
        },
        {
          id: 'm7-s1-2', kind: 'choice',
          prompt: "Your invoice extractor fills in a due date even for emails that don’t mention one. What’s the best fix?",
          options: [
            { text: "Make due_date nullable and allow “null if absent”", why: "Yes. Give the model an honest way to say “not there”, then check it in code." },
            { text: "Lower the temperature to 0 so it stops guessing", why: "Temperature 0 makes the guess more repeatable, not more honest." },
            { text: "Add “be accurate, don’t invent dates” to the prompt", why: "It may help a little, but a required field still pushes the model to fill it." },
            { text: "Use a bigger model that understands invoices better", why: "A bigger model still has to put something in a required field." },
          ],
          answer: 0,
          explain: "If a field is required, the model will fill it, even by inventing something.",
        },
        {
          id: 'm7-s1-3', kind: 'choice',
          prompt: "Your categories are `billing`, `bug` and `feature_request`, with structured output enforcing the enum. A ticket asks about a partnership. What will the model do?",
          options: [
            { text: "Pick one of the three, even though none fits", why: "Right. Add an other or unclear label so it can say “none of these”." },
            { text: "Reply in plain text that none of them fit", why: "Structured output won’t let it step outside the schema." },
            { text: "Add a new partnership value to the category", why: "The enum restricts it to the listed values." },
            { text: "Return an error saying the ticket can’t be classified", why: "It returns a valid but wrong label, which is worse because nobody notices." },
          ],
          answer: 0,
          explain: "Always give classifiers an escape label, and route it to a person.",
        },
      ],
    },
    {
      title: "Tool calling, on a short leash",
      minutes: 6,
      body: [
        "Sometimes the model needs information it doesn’t have: “Has order ORD-1042 shipped?” [[Tool calling]] lets it ask your code for it. How it works:",
        "1. You describe your tools in the request: a name, a description and a JSON schema for the arguments, e.g. `get_order_status(order_id)`.\n2. Instead of answering, the model replies with a **request**: “call `get_order_status` with `order_id = ORD-1042`”.\n3. **Your code** decides whether to run it, runs it and sends the result back as a new message.\n4. The model asks for another tool, or writes its final answer.",
        "**The model never runs anything itself. It only proposes.** So treat every tool call as an **untrusted request**: validate the arguments against the schema, and check permissions in your code. Is this customer allowed to see *this* order? Never rely on the model to enforce that.",
        "Design rules:",
        "- **Narrow tools.** `get_order_status(order_id)` beats `run_sql(query)`. The smaller the tool, the less can go wrong.\n- **Typed arguments** with enums and formats, validated before running.\n- **Read-only by default.** Tools that change things (refund, send email) need tighter rules, often a person’s approval.\n- **A hard step limit.** Models can loop, calling the same tool over and over. Cap the rounds (say 5) and stop with a clear failure.\n- **Log every call**: tool, arguments, result, duration. When something goes wrong, that log is the only record of what the model did.",
        "n8n’s AI Agent node runs this same loop for you with the tools you attach, and has a maximum-iterations setting. The same rules apply.",
      ],
      example: {
        caption: 'A tool loop with a step limit (simplified; field names differ by provider)',
        code: `MAX_STEPS = 5
TOOLS = {"get_order_status": get_order_status}       # the only tools allowed

messages = [{"role": "user", "content": question}]
for step in range(MAX_STEPS):
    reply = call_llm(messages, tools=TOOL_SCHEMAS)
    if not reply.tool_calls:                         # no tool needed: final answer
        return reply.text
    messages.append(reply.message)                   # keep the model's request
    for call in reply.tool_calls:
        log.info("tool_call", tool=call.name, args=call.args, step=step)
        if call.name not in TOOLS:
            result = {"error": "unknown tool"}
        else:
            args = validate_args(call.name, call.args)        # schema check
            check_permission(current_user, call.name, args)   # your rules
            result = TOOLS[call.name](**args)
        messages.append(tool_result(call, result))   # send the result back

raise StepLimitReached("no answer after 5 steps")    # stop, don't loop forever`,
      },
      interview: "Tool calls are proposals from the model, executed by my code after schema validation and server-side permission checks. I keep tools narrow and typed, prefer read-only ones, gate tools with side effects behind approval, cap the loop with a hard step limit and log each call with arguments, result and latency.",
      check: [
        {
          id: 'm7-s2-1', kind: 'choice',
          prompt: "A logged-in customer asks about “my invoice”. The model calls `get_invoice` with a **different** customer’s ID. What should your code do?",
          options: [
            { text: "Refuse in the tool code: the permission check fails", why: "Yes. Permissions are enforced by your code, whatever the model asks for." },
            { text: "Add a line to the system prompt forbidding other IDs", why: "Worth having, but prompts can be ignored or overridden; the check must be in code." },
            { text: "Ask the model to confirm the ID before running it", why: "The model can’t be the security check; it will often just confirm." },
            { text: "Run it but remove amounts and addresses from the result", why: "Any of another customer’s data is still a leak." },
          ],
          answer: 0,
          explain: "Tool calls are untrusted requests. Check permissions outside the model.",
        },
        {
          id: 'm7-s2-2', kind: 'choice',
          prompt: "An agent’s log shows `search_orders` called 40 times for one question, and the bill spiked. What was missing?",
          options: [
            { text: "A hard step limit that stops with a clear error", why: "Yes. Without a cap, a confused model can loop for a long time." },
            { text: "A bigger context window so it can see its results", why: "A bigger window lets the loop run even longer; it doesn’t stop it." },
            { text: "Temperature 0, so it stops repeating the same call", why: "Lower temperature makes the loop more repeatable, not shorter." },
            { text: "A stronger model that wouldn’t get confused", why: "Any model can loop on some input; you still need a cap." },
          ],
          answer: 0,
          explain: "Bound every agent loop: steps, time and spend.",
        },
        {
          id: 'm7-s2-3', kind: 'choice',
          prompt: "You want the model to check order status. Which tool is the safest design?",
          options: [
            { text: "get_order_status(order_id), ID validated", why: "Yes. Narrow, typed and read-only." },
            { text: "run_sql(query), limited to SELECT statements", why: "Read-only SQL can still read every customer’s data." },
            { text: "http_request(url), told to use the orders API", why: "The model picks the URL, so it could call any address, including internal ones." },
            { text: "search_database(text) across all tables", why: "A broad search can return any table’s data, not just this order." },
          ],
          answer: 0,
          explain: "The smaller the tool, the smaller the damage a wrong call can do.",
        },
      ],
    },
    {
      title: "Building an eval set and choosing a model",
      minutes: 7,
      body: [
        "**The problem.** You tweak a prompt, try three tickets, and it looks better. But did it break ten cases you didn’t try? Without measuring, you can’t know. The rule of this module: **progress is an eval result, not a feeling.**",
        "An [[eval set]] is a fixed list of real inputs with the correct answer for each, decided by a person. For a ticket classifier, that’s 50 or more tickets, each labelled `billing`, `bug` and so on. To build one:",
        "- Pull **real examples** (anonymised) in roughly the mix you see in practice.\n- Add **edge cases**: two issues in one ticket, sarcasm, other languages, near-empty messages.\n- Add every **past failure** you find. Bugs become test cases.\n- Have a person label them. If two people disagree on a label, your categories are unclear; fix the definitions first.",
        "Keep a **[[held-out set]]**: examples you never look at while improving the prompt. Otherwise you tune the prompt to your examples and the score flatters you.",
        "**Running an [[eval]]** is a loop: send each example, compare the output with the label in code, and record whether it was right, the latency and the tokens used. Save the prompt version and model with the results. A short script or an eval tool both work; the idea matters more than the tool.",
        "**Mind the noise.** With 60 examples, each one is worth about 1.7 points, so a 1–2 point gap is a single ticket. For close calls, add examples and rerun each candidate a few times, because outputs vary between runs.",
        "**Choosing a model.** Run the same eval set through two or three models (or prompts) and compare quality, cost per 1,000 items and latency. Pick **the cheapest, fastest option that meets your quality bar**. If nothing meets it, that’s a finding too: maybe the task needs a human step.",
      ],
      example: {
        caption: 'Comparing candidates on the same eval set (illustrative)',
        code: `eval set: tickets-v3 (60 examples)      prompt: classify-v7
quality bar agreed with the client: 92%

candidate            correct   accuracy   cost / 1,000   median latency
large model          58 / 60   97%        $$$$           2.1 s
small model          52 / 60   87%        $              0.6 s
small model + rules  57 / 60   95%        $              0.6 s

→ "small model + rules": meets the bar, cheapest, fastest
  (large vs small + rules is 1 ticket apart: within noise)`,
      },
      interview: "Before tuning I build a labelled eval set of at least 50 representative cases, edge cases and past failures, with a held-out split. Every candidate runs on the same set, and I record quality, cost and latency with the prompt and model version. I treat one- or two-example differences as noise, and pick the cheapest configuration that clears the agreed bar.",
      check: [
        {
          id: 'm7-s3-1', kind: 'choice',
          prompt: "A colleague says their new prompt is better: “I tried it on three tickets and they all looked right.” What do you do?",
          options: [
            { text: "Run both prompts on the same eval set and compare", why: "Yes. Three hand-picked tickets can’t show what broke elsewhere." },
            { text: "Test it on ten more tickets you pick yourself", why: "Still few, and hand-picked examples aren’t representative." },
            { text: "Ask the model to rate which prompt is clearer", why: "A model’s opinion of a prompt isn’t a measurement of its results." },
            { text: "Ship it to everyone and watch whether complaints drop", why: "Complaints are slow and noisy, and arrive after customers are affected." },
          ],
          answer: 0,
          explain: "Same data, both versions, compare the numbers.",
        },
        {
          id: 'm7-s3-2', kind: 'choice',
          prompt: "Two people label the same 60 tickets and disagree on 12 of them. What does that tell you?",
          options: [
            { text: "The category definitions are unclear; fix them first", why: "Yes. If people can’t agree, the model can’t be scored fairly." },
            { text: "One labeller is careless, so keep only the other’s labels", why: "Disagreement usually points at the definitions, not the person." },
            { text: "Let the model break ties between the two labellers", why: "The model is what you’re measuring; it can’t also set the answers." },
            { text: "Keep all 60 and count either label as correct", why: "That flatters the score without fixing the confusion." },
          ],
          answer: 0,
          explain: "Clear labels come before meaningful scores.",
        },
        {
          id: 'm7-s3-3', kind: 'choice',
          prompt: "The quality bar is 92%. Model A: 96%, high cost, 3 s. Model B: 94%, low cost, 0.5 s. Which do you choose for routing tickets?",
          options: [
            { text: "Model B: it clears the bar, cheaper and faster", why: "Yes. The cheapest, fastest option that meets the measured bar." },
            { text: "Model A: the extra 2 points is worth paying for", why: "Extra accuracy beyond the agreed bar rarely justifies far higher cost and wait." },
            { text: "Model A, because routing errors are expensive", why: "The bar already reflects the cost of errors; if it’s too low, raise it explicitly." },
            { text: "Neither: keep testing until one reaches 100%", why: "No model is perfect. Agree a bar and route the rest to people." },
          ],
          answer: 0,
          explain: "If quality matters more than cost, raise the bar explicitly; don’t pick on instinct.",
        },
      ],
    },
    {
      title: "Accuracy, precision, recall and the cost of mistakes",
      minutes: 7,
      body: [
        "Your eval gives you a pile of right and wrong answers. How you score them matters. Example: an n8n workflow labels inbound leads **hot** (send to sales now) or not. Your eval set has 100 leads, and 20 are truly hot. The model flags 25 as hot, and 15 of those are right.",
        "Every answer lands in one of four boxes:",
        "- **True positive** (15): said hot, was hot.\n- **[[False positive]]** (10): said hot, wasn’t. Sales wastes a call.\n- **[[False negative]]** (5): said not hot, was hot. A ready buyer waits a week.\n- **True negative** (70): said not hot, wasn’t.",
        "Now the scores:",
        "- **Accuracy**: all correct ÷ all = (15 + 70) ÷ 100 = **85%**.\n- **[[Precision]]**: of those flagged hot, how many were? 15 ÷ 25 = **60%**.\n- **[[Recall]]**: of the truly hot, how many were found? 15 ÷ 20 = **75%**.\n- **[[F1]]**: one number balancing both, 2 × P × R ÷ (P + R) = **67%**.",
        "**Why accuracy alone misleads.** If only 5 in 100 leads are hot, a model that says “not hot” to everything scores 95% accuracy and finds zero hot leads. Always check precision and recall for the label you care about.",
        "**Which matters more depends on the cost of each mistake**, and that’s a business question, not a maths one. If a missed hot lead loses a sale, favour recall. If a “hot” label triggers an automatic email to the prospect, a false positive embarrasses your client, so favour precision. For tickets marked `urgent` that page someone at night, false positives wear the team out, and false negatives leave outages unanswered.",
        "So ask the client: “Which mistake is worse, and by how much?” Then set thresholds and review rules from that answer.",
      ],
      interview: "I report precision, recall and F1 per class, not just accuracy, because imbalanced classes make accuracy misleading. Then I weigh false positives against false negatives using the business cost of each, for example favouring precision when a positive triggers an outbound message, and set thresholds and human-review rules from that.",
      check: [
        {
          id: 'm7-s4-1', kind: 'choice',
          prompt: "Out of 200 tickets, 10 are truly urgent. The model flags 8 as urgent, and 6 of those are right. What is its **precision** for urgent?",
          options: [
            { text: "75% (6 ÷ 8)", why: "Yes. Of the 8 it flagged, 6 were really urgent." },
            { text: "60% (6 ÷ 10)", why: "That’s recall: of the 10 truly urgent, it found 6." },
            { text: "3% (6 ÷ 200)", why: "Precision only looks at what the model flagged." },
            { text: "97% (194 ÷ 200)", why: "That’s roughly accuracy, which hides the urgent cases." },
          ],
          answer: 0,
          explain: "Precision divides by what was flagged; recall divides by what was truly there.",
        },
        {
          id: 'm7-s4-2', kind: 'choice',
          prompt: "A vendor says their fraud detector is “97% accurate”. Fraud is 3% of invoices. What’s the most important question to ask?",
          options: [
            { text: "What are the precision and recall on fraud cases?", why: "Yes. Labelling everything “not fraud” would also score 97%." },
            { text: "How many invoices was the 97% measured on?", why: "Worth knowing, but even on a huge set, 97% can mean it catches no fraud." },
            { text: "Which model does it use, and how large is it?", why: "The model matters less than how it performs on the fraud cases." },
            { text: "Is the 97% on our invoices or on a public test set?", why: "Useful, but 97% accuracy on your own data could still mean zero fraud caught." },
          ],
          answer: 0,
          explain: "With rare classes, accuracy can look great while the system is useless.",
        },
        {
          id: 'm7-s4-3', kind: 'choice',
          prompt: "Leads labelled “VIP” automatically receive a large discount code by email. Which error is most costly, and which metric should you favour?",
          options: [
            { text: "False positives; favour precision", why: "Yes. Each wrong “VIP” gets a discount that can’t be taken back." },
            { text: "False negatives; favour recall", why: "A missed VIP can be followed up later; a wrongly sent code can’t be recalled." },
            { text: "Neither; overall accuracy covers both", why: "Accuracy hides which kind of mistake you’re making." },
            { text: "Both matter equally; favour F1 score", why: "F1 weighs them equally, but here one error costs real money and can’t be undone." },
          ],
          answer: 0,
          explain: "When a positive triggers an irreversible action, precision usually matters most.",
        },
      ],
    },
    {
      title: "Confidence, fallbacks and human review",
      minutes: 6,
      body: [
        "**Don’t trust the model’s own confidence.** It’s tempting to add `confidence: 0–1` to your schema and auto-approve anything above 0.9. But that number is just more generated text. It isn’t [[calibrated]]: answers marked 0.95 can be wrong far more often than 5% of the time.",
        "**Measure instead.** Use your eval set to find where the model is reliable and where it isn’t: maybe 98% right on `billing`, 70% on refund-versus-complaint, weak on non-English tickets. Turn that into routing rules your code can check: category, language, amount, missing fields.",
        "**A [[fallback]] policy** decides in advance what happens when the normal path fails. One line per failure:",
        "- **Schema failure** (the reply doesn’t validate): retry once, including the validation error; if it fails again, send it to review. A wrong answer isn’t a temporary error, so don’t retry forever.\n- **Provider [[timeout]] or 5xx**: retry with [[exponential backoff]], then a backup model or provider, then queue it for later.\n- **Ambiguous or risky case** (the `unclear` label, a legal threat, a large refund): straight to a person.\n- **High-impact action** (moving money, emailing a customer): human approval, whatever the model says.",
        "A **[[model gateway]]** such as LiteLLM or OpenRouter makes the backup-provider step easy: one API for many models, automatic fallback when one fails, and cost tracking per app or client.",
        "**Human review is a feature, not a failure.** In n8n it can be a Slack or email message that waits for Approve or Reject. Record every reviewer decision: those are free, high-quality labels for your eval set.",
        "Log the reason each item took a fallback path. If 30% of items suddenly go to review, something changed. Never fail silently: every item ends up processed, reviewed or visibly failed.",
      ],
      interview: "I don’t treat model-reported confidence as a calibrated probability; I route on measured per-segment performance and deterministic signals. The fallback policy is explicit: one bounded retry on schema failure, backoff then a backup provider via a gateway on timeouts, and human review for ambiguous, risky or high-impact cases. I log the fallback reason and feed reviewer decisions back into the eval set.",
      check: [
        {
          id: 'm7-s5-1', kind: 'choice',
          prompt: "Your system auto-approves refunds when the model reports confidence above 0.9. An audit finds many wrong approvals marked 0.97. What’s the better design?",
          options: [
            { text: "Route on measured accuracy plus rules like amount", why: "Yes. Decide from behaviour measured on labelled data, with people reviewing risky cases." },
            { text: "Raise the auto-approve threshold from 0.9 to 0.99", why: "The number isn’t calibrated, so a higher cut-off isn’t reliably safer." },
            { text: "Ask the model to give more honest confidence scores", why: "The self-reported number is still generated text." },
            { text: "Use a bigger model, whose confidence is more reliable", why: "Bigger models aren’t calibrated by default either; you’d still need to measure." },
          ],
          answer: 0,
          explain: "Self-reported confidence isn’t a probability. Measure, then route.",
        },
        {
          id: 'm7-s5-2', kind: 'choice',
          prompt: "The same email fails schema validation three times in a row. What should happen next?",
          options: [
            { text: "Stop retrying, send it to review and log why", why: "Yes. Repeating the same prompt won’t fix a consistent failure." },
            { text: "Retry with a higher temperature to vary the reply", why: "It might pass by luck, but that hides a consistent problem and keeps costing." },
            { text: "Keep retrying every minute until it passes", why: "Unbounded retries burn money and may never succeed." },
            { text: "Relax the schema so the reply can pass validation", why: "Then bad data flows into your systems." },
          ],
          answer: 0,
          explain: "Bounded retries, then a visible fallback.",
        },
        {
          id: 'm7-s5-3', kind: 'order',
          prompt: "Order the fallback steps when the LLM provider keeps timing out.",
          items: ["Retry with exponential backoff", "Switch to a backup model or provider", "Queue the item for later or for human review"],
          explain: "Cheap fixes first, then alternatives, and never lose the item.",
        },
      ],
    },
    {
      title: "Cutting cost, versioning prompts and regression gates",
      minutes: 7,
      body: [
        "**Cut cost before you have to.** Four habits:",
        "- **Send less.** Every prompt token is paid for on every call. Strip signatures, HTML and quoted reply chains. Send three relevant documents, not thirty.\n- **Cache your own results.** If the same input arrives again with the same prompt version and model, reuse the stored answer. Key the cache on all three.\n- **Use [[prompt caching]].** Providers charge less when the start of a prompt matches a recent call, so keep a stable prefix: instructions and examples first, changing input last. Some providers cache automatically; others need you to mark the cacheable part.\n- **Batch what can wait.** A [[batch API]] takes many requests at once and returns results within hours, much cheaper (around half price at major providers). Ideal for nightly reports and backfills.",
        "**Version everything.** Give each prompt a version (`classify-v7`) and keep it in Git, not only inside an n8n node. Store the prompt version, model and settings next to **every output**. When a client asks why a ticket was mislabelled last Tuesday, you can answer, and you can tell whether a [[regression]] came from a prompt or a model change.",
        "**A regression gate** stops a change that makes things worse. Before a new prompt or model goes live:",
        "1. Run it on the full eval set, including the held-out examples.\n2. Compare it with the current version, metric by metric.\n3. **Reject it** if an important metric drops past an agreed limit, e.g. recall on `urgent` falls by more than 2 points, even if overall accuracy rose.\n4. If it passes, ship it and record the new version.",
        "Put the gate in [[CI/CD]] so it runs whenever the prompt file changes. Providers also retire and update models; treat a new model version exactly like a prompt change.",
      ],
      example: {
        caption: 'A regression gate script that fails CI',
        code: `baseline  = run_eval(prompt="classify-v7", model=CURRENT_MODEL)
candidate = run_eval(prompt="classify-v8", model=CURRENT_MODEL)

print(f"accuracy       {baseline.accuracy:.0%} → {candidate.accuracy:.0%}")
print(f"urgent recall  {baseline.recall['urgent']:.0%} → {candidate.recall['urgent']:.0%}")

if candidate.recall["urgent"] < baseline.recall["urgent"] - 0.02:
    raise SystemExit("Rejected: urgent recall dropped")    # non-zero exit = red CI
if candidate.cost_per_1000 > baseline.cost_per_1000 * 1.2:
    raise SystemExit("Rejected: over 20% more expensive")`,
      },
      interview: "I minimise context, cache deterministic results keyed on input, prompt version and model, keep a stable prompt prefix for provider caching, and push non-urgent work through batch APIs. Every output is stored with its prompt and model version, and changes go through a CI regression gate on the eval set that rejects them if a critical metric drops beyond an agreed tolerance.",
      check: [
        {
          id: 'm7-s6-1', kind: 'choice',
          prompt: "A new prompt raises overall accuracy from 91% to 93%, but recall on `urgent` falls from 90% to 80%. Missed urgent tickets are the client’s biggest risk. Do you ship it?",
          options: [
            { text: "No: the metric that matters most got worse", why: "Yes. An average can rise while the important part gets worse." },
            { text: "Yes: overall accuracy is the fairer summary", why: "Overall accuracy hides the drop on the label the client cares about." },
            { text: "Yes, and fix urgent recall in the next release", why: "That knowingly ships a regression on the riskiest case." },
            { text: "Ship it to half of users and compare", why: "Half your users would still miss urgent tickets, and the eval already showed the drop." },
          ],
          answer: 0,
          explain: "Gate on the metrics tied to the costliest mistakes, not just the headline number.",
        },
        {
          id: 'm7-s6-2', kind: 'choice',
          prompt: "Your cache is keyed only on the ticket text. After you deploy `classify-v8`, some tickets still get answers from v7. What’s the fix?",
          options: [
            { text: "Add the prompt version and model to the cache key", why: "Yes. A new prompt or model then misses the old cache entries." },
            { text: "Turn off caching for good to avoid stale answers", why: "That throws away the savings instead of fixing the key." },
            { text: "Set temperature to 0 so v8 answers stay consistent", why: "The stale answers come from the cache, not the model." },
            { text: "Make every cache entry expire after one hour", why: "Old answers would still be served for up to an hour after each change." },
          ],
          answer: 0,
          explain: "Cache keys must include everything that changes the answer.",
        },
        {
          id: 'm7-s6-3', kind: 'choice',
          prompt: "A client asks why ticket T-5512 was labelled wrongly three weeks ago. What lets you answer?",
          options: [
            { text: "The prompt version, model and settings stored with it", why: "Yes. You can rerun that exact configuration and see if it’s been fixed since." },
            { text: "The prompt that’s in the n8n node today, plus the ticket", why: "The prompt may have changed since then." },
            { text: "Ask the model to explain why it chose that label", why: "The model has no memory of that call; it would invent a reason." },
            { text: "Rerun the ticket now and look at the new answer", why: "Today’s prompt and model may differ, and outputs vary between runs." },
          ],
          answer: 0,
          explain: "Without versions stored next to outputs, regressions can’t be traced.",
        },
      ],
    },
    {
      title: "Judging free-text answers and watching your LLM app in production",
      minutes: 7,
      body: [
        "**The problem.** Precision and recall work when there’s one right label. But how do you score a drafted customer reply or a summary? There’s no single correct string to compare against.",
        "**[[LLM-as-judge]]**: a second model call grades each output against a **rubric**, a short list of specific criteria. “Does the reply answer the customer’s actual question? Does it promise anything not in the policy?” Specific yes/no questions grade more consistently than “rate it 1–10”.",
        "**Check the judge before you trust it.** Have a person grade a sample (say 50 outputs) and compare. If the judge mostly agrees, use it at scale; if not, fix the rubric. Known biases:",
        "- **Position**: comparing two answers, it favours one slot, often the first. Judge twice with the order swapped.\n- **Verbosity**: it prefers longer answers even when they aren’t better.\n- **Self-preference**: it favours text in its own model’s style. Use a different model as judge where you can.",
        "Tools such as RAGAS and DeepEval ship ready-made judge metrics, and n8n has built-in Evaluations for running a workflow over a test dataset and scoring it. The ideas underneath are the same.",
        "**Watching production: [[tracing]].** An eval shows how you do on your examples; tracing shows what happens on real traffic. Tools like Langfuse, LangSmith or Arize Phoenix record one **trace** per request, with a **[[span]]** for each LLM or tool call inside it, plus tokens, cost and latency per trace. When a client says “the bot gave a weird answer at 3 pm”, you open that trace and see which step went wrong.",
        "**Close the loop.** Every production failure you find (a bad trace, a thumbs-down, a reviewer’s correction) becomes a new eval example. Your eval set grows from real mistakes, and the regression gate keeps them fixed.",
      ],
      example: {
        caption: 'A judge rubric, and one request as a tracing tool shows it (illustrative)',
        code: `Judge prompt (ideally a different model from the one being judged)
  Grade this support reply. Answer each question true or false.
  1. answers_question: does it answer what the customer asked?
  2. within_policy:    does it only promise what the policy allows?
  3. tone_ok:          is it polite and under 120 words?
  → {"answers_question": true, "within_policy": false, "tone_ok": true}

Trace: ticket-8812            3.4 s   2,140 tokens   cost logged
├─ span  classify             0.4 s     310 tokens
├─ span  tool: get_order      0.2 s
└─ span  draft_reply          2.8 s   1,830 tokens   ← promised a refund`,
      },
      interview: "For free-text outputs I use an LLM judge with a specific rubric, validated against a human-graded sample, and I control for position, verbosity and self-preference bias. In production I trace every request with a span per LLM and tool call, tracking tokens, cost and latency, and every failure I find there becomes a new case in the eval set.",
      check: [
        {
          id: 'm7-s7-1', kind: 'choice',
          prompt: "Your LLM judge grades 50 drafted replies. A person grades the same 50 and disagrees with the judge on 18. What do you do?",
          options: [
            { text: "Fix the rubric and recheck it against people’s grades", why: "Yes. A judge is only useful once it mostly agrees with people." },
            { text: "Trust the judge; it’s more consistent than people", why: "Consistent isn’t the same as right, and 18 of 50 is a lot of disagreement." },
            { text: "Switch the judge to a bigger model and start using it", why: "It might help, but you’d still need to check it against people first." },
            { text: "Ask the judge to also give a confidence score", why: "Self-reported confidence isn’t calibrated, so it won’t tell you who’s right." },
          ],
          answer: 0,
          explain: "Validate the judge on a human-graded sample before trusting it at scale.",
        },
        {
          id: 'm7-s7-2', kind: 'choice',
          prompt: "Comparing answers from two prompts, your judge prefers whichever answer it sees first. What do you do?",
          options: [
            { text: "Judge each pair twice, swapping the order", why: "Yes. Position bias cancels out when each answer gets both slots." },
            { text: "Tell the judge in its prompt to be impartial", why: "It may help slightly, but position bias persists, so measure around it." },
            { text: "Always put the new prompt’s answer second", why: "That just biases the result against the new prompt." },
            { text: "Raise the judge’s temperature to even it out", why: "More randomness adds noise; it doesn’t remove the bias." },
          ],
          answer: 0,
          explain: "Known judge biases are handled by test design, not by asking nicely.",
        },
        {
          id: 'm7-s7-3', kind: 'choice',
          prompt: "A client says the bot gave a strange answer yesterday at 3 pm. What shows you which step went wrong?",
          options: [
            { text: "That request’s trace, with a span for each call", why: "Yes. It records each LLM and tool call with inputs, outputs and timing." },
            { text: "Rerunning the same question now to see the answer", why: "Today’s output may differ; you need what actually happened then." },
            { text: "The provider’s usage dashboard for that day", why: "It shows totals, not the steps of one request." },
            { text: "Your eval set’s most recent overall score", why: "An eval score summarises test examples, not one live request." },
          ],
          answer: 0,
          explain: "Then add that case to your eval set so it stays fixed.",
        },
      ],
    },
  ],
  quiz: [
    {
      id: 'm7-q1', kind: 'choice',
      prompt: "You classify 3,000-token customer emails, and most of each email is signatures and quoted reply chains. What cuts cost the most?",
      options: [
        { text: "Strip signatures and quoted replies before sending", why: "Yes. Fewer input tokens on every call, and often better answers too." },
        { text: "Switch to a model with a bigger context window", why: "A bigger window lets you send more; it doesn’t make tokens cheaper." },
        { text: "Ask for a one-word label instead of a short sentence", why: "It helps a little, but the reply is tiny next to 3,000 input tokens." },
        { text: "Lower the temperature so replies are shorter", why: "Temperature changes variety, not length or input size." },
      ],
      answer: 0,
      explain: "Prompt minimisation is the simplest saving there is.",
    },
    {
      id: 'm7-q2', kind: 'choice',
      prompt: "Your call fails with “input exceeds the context window” when you send a whole 300-page contract. What do you do?",
      options: [
        { text: "Send only relevant sections, or process it in parts", why: "Yes. The input plus reply must fit within the window." },
        { text: "Raise max_tokens so the whole contract fits in", why: "max_tokens caps the reply, not the input." },
        { text: "Retry with backoff, since it may be a temporary limit", why: "It’s a size limit, so it fails the same way every time." },
        { text: "Remove the system prompt to free up space for it", why: "A system prompt is tiny next to 300 pages; it won’t make the contract fit." },
      ],
      answer: 0,
      explain: "The context window is a hard limit on input plus output.",
    },
    {
      id: 'm7-q3', kind: 'choice',
      prompt: "The team says: “We use structured outputs, so our extractor is accurate.” What’s wrong with that?",
      options: [
        { text: "It guarantees the shape, not that values are correct", why: "Yes. Valid JSON can still hold the wrong invoice number." },
        { text: "Nothing; schema-valid output means correct values", why: "Shape and truth are different things." },
        { text: "It’s only accurate if temperature is set to 0", why: "Temperature 0 makes output more repeatable, not more correct." },
        { text: "It’s only accurate once Pydantic also validates it in code", why: "Pydantic checks shape and rules too; neither measures correctness. Evals do." },
      ],
      answer: 0,
      explain: "Schemas fix shape. Evals measure truth.",
    },
    {
      id: 'm7-q4', kind: 'choice',
      prompt: "Spot the problem in this extraction model.",
      code: `class Invoice(BaseModel):
    invoice_number: str
    amount: float
    due_date: date        # many emails don't include one`,
      options: [
        { text: "due_date is required, so dates get invented", why: "Yes. Make it date | None = None and say “null if not present”." },
        { text: "amount should be a string to keep the currency symbol", why: "A number is right for an amount; store the currency in its own field." },
        { text: "Pydantic can’t validate date fields from JSON", why: "It parses ISO date strings like 2025-03-03 fine." },
        { text: "invoice_number should be an int, not a str", why: "Invoice numbers often contain letters or leading zeros, so str is right." },
      ],
      answer: 0,
      explain: "Give the model an honest “not present” option for every optional fact.",
    },
    {
      id: 'm7-q5', kind: 'choice',
      prompt: "The model calls your `issue_refund` tool with an amount of $4,800 for a $48 order. What should already be in place?",
      options: [
        { text: "Code checks on amount, plus human approval for refunds", why: "Yes. The tool call is an untrusted request, and refunds are high-impact." },
        { text: "A system prompt telling the model to check amounts", why: "Prompts help, but they can’t be the only safeguard." },
        { text: "A lower step limit so it can’t call the tool twice", why: "The step limit stops loops; it doesn’t check amounts." },
        { text: "A bigger model that reads the order total more carefully", why: "Better models still make mistakes; the check must be in code." },
      ],
      answer: 0,
      explain: "Validate arguments, enforce rules in code, and require approval for consequential actions.",
    },
    {
      id: 'm7-q6', kind: 'choice',
      prompt: "You improved the prompt by studying every failing example in the eval set, including the held-out ones. Now the score is 98%. What’s the problem?",
      options: [
        { text: "The held-out set is no longer unseen, so it flatters you", why: "Yes. You tuned to the test. Collect fresh held-out examples." },
        { text: "Nothing: studying failing examples is how you improve prompts", why: "It is, on the tuning set; on held-out examples it contaminates the score." },
        { text: "The eval set is too small to trust a score that high", why: "Size isn’t the issue here; contamination is." },
        { text: "You should rerun it, since outputs vary from run to run", why: "Reruns help with noise, but the problem is that you tuned to the test." },
      ],
      answer: 0,
      explain: "Keep held-out examples untouched until the final check.",
    },
    {
      id: 'm7-q7', kind: 'choice',
      prompt: "Of 40 truly spam messages, your filter catches 30. It also wrongly flags 10 real messages. What are recall and precision?",
      options: [
        { text: "Recall 75%, precision 75%", why: "Yes. Recall = 30 ÷ 40. Precision = 30 ÷ (30 + 10)." },
        { text: "Recall 100%, precision 75%", why: "It missed 10 spam messages, so recall isn’t 100%." },
        { text: "Recall 75%, precision 100%", why: "10 real messages were wrongly flagged, so precision isn’t 100%." },
        { text: "Recall 50%, precision 50%", why: "Work through the counts: 30 of 40, and 30 of 40 flagged." },
      ],
      answer: 0,
      explain: "Recall ÷ by truly positive; precision ÷ by flagged positive.",
    },
    {
      id: 'm7-q8', kind: 'choice',
      prompt: "A workflow auto-closes support tickets the model labels “resolved”. Which mistake hurts most, and what do you favour?",
      options: [
        { text: "False positives; favour precision and review unclear ones", why: "Yes. A customer whose issue is closed unsolved is the costly error." },
        { text: "False negatives; favour recall so fewer resolved ones stay open", why: "A resolved ticket left open just waits a little longer; that’s cheaper." },
        { text: "Neither; overall accuracy is enough to judge this one", why: "Accuracy hides which kind of error you’re making." },
        { text: "Both equally, so optimise F1 for the resolved label", why: "F1 weighs them equally, but closing a live problem costs far more." },
      ],
      answer: 0,
      explain: "Tie the metric you optimise to the cost of each error type.",
    },
    {
      id: 'm7-q9', kind: 'choice',
      prompt: "On your 60-example eval set, prompt v8 scores 93.3% and v7 scores 91.7%. What do you conclude?",
      options: [
        { text: "It’s one ticket’s difference; add examples and rerun", why: "Yes. Each example is about 1.7 points here, so the gap is within noise." },
        { text: "v8 is better, so ship it as the new production version", why: "One example out of 60 can’t tell you that yet." },
        { text: "v8 is roughly 2% better, which is a solid improvement", why: "A 1.6-point gap is a single ticket, and outputs vary between runs." },
        { text: "Switch to a bigger model so the difference becomes clearer", why: "Changing the model doesn’t tell you which prompt is better." },
      ],
      answer: 0,
      explain: "Small eval sets can’t separate close candidates. Grow the set and rerun.",
    },
    {
      id: 'm7-q10', kind: 'choice',
      prompt: "A provider’s replies sometimes fail your Pydantic check. What’s a good fallback policy?",
      options: [
        { text: "Retry once with the error included, then review and log", why: "Yes. Bounded, visible and recorded." },
        { text: "Retry with backoff until it eventually passes validation", why: "Unbounded retries waste money; a wrong answer isn’t a temporary error." },
        { text: "Accept it and repair the fields in a later workflow step", why: "Invalid data will break something downstream first." },
        { text: "Skip that item so the rest of the batch keeps running", why: "Silently losing items is the worst outcome." },
      ],
      answer: 0,
      explain: "Every item ends up processed, reviewed or visibly failed.",
    },
    {
      id: 'm7-q11', kind: 'choice',
      prompt: "Which design makes the most of provider prompt caching?",
      options: [
        { text: "Fixed instructions and examples first, ticket text last", why: "Yes. Caching works on a matching start of the prompt." },
        { text: "Ticket text first so the model reads it before the rules", why: "The start then changes every call, so nothing matches the cache." },
        { text: "Put the current date at the top so answers stay fresh", why: "The prompt then starts differently every day, defeating caching." },
        { text: "Shuffle the examples each call so the model doesn’t overfit", why: "That changes the prompt’s start and defeats caching." },
      ],
      answer: 0,
      explain: "Stable first, variable last.",
    },
    {
      id: 'm7-q12', kind: 'order',
      prompt: "Order the steps for safely changing a production prompt.",
      items: ["Write the new prompt version", "Run it on the full eval set", "Compare each important metric with the current version", "Reject it, or ship it and record the new version"],
      explain: "That’s a regression gate. The unit of progress is an eval result.",
    },
    {
      id: 'm7-q13', kind: 'choice',
      prompt: "You switch a classifier to a reasoning model but leave max tokens at 20. Some replies come back empty. Why?",
      options: [
        { text: "Hidden reasoning used up the cap before any answer", why: "Yes. Reasoning tokens count towards max tokens and are billed as output." },
        { text: "Reasoning models need a temperature above 0 to answer", why: "Temperature isn’t why it’s empty; the budget went on thinking." },
        { text: "The provider hides the answer along with the reasoning", why: "The reasoning may be hidden, but the answer isn’t; there was no room for one." },
        { text: "The system prompt is too long for a reasoning model", why: "Input length doesn’t eat into max tokens, which caps output." },
      ],
      answer: 0,
      explain: "Give reasoning models a generous output budget, and expect higher cost and latency.",
    },
    {
      id: 'm7-q14', kind: 'choice',
      prompt: "Every night you summarise 20,000 support tickets for a report nobody reads before 8 am. What cuts cost the most?",
      options: [
        { text: "Send them through the provider’s batch API overnight", why: "Yes. Work that can wait hours is much cheaper through a batch API." },
        { text: "Run them all in parallel so the job finishes much sooner", why: "Faster, but you pay the same per token." },
        { text: "Stream each reply so tokens arrive as they’re made", why: "Streaming improves perceived speed in chat; it doesn’t change the price." },
        { text: "Use a reasoning model so each summary is shorter", why: "Reasoning tokens are billed as output, so it usually costs more." },
      ],
      answer: 0,
      explain: "If nobody is waiting, batch it.",
    },
    {
      id: 'm7-q15', kind: 'choice',
      prompt: "Long extractions sometimes fail to parse: the JSON stops mid-field, and the stop reason says the length limit was hit. Best fix?",
      options: [
        { text: "Raise max tokens, then validate and retry on failure", why: "Yes. Give the reply room, and keep a bounded validate-and-retry step." },
        { text: "Turn on strict schema mode so the JSON is always complete", why: "Strict mode can’t finish JSON that ran out of room." },
        { text: "Ask in the prompt for valid, complete JSON every time", why: "The model was writing valid JSON; it ran out of tokens." },
        { text: "Patch the cut-off JSON in code by closing the brackets", why: "The missing fields are simply lost, or you’d have to invent them." },
      ],
      answer: 0,
      explain: "Truncation is a length problem. Check the stop reason before blaming the schema.",
    },
  ],
  tasks: [
    { device: 'phone', plain: 'Learn what goes into an LLM API call: system prompt, messages, tokens, context window, latency and cost.', done: 'You can work out the cost of a call from its token counts and prices, and you’ve passed the Lesson 1 check.' },
    { device: 'phone', plain: 'Learn how structured outputs use a JSON Schema, and why you check the result again in your own code.', done: 'You can explain why valid JSON can still be wrong, and you’ve passed the Lesson 2 check.' },
    { device: 'computer', plain: 'Build a classifier and an extractor that each return data matching a fixed schema, checked with Pydantic.', done: 'Both functions return validated objects, and a deliberately malformed reply is caught and logged.' },
    { device: 'phone', plain: 'Learn how tool calling works: narrow tools, typed arguments, and your code (not the model) running them.', done: 'You can explain why a tool call is an untrusted request, and you’ve passed the Lesson 3 check.' },
    { device: 'computer', plain: 'Build a tool-calling loop with a hard step limit that logs every tool call.', done: 'The log shows each call’s tool, arguments and result, and a looping case stops at the limit with a clear error.' },
    { device: 'phone', plain: 'Learn how to choose a model: the cheapest, fastest one that meets a quality bar you measured.', done: 'You can explain the choice in the Lesson 4 comparison table.' },
    { device: 'computer', plain: 'Create an eval set of at least 50 labelled examples, including edge cases and past failures.', done: 'A file with 50+ inputs and expected outputs, plus a held-out portion you haven’t tuned on.' },
    { device: 'phone', plain: 'Learn accuracy, precision, recall and F1, and the cost of false positives and false negatives.', done: 'You can calculate all four from a set of counts and say which error costs more for a lead or ticket workflow.' },
    { device: 'computer', plain: 'Run the same eval set through two prompts or two models and compare quality, cost and latency.', done: 'A comparison table with your chosen option and the reason for choosing it.' },
    { device: 'phone', plain: 'Learn why a model’s self-reported confidence isn’t a reliable probability, and what to measure instead.', done: 'You can explain the problem with “auto-approve above 0.9” and suggest routing rules based on measured results.' },
    { device: 'computer', plain: 'Write and build a fallback policy for schema failures, provider timeouts, unclear or risky cases, and human review.', done: 'Each failure type is simulated once, and the log shows the fallback taken and the reason.' },
    { device: 'phone', plain: 'Learn how caching and shorter prompts cut cost and latency.', done: 'You can name what a result cache key must include and how to order a prompt for provider caching.' },
    { device: 'computer', plain: 'Store the prompt version and model alongside every output, so any result can be traced.', done: 'A database query that shows, for any output, which prompt version and model produced it.' },
    { device: 'computer', plain: 'Change the prompt, run your regression evals, and reject the change automatically if an important metric gets worse.', done: 'A CI run that fails on a worse prompt, and passes on one that holds the line.' },
  ],
};
