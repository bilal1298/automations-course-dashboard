import type { Lesson } from './types';

export const m7: Lesson = {
  intro: "An LLM is a powerful component with one awkward property: it’s probabilistic. The same input can give different outputs, and a confident-sounding answer can be wrong. This module teaches you to use it like an engineer: know what each call costs, force answers into a shape your code can check, let the model use tools safely, and above all **measure** how well it works with an evaluation set, instead of trusting a prompt that “feels better”. That last skill is what separates an AI demo from an AI system.",
  glossary: {
    'llm': 'Large Language Model: an AI model that reads text and writes text, like the models behind ChatGPT and Claude.',
    'token': 'The small chunk of text an LLM reads and writes, on average a bit less than one English word. You pay per token.',
    'context window': 'The most tokens a model can handle in one call: your input plus its reply.',
    'latency': 'How long you wait for a response.',
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
    'prompt caching': 'A provider feature that charges less, and often responds faster, when the start of your prompt matches a recent call.',
    'regression': 'Something that used to work getting worse after a change.',
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
        "**Tokens are the unit of everything.** An [[LLM]] reads and writes in [[token|tokens]], chunks of text a bit smaller than a word on average. You pay per token, with input and output priced separately; output usually costs more. The [[context window]] is the most tokens one call can hold, input plus reply.",
        "**The model remembers nothing between calls.** A chatbot only “remembers” because your code resends the whole conversation each time. So long conversations get slower and more expensive with every turn.",
        "**[[Latency]]** depends mostly on how much the model writes. A one-word label comes back far faster than a 500-word email. Asking for short, structured answers is the cheapest speed-up there is.",
        "**Cost per call** = input tokens × input price + output tokens × output price. Multiply by calls per day for a monthly bill. Prices change often, so check the provider’s pricing page rather than memorising numbers.",
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
      interview: "An LLM call is a stateless HTTP request: system instructions plus message history in, generated text out with a stop reason and token usage. Cost scales with input and output tokens, latency mostly with output length, and the context window bounds both. I log usage, latency and stop reason on every call so I can budget and catch truncated outputs.",
      check: [
        {
          id: 'm7-s0-1', kind: 'choice',
          prompt: "Your support chatbot’s cost per message keeps rising the longer a conversation goes on. Why?",
          options: [
            { text: "The whole conversation is resent as input on every turn, so input tokens keep growing", why: "Yes. The model is stateless; your code sends the history every time." },
            { text: "Providers charge more for loyal users", why: "Pricing is per token, not per user." },
            { text: "The model gets tired", why: "Models don’t tire; the input simply grows." },
            { text: "Temperature increases over time", why: "Temperature is a setting you choose; it doesn’t drift." },
          ],
          answer: 0,
          explain: "Trim or summarise old history to keep long conversations affordable.",
        },
        {
          id: 'm7-s0-2', kind: 'choice',
          prompt: "Generated summaries keep ending mid-sentence. The log shows the stop reason “hit max tokens”. What’s happening?",
          options: [
            { text: "The reply hit your length limit; raise the limit or ask for a shorter summary", why: "Right. The stop reason tells you it was cut off, not finished." },
            { text: "The provider is down", why: "An outage gives an error, not a partial reply with a stop reason." },
            { text: "The input was invalid JSON", why: "That would fail the request, not truncate the output." },
            { text: "Temperature is too low", why: "Temperature affects variety, not length." },
          ],
          answer: 0,
          explain: "Always check the stop reason. A cut-off reply can look like a complete one.",
        },
        {
          id: 'm7-s0-3', kind: 'choice',
          prompt: "Your ticket classifier replies with a label plus a paragraph explaining its reasoning. Which change cuts latency the most?",
          options: [
            { text: "Ask for the label only", why: "Yes. Latency is driven mainly by how much the model writes." },
            { text: "Make the ticket text longer", why: "More input adds time and cost; it doesn’t remove any." },
            { text: "Raise the temperature", why: "That changes variety, not speed." },
            { text: "Send the request twice and take the first reply", why: "That doubles your cost for a small, unreliable gain." },
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
        "**Structured output fixes the shape.** You give the provider a [[JSON schema]] describing exactly what to return: which fields, which types, which values are allowed. With the provider’s [[structured output]] mode on, the reply is JSON that fits it. (Defining a tool whose inputs are the schema has a similar effect; tools are next lesson.)",
        "Two common jobs:",
        "- **Classification**: pick one label from a fixed list. Use an `enum` (`billing`, `bug`, `other`), and always include an escape label like `other` or `unclear` so the model isn’t forced to guess.\n- **Extraction**: pull fields out of messy text, like the invoice number, amount and due date from an email. Make fields nullable and say “use null if not present”, or the model will invent something plausible.",
        "**Then validate again in your own code.** Your code is the last line of defence: a reply can be cut off, a setting can be wrong, and a provider may not enforce every schema rule. Parse the reply with a Pydantic model (Module 6), then apply business rules a schema can’t express: the due date isn’t in the past, the amount is positive, the currency is one you bill in.",
        "**The big catch: structured output fixes shape, not truth.** `{\"category\": \"billing\"}` is perfectly valid JSON even when the ticket is about a bug. Valid isn’t the same as correct. Only measuring against labelled examples tells you how often it’s right (Lesson 4).",
        "Keep simple, predictable work out of the model. If a pattern match or a lookup can find the order number, use that, and save the LLM for what genuinely needs judgement.",
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
      interview: "I define the output as a schema, with enums for labels and nullable fields for extraction, and use the provider’s structured-output or tool-input mode to constrain the shape. Then I parse it again with Pydantic and apply business rules in code. Structured output guarantees shape, not correctness, so accuracy is measured separately on an eval set.",
      check: [
        {
          id: 'm7-s1-1', kind: 'choice',
          prompt: "For the ticket “The app crashes when I open settings”, the model returns `{\"category\": \"billing\", \"urgent\": false}`. It passed schema validation. What does this show?",
          options: [
            { text: "A valid shape doesn’t mean a correct answer; only evals measure correctness", why: "Yes. The JSON is fine; the label is wrong." },
            { text: "The schema is broken", why: "The schema did its job: the shape is valid." },
            { text: "Structured output mode was off", why: "Even with it on, the model can choose the wrong valid label." },
            { text: "Pydantic should have caught it", why: "Pydantic checks shape and types, not whether a label is true." },
          ],
          answer: 0,
          explain: "Shape is enforced by schemas; truth is measured with labelled examples.",
        },
        {
          id: 'm7-s1-2', kind: 'choice',
          prompt: "Your invoice extractor fills in a due date even for emails that don’t mention one. What’s the best fix?",
          options: [
            { text: "Make due_date nullable, tell the model to use null when it’s absent, and check it in code", why: "Yes. Give the model an honest way to say “not there”." },
            { text: "Raise the temperature", why: "That makes output more varied, not more honest." },
            { text: "Remove due_date from the schema", why: "You still need it when it is present." },
            { text: "Accept it; the dates look realistic", why: "Realistic but invented dates are the dangerous kind of error." },
          ],
          answer: 0,
          explain: "If a field is required, the model will fill it, even by inventing something.",
        },
        {
          id: 'm7-s1-3', kind: 'choice',
          prompt: "Your categories are `billing`, `bug` and `feature_request`. A ticket asks about a partnership. What will the model do?",
          options: [
            { text: "Pick one of the three anyway, because it has no other option", why: "Right. Add an other or unclear label so it can say “none of these”." },
            { text: "Reply that none fit", why: "The schema doesn’t allow that, so it can’t." },
            { text: "Create a new category called partnership", why: "Structured output keeps it to the allowed values." },
            { text: "Return an error", why: "It will usually return a valid but wrong label." },
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
            { text: "Refuse in the tool code, because the permission check fails", why: "Yes. Permissions are enforced by your code, whatever the model asks for." },
            { text: "Run it; the model must have had a reason", why: "The model’s request is untrusted. This would leak another customer’s data." },
            { text: "Ask the model whether it’s sure", why: "The model can’t be the security check." },
            { text: "Run it but hide the amount", why: "Any of another customer’s data is a leak." },
          ],
          answer: 0,
          explain: "Tool calls are untrusted requests. Check permissions outside the model.",
        },
        {
          id: 'm7-s2-2', kind: 'choice',
          prompt: "An agent’s log shows `search_orders` called 40 times for one question, and the bill spiked. What was missing?",
          options: [
            { text: "A hard step limit that stops the loop with a clear failure", why: "Yes. Without a cap, a confused model can loop for a long time." },
            { text: "A bigger context window", why: "That would let the loop run even longer." },
            { text: "A higher temperature", why: "More randomness doesn’t stop a loop." },
            { text: "More tools", why: "More options rarely fix a loop; a limit does." },
          ],
          answer: 0,
          explain: "Bound every agent loop: steps, time and spend.",
        },
        {
          id: 'm7-s2-3', kind: 'choice',
          prompt: "You want the model to check order status. Which tool is the safest design?",
          options: [
            { text: "get_order_status(order_id) with a validated ID format", why: "Yes. Narrow, typed and read-only." },
            { text: "run_sql(query)", why: "The model could read or change anything in the database." },
            { text: "http_request(url)", why: "The model could call any address, including internal ones." },
            { text: "run_python(code)", why: "That gives the model a general-purpose computer." },
          ],
          answer: 0,
          explain: "The smaller the tool, the smaller the damage a wrong call can do.",
        },
      ],
    },
    {
      title: "Building an eval set and choosing a model",
      minutes: 6,
      body: [
        "**The problem.** You tweak a prompt, try three tickets, and it looks better. But did it break ten cases you didn’t try? Without measuring, you can’t know. The rule of this module: **progress is an eval result, not a feeling.**",
        "An [[eval set]] is a fixed list of real inputs with the correct answer for each, decided by a person. For a ticket classifier, that’s 50 or more tickets, each labelled `billing`, `bug` and so on. To build one:",
        "- Pull **real examples** (anonymised) in roughly the mix you see in practice.\n- Add **edge cases**: two issues in one ticket, sarcasm, other languages, near-empty messages.\n- Add every **past failure** you find. Bugs become test cases.\n- Have a person label them. If two people disagree on a label, your categories are unclear; fix the definitions first.",
        "Keep a **[[held-out set]]**: examples you never look at while improving the prompt. Otherwise you tune the prompt to your examples and the score flatters you.",
        "**Running an [[eval]]** is a loop: send each example, compare the output with the label in code, and record whether it was right, the latency and the tokens used. Save the prompt version and model with the results. OpenAI’s Evals, LangSmith or a short script all do this; the idea matters more than the tool.",
        "**Choosing a model.** Run the same eval set through two or three models (or prompts) and compare them side by side: quality, cost per 1,000 items and latency. Then pick **the cheapest, fastest option that meets your quality bar**. A bigger model that’s slightly better at many times the cost is rarely the right choice for routing tickets. If nothing meets the bar, that’s a finding too: maybe the task needs a human step.",
      ],
      example: {
        caption: 'Comparing candidates on the same eval set (illustrative)',
        code: `eval set: tickets-v3 (60 examples)      prompt: classify-v7
quality bar agreed with the client: 92%

candidate            accuracy   cost / 1,000   median latency
large model          95%        $$$$           2.1 s
small model          93%        $              0.6 s
small model + rules  94%        $              0.6 s

→ choose "small model + rules": meets the bar, cheapest, fastest`,
      },
      interview: "Before tuning I build a labelled eval set of at least 50 representative cases, edge cases and past failures, with a held-out split. Every candidate prompt or model runs on the same set, and I record quality, cost and latency together with the prompt and model version. Then I pick the cheapest configuration that clears the agreed quality bar.",
      check: [
        {
          id: 'm7-s3-1', kind: 'choice',
          prompt: "A colleague says their new prompt is better: “I tried it on three tickets and they all looked right.” What do you do?",
          options: [
            { text: "Run old and new prompts on the same eval set and compare the scores", why: "Yes. Three hand-picked tickets can’t show what broke elsewhere." },
            { text: "Ship it; three out of three is 100%", why: "Three examples say almost nothing about the other cases." },
            { text: "Try three more tickets", why: "Still far too few, and probably not representative." },
            { text: "Ask the model which prompt it prefers", why: "The model’s opinion isn’t a measurement." },
          ],
          answer: 0,
          explain: "Same data, both versions, compare the numbers.",
        },
        {
          id: 'm7-s3-2', kind: 'choice',
          prompt: "Two people label the same 60 tickets and disagree on 12 of them. What does that tell you?",
          options: [
            { text: "The category definitions are unclear and need tightening before you measure the model", why: "Yes. If people can’t agree, the model can’t be scored fairly." },
            { text: "One of the labellers is careless; ignore their labels", why: "Disagreement usually points at the definitions, not the person." },
            { text: "The model will sort it out", why: "The model needs clear labels to be measured against." },
            { text: "You need a bigger model", why: "This is a labelling problem, not a model problem." },
          ],
          answer: 0,
          explain: "Clear labels come before meaningful scores.",
        },
        {
          id: 'm7-s3-3', kind: 'choice',
          prompt: "The quality bar is 92%. Model A: 96%, high cost, 3 s. Model B: 94%, low cost, 0.5 s. Which do you choose for routing tickets?",
          options: [
            { text: "Model B: it meets the bar and is far cheaper and faster", why: "Yes. The cheapest, fastest option that meets the measured bar." },
            { text: "Model A: always use the most accurate model", why: "Extra accuracy beyond the bar rarely justifies a much higher cost and wait." },
            { text: "Neither; aim for 100%", why: "No model is perfect. Agree a bar and route the rest to people." },
            { text: "Whichever is newer", why: "Newer isn’t a measurement." },
          ],
          answer: 0,
          explain: "If the bar matters more than cost, raise the bar explicitly; don’t pick on instinct.",
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
          prompt: "A vendor says their fraud detector is “97% accurate”. Fraud is 3% of invoices. What do you ask?",
          options: [
            { text: "What are the precision and recall on the fraud cases?", why: "Yes. Labelling everything “not fraud” would also score 97%." },
            { text: "Nothing; 97% is excellent", why: "With 3% fraud, 97% accuracy can mean it catches none." },
            { text: "Which model do you use?", why: "The model matters less than how it performs on fraud cases." },
            { text: "Can you make it 99% accurate?", why: "Accuracy is the wrong number to chase here." },
          ],
          answer: 0,
          explain: "With rare classes, accuracy can look great while the system is useless.",
        },
        {
          id: 'm7-s4-3', kind: 'choice',
          prompt: "Leads labelled “VIP” automatically receive a large discount code by email. Which error is most costly, and which metric should you favour?",
          options: [
            { text: "False positives, which give discounts to the wrong people, so favour precision", why: "Yes. Each wrong “VIP” costs money and can’t be taken back." },
            { text: "False negatives, so favour recall", why: "A missed VIP can be followed up later; a wrongly sent discount can’t be recalled." },
            { text: "Neither; accuracy covers both", why: "Accuracy hides which kind of mistake you’re making." },
            { text: "Latency", why: "Speed isn’t the risk here; wrong outbound actions are." },
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
        "**Don’t trust the model’s own confidence.** It’s tempting to add `confidence: 0–1` to your schema and auto-approve anything above 0.9. The trouble: that number is just more generated text. It isn’t [[calibrated]]: answers marked 0.95 can be wrong far more often than 5% of the time, and the model sounds just as sure when it’s wrong.",
        "**Measure instead.** Use your eval set to find where the model is reliable and where it isn’t: maybe 98% right on `billing`, 70% on refund-versus-complaint, weak on non-English tickets. Turn that into routing rules your code can check: category, language, amount, missing fields.",
        "**A [[fallback]] policy** decides in advance what happens when the normal path fails. One line per failure:",
        "- **Schema failure** (the reply doesn’t validate): retry once, perhaps including the validation error; if it fails again, send it to review. Don’t retry the same prompt forever: a wrong answer isn’t a temporary error.\n- **Provider [[timeout]] or 5xx**: retry with [[exponential backoff]], then a backup model or provider, then queue it for later.\n- **Ambiguous or risky case** (the `unclear` label, a legal threat, a large refund): straight to a person.\n- **High-impact action** (moving money, emailing a customer): human approval, whatever the model says.",
        "**Human review is a feature, not a failure.** In n8n it can be a Slack or email message that waits for Approve or Reject, or a review table someone works through. Record every reviewer decision: those are free, high-quality labels for your next eval set.",
        "Log the reason each item took a fallback path. If 30% of items suddenly go to review, something changed. And never fail silently: every item ends up processed, reviewed or visibly failed.",
      ],
      interview: "I don’t treat model-reported confidence as a calibrated probability; I route on measured per-segment performance and deterministic signals. The fallback policy is explicit: one bounded retry on schema failure, backoff then a backup provider on timeouts, and human review for ambiguous, risky or high-impact cases. I log the fallback reason and feed reviewer decisions back into the eval set.",
      check: [
        {
          id: 'm7-s5-1', kind: 'choice',
          prompt: "Your system auto-approves refunds when the model reports confidence above 0.9. An audit finds many wrong approvals marked 0.97. What’s the better design?",
          options: [
            { text: "Route by measured performance and rules you can check, such as amount and category, with people reviewing risky cases", why: "Yes. Base decisions on behaviour measured on labelled data." },
            { text: "Raise the threshold to 0.99", why: "The number isn’t calibrated, so a higher cut-off doesn’t make it reliable." },
            { text: "Ask the model to be more honest about its confidence", why: "The self-reported number is still generated text." },
            { text: "Remove the confidence field and approve everything", why: "That removes the only check and keeps the risk." },
          ],
          answer: 0,
          explain: "Self-reported confidence isn’t a probability. Measure, then route.",
        },
        {
          id: 'm7-s5-2', kind: 'choice',
          prompt: "The same email fails schema validation three times in a row. What should happen next?",
          options: [
            { text: "Stop retrying and send it to human review, logging the reason", why: "Yes. Repeating the same prompt won’t fix a consistent failure." },
            { text: "Keep retrying until it passes", why: "That burns money and may never succeed." },
            { text: "Drop the email silently", why: "Never lose work silently." },
            { text: "Turn off schema validation", why: "Then bad data flows into your systems." },
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
      minutes: 6,
      body: [
        "**Cut cost before you have to.** Three habits:",
        "- **Send less.** Every token in the prompt is paid for on every call. Strip email signatures, HTML and quoted reply chains before sending. Send the three relevant documents, not thirty. Shorter prompts are faster too.\n- **Cache your own results.** If the same input arrives again with the same prompt version and model, reuse the stored answer instead of paying twice. Key the cache on all three, so a new prompt doesn’t return old answers.\n- **Use [[prompt caching]].** Major providers charge less when the start of a prompt matches a recent call. Put the stable parts first (instructions, examples) and the changing input last.",
        "**Version everything.** Give each prompt a version (`classify-v7`) and keep it in Git, not only inside an n8n node. Store the prompt version, model and settings next to **every output** in your database. When a client asks why a ticket was mislabelled last Tuesday, you can answer, and you can tell whether a [[regression]] started with a prompt change or a model change.",
        "**A regression gate** stops a change that makes things worse. Before a new prompt or model goes live:",
        "1. Run it on the full eval set, including the held-out examples.\n2. Compare it with the current version, metric by metric.\n3. **Reject it** if an important metric drops past an agreed limit, e.g. recall on `urgent` falls by more than 2 points, even if overall accuracy rose.\n4. If it passes, ship it and record the new version.",
        "Put the gate in [[CI/CD]] so it runs automatically whenever the prompt file changes. Providers also retire and update models; treat switching to a new model version exactly like a prompt change and run the gate first.",
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
      interview: "I minimise context, cache deterministic results keyed on input, prompt version and model, and order prompts so the provider’s prefix caching applies. Every output is stored with its prompt and model version, and prompt or model changes go through a CI regression gate on the eval set that rejects the change if a critical metric drops beyond an agreed tolerance.",
      check: [
        {
          id: 'm7-s6-1', kind: 'choice',
          prompt: "A new prompt raises overall accuracy from 91% to 93%, but recall on `urgent` falls from 90% to 80%. Missed urgent tickets are the client’s biggest risk. Do you ship it?",
          options: [
            { text: "No. The gate rejects it because the metric that matters most got worse", why: "Yes. An average can rise while the important part gets worse." },
            { text: "Yes. Accuracy went up", why: "Overall accuracy hides the drop on the label the client cares about." },
            { text: "Yes, and fix urgent recall next week", why: "That knowingly ships a regression on the riskiest case." },
            { text: "Ship it to half of users", why: "Half your users would still miss urgent tickets." },
          ],
          answer: 0,
          explain: "Gate on the metrics tied to the costliest mistakes, not just the headline number.",
        },
        {
          id: 'm7-s6-2', kind: 'choice',
          prompt: "Your cache is keyed only on the ticket text. After you deploy `classify-v8`, some tickets still get answers from v7. What’s the fix?",
          options: [
            { text: "Include the prompt version and model in the cache key", why: "Yes. A new prompt or model then misses the old cache entries." },
            { text: "Turn caching off for good", why: "That throws away the savings instead of fixing the key." },
            { text: "Lower the temperature", why: "The stale answers come from the cache, not the model." },
            { text: "Shorten the prompt", why: "That doesn’t change what the cache returns." },
          ],
          answer: 0,
          explain: "Cache keys must include everything that changes the answer.",
        },
        {
          id: 'm7-s6-3', kind: 'choice',
          prompt: "A client asks why ticket T-5512 was labelled wrongly three weeks ago. What lets you answer?",
          options: [
            { text: "The prompt version, model and settings stored with that output", why: "Yes. You can rerun that exact configuration and see if it’s been fixed since." },
            { text: "The current prompt in n8n", why: "It may have changed since then." },
            { text: "Asking the model why it did it", why: "The model has no memory of that call." },
            { text: "The provider’s status page", why: "That shows outages, not your outputs." },
          ],
          answer: 0,
          explain: "Without versions stored next to outputs, regressions can’t be traced.",
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
        { text: "Ask for a longer answer", why: "More output tokens cost more." },
        { text: "Raise the temperature", why: "Temperature doesn’t affect token count." },
        { text: "Send each email twice to be sure", why: "That doubles the cost." },
      ],
      answer: 0,
      explain: "Prompt minimisation is the simplest saving there is.",
    },
    {
      id: 'm7-q2', kind: 'choice',
      prompt: "Your call fails with “input exceeds the context window” when you send a whole 300-page contract. What do you do?",
      options: [
        { text: "Send only the relevant sections, or process the contract in parts", why: "Yes. The input plus reply must fit within the window." },
        { text: "Raise max_tokens", why: "That makes room for a longer reply, not more input." },
        { text: "Retry the same request", why: "It will fail the same way every time." },
        { text: "Lower the temperature", why: "Temperature doesn’t change the size limit." },
      ],
      answer: 0,
      explain: "The context window is a hard limit on input plus output.",
    },
    {
      id: 'm7-q3', kind: 'choice',
      prompt: "The team says: “We use structured outputs, so our extractor is accurate.” What’s wrong with that?",
      options: [
        { text: "Structured output guarantees the shape, not that the values are correct", why: "Yes. Valid JSON can still hold the wrong invoice number." },
        { text: "Nothing; structured output means correct", why: "Shape and truth are different things." },
        { text: "Structured outputs only work with XML", why: "They use JSON Schema." },
        { text: "Structured outputs make models slower", why: "Speed isn’t the issue being claimed." },
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
        { text: "due_date is required, so the model will invent dates when the email has none", why: "Yes. Make it date | None = None and say “null if not present”." },
        { text: "amount should be a string", why: "A number is right for an amount; the problem is elsewhere." },
        { text: "Pydantic can’t handle dates", why: "Pydantic handles dates fine." },
        { text: "There are too few fields", why: "More fields don’t fix invented values." },
      ],
      answer: 0,
      explain: "Give the model an honest “not present” option for every optional fact.",
    },
    {
      id: 'm7-q5', kind: 'choice',
      prompt: "The model calls your `issue_refund` tool with an amount of $4,800 for a $48 order. What should already be in place?",
      options: [
        { text: "Argument and business-rule checks in code, plus human approval for refunds", why: "Yes. The tool call is an untrusted request, and refunds are high-impact." },
        { text: "A better prompt telling the model to be careful", why: "Prompts help, but they can’t be the only safeguard." },
        { text: "A higher step limit", why: "The step limit stops loops; it doesn’t check amounts." },
        { text: "Nothing; the model knows the order amount", why: "It just showed it doesn’t reliably use it." },
      ],
      answer: 0,
      explain: "Validate arguments, enforce rules in code, and require approval for consequential actions.",
    },
    {
      id: 'm7-q6', kind: 'choice',
      prompt: "You improved the prompt by studying every failing example in the eval set, including the held-out ones. Now the score is 98%. What’s the problem?",
      options: [
        { text: "The held-out set is no longer unseen, so 98% likely overstates real performance", why: "Yes. You tuned to the test. Collect fresh held-out examples." },
        { text: "There’s no problem; 98% is great", why: "The score is now partly measuring your memory of the examples." },
        { text: "The eval set is too large", why: "Size isn’t the issue; contamination is." },
        { text: "You should have used a bigger model", why: "The issue is how the score was produced." },
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
        { text: "Both 50%", why: "Work through the counts: 30 of 40, and 30 of 40 flagged." },
      ],
      answer: 0,
      explain: "Recall ÷ by truly positive; precision ÷ by flagged positive.",
    },
    {
      id: 'm7-q8', kind: 'choice',
      prompt: "A workflow auto-closes support tickets the model labels “resolved”. Which mistake hurts most, and what do you favour?",
      options: [
        { text: "False positives, which close real open problems, so favour precision and review unclear cases", why: "Yes. A customer whose issue is closed unsolved is the costly error." },
        { text: "False negatives, so favour recall", why: "A resolved ticket left open just waits a little longer; that’s cheaper." },
        { text: "Latency, so pick the fastest model", why: "Speed isn’t the risk here." },
        { text: "Neither; accuracy is enough", why: "Accuracy hides which kind of error you’re making." },
      ],
      answer: 0,
      explain: "Tie the metric you optimise to the cost of each error type.",
    },
    {
      id: 'm7-q9', kind: 'choice',
      prompt: "Two models both meet your 90% quality bar. One costs a quarter as much and responds three times faster. What do you pick?",
      options: [
        { text: "The cheaper, faster one", why: "Yes. Both meet the measured bar, so cost and latency decide." },
        { text: "The more expensive one, to be safe", why: "Safety comes from the measured bar and fallbacks, not price." },
        { text: "Whichever has more parameters", why: "Size isn’t a measurement of your task." },
        { text: "Use both on every request", why: "That doubles cost without a clear reason." },
      ],
      answer: 0,
      explain: "Cheapest and fastest that meets the measured quality bar.",
    },
    {
      id: 'm7-q10', kind: 'choice',
      prompt: "A provider’s replies sometimes fail your Pydantic check. What’s a good fallback policy?",
      options: [
        { text: "Retry once with the validation error included; if it fails again, send it to review and log the reason", why: "Yes. Bounded, visible and recorded." },
        { text: "Retry until it passes", why: "Unbounded retries waste money and may never succeed." },
        { text: "Accept whatever comes back", why: "Invalid data will break something downstream." },
        { text: "Skip the item silently", why: "Silent loss is the worst outcome." },
      ],
      answer: 0,
      explain: "Every item ends up processed, reviewed or visibly failed.",
    },
    {
      id: 'm7-q11', kind: 'choice',
      prompt: "Which design makes the most of provider prompt caching?",
      options: [
        { text: "Fixed instructions and examples first, the changing ticket text last", why: "Yes. Caching works on a matching start of the prompt." },
        { text: "The ticket text first, instructions last", why: "The start changes every call, so nothing matches." },
        { text: "Add the current time at the start of every prompt", why: "That makes every prompt start differently." },
        { text: "Shuffle the examples on each call", why: "That changes the prompt’s start and defeats caching." },
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
