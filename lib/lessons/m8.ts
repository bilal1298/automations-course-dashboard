import type { Lesson } from './types';

export const m8: Lesson = {
  intro: "An AI model only knows what it learned in training plus whatever you put in the prompt. It has never seen your client’s refund policy, product manuals or past tickets. RAG fixes that: find the right passages first, then ask the model to answer from them. This module teaches the retrieval half properly, because that’s where most RAG systems fail: searching well, measuring it, keeping it permission-safe and keeping it up to date. Job ads call this “RAG”, “vector databases” or “semantic search”.",
  glossary: {
    "llm": "Large Language Model: the kind of AI model behind ChatGPT and Claude. It reads text and predicts a reply.",
    "hallucination": "When an AI model states something false in a confident, convincing way.",
    "context window": "The maximum amount of text a model can read in one request: the prompt plus anything you paste in.",
    "rag": "Retrieval-Augmented Generation: first search your documents for relevant passages, then have the model answer using only those.",
    "embedding": "A list of numbers that represents the meaning of a piece of text. Similar meanings get similar numbers.",
    "vector": "A list of numbers, e.g. [0.12, -0.48, 0.03, …]. An embedding is stored as a vector.",
    "cosine similarity": "A score for how closely two vectors point in the same direction. Near 1 means very similar meaning.",
    "semantic search": "Search by meaning rather than exact words, usually using embeddings.",
    "chunk": "A small piece of a document (e.g. a few paragraphs) that is embedded and searched on its own.",
    "chunk overlap": "A bit of text repeated at the end of one chunk and the start of the next, so ideas cut at the boundary aren’t lost.",
    "metadata": "Data about data: for a chunk, its source, page, version, owner and so on.",
    "pgvector": "A Postgres extension that adds a vector column type and fast similarity search.",
    "top-k": "The k best-scoring results, e.g. the top 10 chunks for a question.",
    "vector index": "A database index that finds the nearest vectors quickly without comparing against every row. HNSW is a common type.",
    "full-text search": "Keyword search built into a database: it matches the actual words (and their variants) and ranks the results.",
    "bm25": "A classic formula for ranking keyword search results: rare query words that appear in a passage count most.",
    "hybrid search": "Running semantic (vector) search and keyword search together and merging their results.",
    "reciprocal rank fusion": "A way to merge ranked lists using only each item’s position: score = sum of 1 / (k + rank).",
    "reranker": "A slower, more accurate model that reads a question and each candidate passage together and re-orders them by relevance.",
    "retrieval eval set": "A list of realistic questions, each labelled with the chunks that actually answer it, used to score your search.",
    "hit rate": "The share of questions where at least one correct chunk appears in the top k results.",
    "recall@k": "For one question, the share of all its correct chunks that appear in the top k results, averaged over questions.",
    "mrr": "Mean Reciprocal Rank: averages 1 / (position of the first correct result). Rewards putting a right answer near the top.",
    "tenant": "One customer (company) in a system shared by many customers. Each tenant’s data must stay separate.",
    "acl": "Access Control List: the rules for who may see or change a particular item.",
    "content hash": "A short fingerprint calculated from a document’s text. It changes only if the text changes.",
  },
  sections: [
    {
      title: "Why the AI doesn’t know your documents: RAG",
      minutes: 6,
      body: [
        "**The problem.** You build a support bot for a client. A customer asks “Can I get a refund after 30 days?” The [[LLM]] answers confidently, and wrongly. It has never seen this client’s refund policy. It learned from public text up to a cut-off date, and it can’t see the client’s Google Drive. When it doesn’t know, it often guesses in a convincing voice. That’s a [[hallucination]].",
        "**Pasting everything in doesn’t scale.** The model can only read a limited amount at once (its [[context window]]). Long prompts cost more and run slower, and the model gets worse at spotting the one relevant line in a huge pile.",
        "**The idea: [[RAG]]**, Retrieval-Augmented Generation. Two steps:",
        "1. **Retrieve**: search your documents for the few passages most likely to answer the question.\n2. **Generate**: give the model the question *plus those passages*, and tell it to answer only from them and say which one it used.",
        "**The analogy.** An open-book exam. The student (the model) is clever but hasn’t memorised your textbook. Retrieval is the index at the back of the book: it finds the right pages, so the student reads those instead of the whole book.",
        "**The key consequence.** The answer can only be as good as what you retrieve. If the right passage never reaches the model, no prompt wording can save it. So when a RAG answer is wrong, **check retrieval first**: did the relevant evidence make it into the prompt? Most of this module is about the retrieval half, because that’s where most of the real work is.",
      ],
      example: {
        caption: "A RAG support bot as an n8n-style flow",
        code: `Webhook: new support question
  → Embed the question            # turn it into numbers (Lesson 2)
  → Search the chunks table       # get the 5 best-matching passages
  → LLM: "Answer only from these passages and cite them.
          If they don't answer the question, say so."
  → Reply to the customer, with sources
  → Log question, chunk IDs and answer   # so you can debug later`,
      },
      interview: "RAG keeps knowledge outside the model: at query time I retrieve relevant, permission-filtered passages from an index and ground the generation in them with citations. I evaluate retrieval and generation separately, because if the evidence never reaches the context window, no prompt change can fix the answer.",
      check: [
        {
          id: "m8-s0-1", kind: "choice",
          prompt: "A bot confidently gives the wrong answer about a client’s internal holiday policy. What’s the most likely reason?",
          options: [
            { text: "The model has never seen that policy, so it guessed", why: "Right. Private documents aren’t in its training data unless you retrieve them and put them in the prompt." },
            { text: "The model is broken and needs reinstalling", why: "Nothing is broken. It’s doing what models do when they lack the facts: guessing plausibly." },
            { text: "The question was too short", why: "Short questions are fine. The model simply doesn’t have the document." },
            { text: "The model deliberately lied", why: "Models don’t intend anything. A confident wrong answer is a hallucination caused by missing information." },
          ],
          answer: 0,
          explain: "LLMs don’t know private or recent documents. RAG gives them the relevant passages at question time.",
        },
        {
          id: "m8-s0-2", kind: "choice",
          prompt: "Your RAG bot gave a wrong answer. What should you check first?",
          options: [
            { text: "Which passages were retrieved, and whether the right one was among them", why: "Yes. If the evidence never reached the model, nothing else matters yet." },
            { text: "Rewrite the answer prompt to be stricter", why: "If the right passage wasn’t retrieved, a better prompt can’t produce the right answer." },
            { text: "Switch to a bigger, more expensive model", why: "A bigger model still can’t answer from evidence it never received." },
            { text: "Add more documents to the index", why: "The answer may already be in the index but not retrieved. Look before you add." },
          ],
          answer: 0,
          explain: "Retrieval first, generation second. Most RAG failures are search failures.",
        },
      ],
    },
    {
      title: "Embeddings: searching by meaning",
      minutes: 6,
      body: [
        "**The problem.** A customer writes “How do I get my money back?”. The policy says “Refund requests must be submitted within 30 days.” They share almost no words, so a normal word search (like Ctrl+F) finds nothing. You need search by *meaning*.",
        "**The idea.** An [[embedding]] model reads a piece of text and turns it into a long list of numbers, a [[vector]], like `[0.12, -0.48, 0.03, …]` with hundreds or thousands of numbers. Texts with similar meaning get similar lists. “Get my money back” and “refund requests” land close together; “reset my password” lands far away.",
        "**The analogy.** A map. Every piece of text gets a location, and related topics sit in the same neighbourhood. Searching means finding where the question lands and grabbing its nearest neighbours.",
        "Closeness is usually measured with [[cosine similarity]], which compares the *direction* of two vectors. Near 1 means very similar. Databases often use **cosine distance** instead (1 minus similarity), so there *smaller is closer*. This whole approach is called [[semantic search]].",
        "Rules that matter:",
        "- **Use the same embedding model** for documents and questions. Vectors from different models live on different maps and can’t be compared.\n- **Changing the model means re-embedding everything.** Store which model made each vector.\n- **It’s weak at exact things.** Invoice numbers, error codes, SKUs and rare names: `INV-20931` and `INV-20913` can look almost identical to an embedding. Lesson 5 fixes this with keyword search.\n- **Nearest isn’t the same as relevant.** Semantic search always returns *something*, even when nothing in your documents answers the question.",
      ],
      example: {
        caption: "Semantic search in miniature (scores are illustrative)",
        code: `question = "How do I get my money back?"
q_vec = embed(question)    # same model that embedded the documents

# cosine similarity with three stored chunks (1 = same meaning)
# "Refund requests must be submitted within 30 days"   0.82  ← best
# "Our office is closed on public holidays"            0.21
# "Reset your password from the login page"            0.15`,
      },
      interview: "Embeddings map text into a vector space where semantic similarity becomes geometric closeness, usually measured with cosine similarity. Dense retrieval handles paraphrase well but is weak on exact identifiers and rare terms, and it always returns nearest neighbours even when nothing is relevant, so I pair it with lexical search and a relevance threshold. Vectors are tied to the model that produced them, so a model change means a full re-index.",
      check: [
        {
          id: "m8-s1-1", kind: "choice",
          prompt: "A user searches for invoice `INV-20931`, and semantic search returns `INV-20913` first. Why?",
          options: [
            { text: "Embeddings capture general meaning, so near-identical codes look almost the same", why: "Right. Exact identifiers are a known weak spot of semantic search." },
            { text: "The database is corrupted", why: "This is normal embedding behaviour, not corruption." },
            { text: "The invoice number was too long to embed", why: "Length isn’t the issue. Embeddings just don’t treat each character as important." },
            { text: "Cosine similarity only works on English words", why: "It works on any vectors. The problem is that the two codes have very similar embeddings." },
          ],
          answer: 0,
          explain: "For exact codes, names and numbers you need keyword search alongside semantic search.",
        },
        {
          id: "m8-s1-2", kind: "choice",
          prompt: "You start embedding new documents with a different model but keep the old vectors. Search quality collapses. Why?",
          options: [
            { text: "Vectors from different models can’t be compared, so old and new don’t match up", why: "Yes. Each model has its own “map”. Re-embed everything with one model." },
            { text: "The new model is worse", why: "Even a better model breaks search if old vectors came from a different one." },
            { text: "The database ran out of space", why: "Space wouldn’t make results irrelevant." },
            { text: "You need to restart Postgres", why: "Restarting doesn’t make incompatible vectors comparable." },
          ],
          answer: 0,
          explain: "Store the embedding model name with each vector, and re-index fully when you change it.",
        },
        {
          id: "m8-s1-3", kind: "choice",
          prompt: "Someone asks your HR bot “What is the CEO’s favourite colour?”. Semantic search still returns five chunks. Why?",
          options: [
            { text: "It always returns the nearest neighbours, even when none is relevant", why: "Right. “Nearest” isn’t “relevant”, so you need a threshold or an “insufficient evidence” path." },
            { text: "One of the documents must mention the CEO’s favourite colour", why: "Not necessarily. Search returns the closest chunks whether or not they answer the question." },
            { text: "The bot is broken", why: "This is normal behaviour that your design has to handle." },
            { text: "The question was embedded with the wrong model", why: "Even with the right model, search returns the closest matches it has." },
          ],
          answer: 0,
          explain: "Don’t assume retrieved means relevant. Lesson 7 covers answering “insufficient evidence”.",
        },
      ],
    },
    {
      title: "Chunking and ingestion: preparing documents",
      minutes: 6,
      body: [
        "**The problem.** A 40-page staff handbook is one document, but a question is usually answered by one paragraph. Embed the whole handbook as one vector and its meaning is a blur of everything. So you split documents into smaller pieces, called [[chunk|chunks]], and embed each one.",
        "**Chunk size is a trade-off:**",
        "- **Too small** (one sentence): the chunk loses context. “It must be submitted within 30 days.” *What* must?\n- **Too big** (whole chapters): the useful sentence is buried, the vector gets vague and the prompt gets expensive.\n- **[[Chunk overlap|Overlap]]**: repeat a little text between neighbouring chunks, so an idea cut at the boundary isn’t lost.",
        "Better than cutting every N characters: split on **natural boundaries** like headings and paragraphs. Keep a **table** together with its header row, or the numbers lose their meaning. A **parent/child** setup searches small, precise chunks but gives the model the larger section they came from.",
        "There’s no perfect size. Start with a sensible default (a few hundred words with some overlap), then compare options on your eval set (Lesson 6).",
        "**Ingestion** is the pipeline that loads, splits, embeds and stores documents. Save [[metadata]] with every chunk, or you can’t cite, filter or update later:",
        "- A stable **document ID** and **chunk ID**: the same document must produce the same IDs every time you run ingestion.\n- **Source** (file or URL), **page or section**, and **version**.\n- **Timestamps**: when it was ingested and when the source last changed.\n- **Who may see it**: tenant and permission info (Lesson 7).",
      ],
      example: {
        caption: "One stored chunk and its metadata (comments added for explanation)",
        code: `{
  "chunk_id": "staff-handbook#p12-c2",  // doc + page + position: same on every run
  "doc_id": "staff-handbook",
  "version": 3,
  "source": "drive://HR/Staff Handbook.pdf",
  "page": 12,
  "section": "Leave > Annual leave",
  "tenant_id": "acme",
  "allowed_groups": ["all-staff"],
  "content_hash": "9f2c…",              // changes only if the text changes
  "embedding_model": "embed-model-v2",
  "ingested_at": "2026-03-02T10:15:00Z",
  "content": "Annual leave requests must be approved by your manager…"
}`,
      },
      interview: "I chunk on structural boundaries such as headings and paragraphs, keep tables intact and use modest overlap; parent/child chunking lets me retrieve precise passages while giving the model enough context. Every chunk carries deterministic IDs, source, location, version, content hash, timestamps and ACL metadata, and I choose chunk size empirically against a retrieval eval set.",
      check: [
        {
          id: "m8-s2-1", kind: "choice",
          prompt: "Your chunks are single sentences. The bot retrieves “It must be submitted within 30 days” but can’t say what “it” is. What’s wrong?",
          options: [
            { text: "The chunks are too small and have lost their context", why: "Right. Use bigger chunks, overlap or parent/child retrieval." },
            { text: "The embedding model is too cheap", why: "No model can recover context that isn’t in the chunk." },
            { text: "The chunks are too big", why: "The opposite: one sentence is too little." },
            { text: "The prompt needs to say “be specific”", why: "The model can’t be specific about information it was never given." },
          ],
          answer: 0,
          explain: "Tiny chunks lose context; huge chunks bury it. Test sizes on real questions.",
        },
        {
          id: "m8-s2-2", kind: "choice",
          prompt: "Why must the same document produce the **same chunk IDs** every time you run ingestion?",
          options: [
            { text: "So re-running replaces chunks instead of piling up duplicates, and citations stay valid", why: "Yes. Stable IDs make ingestion repeatable and updates clean." },
            { text: "So the embeddings are calculated faster", why: "IDs don’t affect embedding speed." },
            { text: "Because Postgres requires IDs to be short", why: "It doesn’t; the point is that they’re stable." },
            { text: "So the model can memorise them", why: "The model doesn’t memorise your IDs; your code uses them." },
          ],
          answer: 0,
          explain: "Deterministic IDs are the RAG version of idempotency: running ingestion twice shouldn’t create two copies.",
        },
        {
          id: "m8-s2-3", kind: "choice",
          prompt: "A price table was split mid-way, so some chunks contain rows of numbers with no column names. What’s the fix?",
          options: [
            { text: "Keep tables together, or repeat the header row in each table chunk", why: "Right. Without headers, “49 | 12 | Yes” means nothing." },
            { text: "Delete tables from the documents", why: "You’d lose important information." },
            { text: "Make all chunks one sentence long", why: "That would split the table even more." },
            { text: "Ask the model to guess the columns", why: "Guessing is exactly what you’re trying to prevent." },
          ],
          answer: 0,
          explain: "Chunk along the document’s structure: headings, paragraphs, whole tables.",
        },
      ],
    },
    {
      title: "Storing vectors in Postgres with pgvector",
      minutes: 7,
      body: [
        "**The problem.** You now have thousands of chunks, each with a vector. You need somewhere to store them and a fast way to ask “which 10 are closest to this question?”.",
        "There are dedicated vector databases (Pinecone, Weaviate, Qdrant), but for most automation work you don’t need a new system. [[pgvector]] is an extension that adds a `vector` column type to **Postgres**, the database you may already use (Supabase runs on it). Chunks, metadata and permissions live in one table, and you can filter with normal SQL.",
        "The three parts of the example:",
        "1. **Turn it on**: `create extension vector;` once per database.\n2. **A table** with a `vector(1536)` column. The number must match how many numbers your embedding model outputs; 1536 is just an example.\n3. **A query** that sorts by distance. `<=>` is pgvector’s **cosine distance** operator (smaller = closer), and `limit 10` keeps the closest ten: your [[top-k]].",
        "**Speed.** Without an index, Postgres compares the question with every row. That’s fine for a few thousand chunks and slow for millions. An HNSW [[vector index]] finds near neighbours quickly by checking only some of the rows. The trade-off: it’s *approximate*, so it can occasionally miss a true nearest neighbour. Build the index for the same distance you query with (`vector_cosine_ops` goes with `<=>`).",
        "**Filter in the same query.** Put the tenant and permission conditions in the `where` clause, as in the example, so chunks a user mustn’t see are never candidates. One catch: with an approximate index plus a strict filter, you can get back fewer rows than you asked for. pgvector’s docs cover options for this; test with your real filters.",
      ],
      example: {
        caption: "pgvector: table, index and search",
        code: `create extension if not exists vector;

create table chunks (
  chunk_id   text primary key,     -- stable ID from ingestion
  doc_id     text not null,
  tenant_id  text not null,        -- which client owns it
  content    text not null,
  embedding  vector(1536)          -- must match your model's output size
);

-- fast, approximate search by cosine distance
create index on chunks using hnsw (embedding vector_cosine_ops);

-- the 10 closest chunks for this client
select chunk_id, content,
       embedding <=> $1 as distance    -- $1 = the question's vector
from chunks
where tenant_id = $2                  -- filter inside the search
order by embedding <=> $1             -- smallest distance first
limit 10;`,
      },
      interview: "For most projects I use Postgres with pgvector, so vectors live next to their metadata and ACLs and tenant filters go in the same SQL query. I use an HNSW index with the operator class matching the distance metric, remember it’s approximate, and check recall when strict filters are combined with the index.",
      check: [
        {
          id: "m8-s3-1", kind: "choice",
          prompt: "Your table has `embedding vector(1536)`, but inserts fail after you switch to a model that outputs 1024 numbers. Why?",
          options: [
            { text: "The column size must match the model’s output size", why: "Right. A 1024-number vector doesn’t fit a 1536 column. Change the column and re-embed everything." },
            { text: "pgvector only supports one model", why: "It supports any model; the column just has a fixed size." },
            { text: "The HNSW index is full", why: "Indexes don’t fill up like that. This is a size mismatch." },
            { text: "1024 is too small to be useful", why: "Many good models use 1024 numbers. It just has to match the column." },
          ],
          answer: 0,
          explain: "The `vector(n)` size is tied to your embedding model.",
        },
        {
          id: "m8-s3-2", kind: "choice",
          prompt: "Spot the bug. This query returns the *least* relevant chunks.",
          code: "select chunk_id, content\nfrom chunks\nwhere tenant_id = $2\norder by embedding <=> $1 desc\nlimit 10;",
          options: [
            { text: "`desc` sorts the largest distance first; distance needs smallest first", why: "Yes. `<=>` is a distance, so remove `desc`." },
            { text: "The `where` clause should come after `limit`", why: "SQL order is where → order by → limit. That part is fine." },
            { text: "`<=>` only works with a vector index", why: "It works with or without an index; the index just makes it faster." },
            { text: "`limit 10` is too small", why: "Ten is fine. The sort direction is the problem." },
          ],
          answer: 0,
          explain: "Distance: smaller is closer. Similarity: bigger is closer. Know which one you’re sorting by.",
        },
        {
          id: "m8-s3-3", kind: "choice",
          prompt: "A teammate searches all clients’ chunks, takes the top 10, then removes other clients’ chunks in n8n. What’s the problem?",
          options: [
            { text: "Other clients’ text has already passed through, and the client may be left with few or no results", why: "Right. Filter by tenant inside the search query instead." },
            { text: "n8n can’t handle 10 items", why: "It can. The issue is filtering too late." },
            { text: "It’s slower, but otherwise fine", why: "It’s also a data-separation risk and can return nothing useful." },
            { text: "Postgres can’t filter by tenant", why: "It can, with a normal `where` clause." },
          ],
          answer: 0,
          explain: "Filter first, rank second: forbidden chunks should never be candidates.",
        },
      ],
    },
    {
      title: "Keyword search, hybrid search and reranking",
      minutes: 7,
      body: [
        "**The problem.** A support agent searches “error E-4012”. Semantic search returns chunks about errors in general, and the one page that mentions `E-4012` comes 30th. Exact codes, SKUs, names and clause numbers need **exact matching**.",
        "**Keyword search** finds chunks that contain the actual words, and ranks them: rare words that appear often in a chunk count more. [[BM25]] is the classic formula for this. Postgres has built-in [[full-text search]]: it stores a searchable version of each chunk (a `tsvector`), matches queries against it, and ranks results with `ts_rank`. That isn’t exactly BM25, but it plays the same role.",
        "**[[Hybrid search]]** runs both searches and merges the two ranked lists. You can’t just add their scores, because they’re on different scales. [[Reciprocal rank fusion]] (RRF) uses only *positions*: each chunk gets `1 / (k + rank)` from each list, and the scores are summed. `k` is a constant (60 is common) that stops the very top spots dominating. A chunk ranked well in *both* lists rises to the top.",
        "**Reranking: retrieve wide, rerank narrow.** Both searches are fast but rough. A [[reranker]] is a slower, more accurate model that reads the question and each candidate *together* and scores how well the chunk answers it. So: take the top 50 from hybrid search, rerank them, and send only the best 5 to the LLM. You pay some extra time for much better ordering.",
        "Don’t assume each step helps. Compare vector-only, hybrid, and hybrid + reranker on the **same** eval set (next lesson), and record how long each takes.",
      ],
      example: {
        caption: "Reciprocal rank fusion, worked by hand (k = 60)",
        code: `Question: "error E-4012 after upgrade"

           vector rank   keyword rank
chunk A         1             8
chunk B         9             1
chunk C         2             2

A = 1/(60+1) + 1/(60+8) = 0.0164 + 0.0147 = 0.0311
B = 1/(60+9) + 1/(60+1) = 0.0145 + 0.0164 = 0.0309
C = 1/(60+2) + 1/(60+2) = 2/62          = 0.0323  ← wins: good in both`,
      },
      interview: "I combine dense retrieval for paraphrase with lexical retrieval, such as Postgres full-text search or BM25, for exact identifiers, and fuse the ranked lists with reciprocal rank fusion, which avoids comparing incompatible raw scores. Then I rerank a wide candidate set with a cross-encoder and pass a narrow top-k to the model, and I justify each stage with recall and latency on the same labelled set.",
      check: [
        {
          id: "m8-s4-1", kind: "choice",
          prompt: "Why can’t you merge vector and keyword results by simply adding their raw scores?",
          options: [
            { text: "The scores are on different scales, so one would swamp the other", why: "Right. RRF avoids this by using positions instead of raw scores." },
            { text: "Adding numbers is too slow in SQL", why: "Speed isn’t the issue; the scores aren’t comparable." },
            { text: "Keyword search doesn’t produce scores", why: "It does (e.g. ts_rank or BM25). They just mean something different." },
            { text: "You can, and that’s what RRF does", why: "RRF adds 1/(k + rank) values, not the raw scores." },
          ],
          answer: 0,
          explain: "Ranks are comparable across methods; raw scores aren’t.",
        },
        {
          id: "m8-s4-2", kind: "choice",
          prompt: "With RRF (k = 60): chunk A is rank 1 in vector search and missing from keyword results. Chunk B is rank 3 in both. Which ranks higher?",
          options: [
            { text: "B: 1/63 + 1/63 ≈ 0.0317 beats A’s 1/61 ≈ 0.0164", why: "Yes. Appearing in both lists beats one top spot." },
            { text: "A, because rank 1 always wins", why: "A only scores from one list, so its total is about half of B’s." },
            { text: "They tie", why: "Work it out: 0.0164 versus 0.0317." },
            { text: "Neither, because A is missing from one list", why: "Missing from a list just means it gets no points from that list." },
          ],
          answer: 0,
          explain: "RRF rewards agreement between methods.",
        },
        {
          id: "m8-s4-3", kind: "order",
          prompt: "Put the “retrieve wide, rerank narrow” pipeline in order.",
          items: ["Run vector search and keyword search", "Merge the two lists with reciprocal rank fusion", "Rerank the top 50 candidates with a reranker", "Send the best 5 chunks to the LLM"],
          explain: "Cheap and wide first, expensive and precise last.",
        },
      ],
    },
    {
      title: "Measuring retrieval and debugging bad answers",
      minutes: 7,
      body: [
        "**The problem.** You changed the chunk size and added a reranker. Is search better or worse? “It looks better on the three questions I tried” isn’t evidence. You need a test you can rerun.",
        "A [[retrieval eval set]] is a list of realistic questions, each labelled with the chunk(s) that actually answer it. Write them from real tickets where possible, plus edge cases: exact codes, vague wording, and questions your documents *can’t* answer. 30–50 is a useful start.",
        "Run every question through your search and score the results:",
        "- **[[Hit rate]]@k**: in what share of questions did *at least one* right chunk appear in the top k? The easiest to explain.\n- **[[Recall@k]]**: of all the right chunks for a question, what share made the top k? Averaged across questions.\n- **[[MRR]]**: how high the first right chunk sits. Rank 1 scores 1, rank 2 scores ½, rank 4 scores ¼. (NDCG is a similar, more detailed ranking score.)",
        "Compare vector-only, hybrid, and hybrid + reranker on the **same** questions, with timings, and keep the results table. That’s portfolio evidence.",
        "**Debugging a wrong answer.** Score retrieval separately from answer quality, so you know which half failed. For each bad answer, look at the retrieved chunks *before* touching the prompt:",
        "1. **Is the right text in the index at all?** If not, it’s an ingestion problem: file skipped, PDF table garbled.\n2. **Was it in the index but ranked below the cut-off?** A search or ranking problem: try hybrid, reranking or a larger k.\n3. **Did it reach the model, but the answer is still wrong?** Only now is it a generation problem (prompt or model).",
      ],
      example: {
        caption: "A tiny retrieval eval, scored at k = 5",
        code: `question                    right chunk    top-5 retrieved           hit?
"Refund after 30 days?"     refunds#c1     refunds#c1, faq#c4, …     ✅ rank 1
"What is error E-4012?"     errors#c12     errors#c3, setup#c2, …    ❌
"Do you ship to NZ?"        shipping#c2    faq#c9, shipping#c2, …    ✅ rank 2

Hit rate@5 = 2/3 = 67%
MRR = (1 + 0 + 1/2) / 3 = 0.50`,
      },
      interview: "I keep a labelled retrieval set mapping queries to relevant chunk IDs and track hit rate and recall at k plus MRR or NDCG, separately from answer-level metrics like faithfulness and correct abstention. When an answer is wrong I triage in order: was the evidence indexed, was it retrieved within k, and only then did the generator use it correctly.",
      check: [
        {
          id: "m8-s5-1", kind: "choice",
          prompt: "Your eval set has 40 questions. For 30 of them, at least one right chunk is in the top 5. What’s hit rate@5?",
          options: [
            { text: "75%", why: "Right: 30 ÷ 40." },
            { text: "30%", why: "That’s the count, not the share." },
            { text: "5%", why: "5 is k, the cut-off, not the score." },
            { text: "It can’t be calculated without MRR", why: "Hit rate stands on its own." },
          ],
          answer: 0,
          explain: "Hit rate@k = questions with at least one right chunk in the top k ÷ all questions.",
        },
        {
          id: "m8-s5-2", kind: "choice",
          prompt: "A bot answered wrongly. The log shows the correct chunk was ranked 14th, and only the top 5 go to the model. What kind of failure is it?",
          options: [
            { text: "A retrieval/ranking failure: try hybrid search, reranking or a larger k", why: "Yes. The evidence exists but didn’t make the cut." },
            { text: "A generation failure: rewrite the prompt", why: "The model never saw the right chunk, so the prompt isn’t the cause." },
            { text: "An ingestion failure: the document is missing", why: "It was found at rank 14, so it is in the index." },
            { text: "A model failure: use a bigger model", why: "A bigger model can’t use a chunk it never received." },
          ],
          answer: 0,
          explain: "Indexed? Retrieved within k? Used correctly? Answer these in order.",
        },
        {
          id: "m8-s5-3", kind: "choice",
          prompt: "Why include questions your documents **can’t** answer in the eval set?",
          options: [
            { text: "To check the system admits it doesn’t know instead of answering from irrelevant chunks", why: "Right. Search always returns something, so you need to test this case." },
            { text: "To make the scores look worse", why: "The aim is realism, not low scores." },
            { text: "Because the eval set must have exactly 50 questions", why: "There’s no fixed size. These cases test a real failure mode." },
            { text: "To train the embedding model", why: "Eval sets measure; they don’t train anything." },
          ],
          answer: 0,
          explain: "Unanswerable questions test the “insufficient evidence” path.",
        },
      ],
    },
    {
      title: "Citations, permissions and keeping the index fresh",
      minutes: 7,
      body: [
        "**Citations and “insufficient evidence”.** Pass each retrieved chunk to the model with its ID, and tell it to cite the IDs it used. Then check in code that every cited ID was actually retrieved, and show the source title and page to the user. If the chunks don’t support an answer, the right reply is “I don’t have enough information to answer that”, not a guess. You can also skip the LLM call entirely when even the best reranker score is below a threshold you chose using your eval set.",
        "**Permissions before retrieval.** Client A must never see Client B’s documents, and an intern mustn’t see HR files. Filter by [[tenant]] and [[ACL]] inside the search query, using the logged-in user’s identity from your server, never a value from the model or the request body. Don’t retrieve everything and tell the LLM to “ignore documents the user can’t see”: once text is in the prompt, it can leak. Also treat retrieved text as **data, not instructions**: a document saying “ignore your rules” must not change behaviour (Module 11).",
        "**Re-indexing without duplicates.** Documents change. If you just ingest again, old and new versions sit side by side and the bot quotes the outdated policy. Instead:",
        "1. Compare the document’s [[content hash]] with the stored one. Unchanged? Skip it.\n2. Changed? In one transaction, delete that document’s old chunks and insert the new ones.\n3. Deleted at the source? Delete its chunks too, or they’ll keep being retrieved.\n4. Changed the embedding model or chunking settings? Re-index everything.",
      ],
      example: {
        caption: "Replacing a changed document’s chunks in one transaction",
        code: `begin;
-- remove every chunk from the old version of this document
delete from chunks
where tenant_id = 'acme' and doc_id = 'refund-policy';

-- insert the new version's chunks
insert into chunks (chunk_id, doc_id, tenant_id, content, embedding)
values ('refund-policy#c1', 'refund-policy', 'acme', '…', '[…]'),
       ('refund-policy#c2', 'refund-policy', 'acme', '…', '[…]');
commit;   -- both happen, or neither: no half-updated document`,
      },
      interview: "Answers cite chunk IDs that I validate against the retrieved set, and the system abstains with an explicit insufficient-evidence response when support is weak. Tenant and ACL filters are applied inside the retrieval query from the authenticated identity, never by the model. Ingestion is idempotent: content hashes skip unchanged documents, changed documents replace their chunks atomically, and deletions propagate to the index.",
      check: [
        {
          id: "m8-s6-1", kind: "choice",
          prompt: "After the refund policy changed from 14 to 30 days, the bot sometimes says 14 and sometimes 30. What happened?",
          options: [
            { text: "The new version was ingested without removing the old version’s chunks", why: "Right. Replace a document’s chunks; don’t just add more." },
            { text: "The model is random", why: "The inconsistency comes from two conflicting chunks in the index." },
            { text: "The embedding model changed", why: "That would hurt search in general, not cause this specific conflict." },
            { text: "The cache needs clearing", why: "The stale chunks are in the index itself." },
          ],
          answer: 0,
          explain: "Re-indexing = delete old chunks and insert new ones together, keyed by a stable document ID.",
        },
        {
          id: "m8-s6-2", kind: "choice",
          prompt: "A developer retrieves chunks from all clients and adds “Only use documents for tenant acme” to the prompt. What’s wrong?",
          options: [
            { text: "Other clients’ text is already in the prompt and can leak; filter in the query instead", why: "Yes. Permissions belong in code, before retrieval, not in a request to the model." },
            { text: "Nothing, as long as the model is reliable", why: "A prompt is not a lock. One mistake or manipulation leaks another client’s data." },
            { text: "The tenant name should be in capitals", why: "Formatting doesn’t change the risk." },
            { text: "It just wastes tokens", why: "It does, but the bigger problem is a data leak." },
          ],
          answer: 0,
          explain: "The model can’t leak what it never sees.",
        },
        {
          id: "m8-s6-3", kind: "choice",
          prompt: "The model’s answer cites chunk `faq#c99`, but that chunk wasn’t in the retrieved set. What should your code do?",
          options: [
            { text: "Treat the citation as invalid: flag or reject the answer", why: "Right. A citation to something it never saw is made up." },
            { text: "Trust it; the model must know about faq#c99", why: "It only saw the retrieved chunks. This citation is invented." },
            { text: "Look up faq#c99 and show it to the user", why: "That shows a source the answer wasn’t actually based on." },
            { text: "Remove the citation and send the answer anyway", why: "The answer may be unsupported. Don’t hide the warning sign." },
          ],
          answer: 0,
          explain: "Check citations against the retrieved IDs in code.",
        },
      ],
    },
  ],
  quiz: [
    {
      id: "m8-q1", kind: "choice",
      prompt: "A client wants a bot that answers staff questions from 500 internal documents that change every month. What’s the best starting approach?",
      options: [
        { text: "RAG: index the documents, retrieve relevant chunks per question, answer from them with citations", why: "Yes. Changes only require re-indexing, and answers can cite sources." },
        { text: "Paste all 500 documents into every prompt", why: "Too long, too expensive, and the model gets worse at finding the right line." },
        { text: "Rely on the model’s general knowledge", why: "It has never seen these internal documents." },
        { text: "Ask staff to search the documents themselves", why: "That isn’t an automation." },
      ],
      answer: 0,
      explain: "RAG keeps knowledge in your index, where it’s easy to update and cite.",
    },
    {
      id: "m8-q2", kind: "choice",
      prompt: "A user asks “How do I cancel my plan?”. The help article says “To end your subscription, go to Billing.” Which search is most likely to find it?",
      options: [
        { text: "Semantic (embedding) search", why: "Yes. The meaning matches even though the words don’t." },
        { text: "Exact keyword search on “cancel” and “plan”", why: "Neither word appears in the article." },
        { text: "Sorting documents by date", why: "That ignores the question completely." },
        { text: "Searching only the titles", why: "The title might not use those words either." },
      ],
      answer: 0,
      explain: "Semantic search handles paraphrase; keyword search handles exact terms.",
    },
    {
      id: "m8-q3", kind: "choice",
      prompt: "What’s missing from this search query in a system shared by many clients?",
      code: "select chunk_id, content\nfrom chunks\norder by embedding <=> $1\nlimit 5;",
      options: [
        { text: "A `where tenant_id = …` filter, so only this client’s chunks are searched", why: "Right. Without it, any client can retrieve another client’s documents." },
        { text: "A `desc` on the order by", why: "Distance should be sorted smallest first, so no desc." },
        { text: "A bigger limit", why: "The limit isn’t the security problem." },
        { text: "Nothing; it’s correct", why: "It searches every tenant’s data." },
      ],
      answer: 0,
      explain: "Tenant and permission filters go inside the retrieval query.",
    },
    {
      id: "m8-q4", kind: "choice",
      prompt: "Your chunks are 5,000 words each. Answers are vague and each request is expensive. What’s the likely fix?",
      options: [
        { text: "Use smaller chunks split on headings and paragraphs, then re-test", why: "Yes. Huge chunks give vague vectors and bloated prompts." },
        { text: "Use even bigger chunks", why: "That makes both problems worse." },
        { text: "Remove the metadata", why: "Metadata isn’t causing this, and you need it for citations and filters." },
        { text: "Switch off the vector index", why: "That only makes search slower." },
      ],
      answer: 0,
      explain: "Chunk size is a trade-off you tune against an eval set.",
    },
    {
      id: "m8-q5", kind: "choice",
      prompt: "Searches for product code `BX-220-A` keep returning other products. What would most likely help?",
      options: [
        { text: "Add keyword (full-text) search and merge it with vector search (hybrid)", why: "Yes. Keyword search matches exact codes." },
        { text: "Use a bigger embedding model", why: "Exact codes stay a weak spot for embeddings." },
        { text: "Lower the temperature of the LLM", why: "This is a retrieval problem, not a generation setting." },
        { text: "Make chunks smaller", why: "Chunk size doesn’t fix exact-match weaknesses." },
      ],
      answer: 0,
      explain: "Hybrid search = semantic meaning + lexical exactness.",
    },
    {
      id: "m8-q6", kind: "choice",
      prompt: "What does a reranker do in a RAG pipeline?",
      options: [
        { text: "Re-orders a set of candidate chunks by reading the question and each chunk together", why: "Right. It’s slower but more accurate, so it runs on a short list." },
        { text: "Creates the embeddings for new documents", why: "That’s the embedding model." },
        { text: "Searches the whole database from scratch", why: "It’s too slow for that; it only sees the candidates." },
        { text: "Writes the final answer", why: "That’s the LLM’s job, after reranking." },
      ],
      answer: 0,
      explain: "Retrieve wide (fast search), rerank narrow (accurate model).",
    },
    {
      id: "m8-q7", kind: "choice",
      prompt: "One question has 4 relevant chunks. Your top 5 results contain 3 of them. What’s Recall@5 for that question?",
      options: [
        { text: "75%", why: "Right: 3 of the 4 relevant chunks were found." },
        { text: "60%", why: "That’s 3 out of 5 results, which is precision, not recall." },
        { text: "100%", why: "One relevant chunk was missed." },
        { text: "33%", why: "Recall divides by the number of relevant chunks (4)." },
      ],
      answer: 0,
      explain: "Recall@k = relevant chunks found in the top k ÷ all relevant chunks.",
    },
    {
      id: "m8-q8", kind: "order",
      prompt: "Order the checks for debugging a wrong RAG answer.",
      items: ["Is the right text in the index at all?", "Was it retrieved within the top k?", "Did it reach the model’s prompt?", "Did the model use it correctly?"],
      explain: "Ingestion → retrieval → context → generation. Fix the first one that fails.",
    },
    {
      id: "m8-q9", kind: "choice",
      prompt: "A user asks something your documents don’t cover. What should a well-built RAG bot reply?",
      options: [
        { text: "That it doesn’t have enough information to answer", why: "Yes. An honest “insufficient evidence” beats a confident guess." },
        { text: "Its best guess from general knowledge", why: "That’s exactly the hallucination RAG is meant to prevent." },
        { text: "An answer built from the closest chunks, even if off-topic", why: "Nearest isn’t relevant. That produces misleading answers." },
        { text: "Nothing at all", why: "Silence confuses users. Say clearly that the information isn’t available." },
      ],
      answer: 0,
      explain: "Abstaining correctly is part of quality, and you can test it in your eval set.",
    },
    {
      id: "m8-q10", kind: "choice",
      prompt: "An old pricing PDF was deleted from Google Drive last month, but the bot still quotes it. What was missed?",
      options: [
        { text: "Deleting the document’s chunks from the index when the source was deleted", why: "Right. Deletions must flow through to the vector store." },
        { text: "Re-embedding the question", why: "Questions are embedded fresh each time already." },
        { text: "Adding more overlap", why: "Overlap doesn’t remove stale content." },
        { text: "Using a reranker", why: "A reranker might even rank the stale chunk highly." },
      ],
      answer: 0,
      explain: "Ingestion must handle create, update and delete, not just create.",
    },
    {
      id: "m8-q11", kind: "choice",
      prompt: "You switch to a new embedding model. What else must you do?",
      options: [
        { text: "Re-embed every chunk with the new model, and re-run your eval set", why: "Yes. Old and new vectors aren’t comparable, and quality must be re-checked." },
        { text: "Nothing; the database converts the vectors", why: "Vectors can’t be converted between models." },
        { text: "Only embed new documents with the new model", why: "Then old and new vectors sit on different “maps”." },
        { text: "Rewrite the answer prompt", why: "The prompt isn’t affected; the index is." },
      ],
      answer: 0,
      explain: "Store the model name with each vector so you know when a re-index is needed.",
    },
    {
      id: "m8-q12", kind: "choice",
      prompt: "Your team wants to prove hybrid search plus a reranker is worth the extra time. What’s the convincing evidence?",
      options: [
        { text: "Hit rate, recall and timing for vector-only, hybrid and hybrid + reranker on the same labelled questions", why: "Right. Same questions, measured side by side." },
        { text: "A demo of three questions that look better", why: "Hand-picked examples aren’t evidence." },
        { text: "The reranker vendor’s benchmark", why: "Their data isn’t your data." },
        { text: "Users saying it feels smarter", why: "Feedback helps, but it can’t tell you which part improved." },
      ],
      answer: 0,
      explain: "Measure each variant on one fixed eval set, including latency.",
    },
  ],
  tasks: [
    { device: "phone", plain: "Learn what embeddings are, how similarity is measured, and what semantic search can and can’t find.", done: "You can explain why “money back” matches “refund” but `INV-20931` might not match exactly, and you’ve passed the Lesson 2 check." },
    { device: "computer", plain: "Write an ingestion script that splits documents into chunks and saves each with a stable document ID, chunk ID, source, page or section, version and timestamps.", done: "Running it twice on the same files gives the same chunk IDs and no extra rows." },
    { device: "phone", plain: "Learn the chunking trade-offs: size, overlap, splitting on headings, parent/child chunks and keeping tables intact.", done: "You can explain what goes wrong with chunks that are too small and too big, and you’ve passed the Lesson 3 check." },
    { device: "computer", plain: "Store your chunks and their embeddings in Postgres with pgvector, with an HNSW index, and query the closest chunks for a question.", done: "A SQL query returns the top 10 chunks for a test question, filtered by tenant." },
    { device: "phone", plain: "Learn how keyword (full-text) search works in Postgres, what BM25 is, and why exact terms like codes and names need it.", done: "You can give two example questions where keyword search beats semantic search." },
    { device: "computer", plain: "Build hybrid search: run vector and keyword searches, then merge the lists with reciprocal rank fusion.", done: "A question with an exact code finds the right chunk with hybrid search that vector-only search ranked lower." },
    { device: "phone", plain: "Learn reranking: retrieve a wide set of candidates fast, then re-order a short list with a more accurate model.", done: "You can explain “retrieve wide, rerank narrow” and order the pipeline in the Lesson 5 check." },
    { device: "computer", plain: "Create a retrieval eval set: at least 30 realistic questions, each labelled with the chunk IDs that answer it, including some unanswerable ones.", done: "A file (CSV or JSON) of questions with their correct chunk IDs." },
    { device: "phone", plain: "Learn Recall@k, hit rate and MRR (and what NDCG is for), well enough to calculate them by hand.", done: "You can work out hit rate and MRR for a small table, and you’ve passed the Lesson 6 check." },
    { device: "computer", plain: "Score vector-only, hybrid and hybrid + reranker on the same eval set.", done: "A results table with hit rate or recall, MRR and time per query for all three." },
    { device: "computer", plain: "Make the bot answer with citations to chunk IDs (checked in code) and reply “insufficient evidence” when the chunks don’t support an answer.", done: "One answered question showing its sources, and one unanswerable question that gets the “insufficient evidence” reply." },
    { device: "phone", plain: "Learn how tenant and permission (ACL) filters keep one user or client from retrieving another’s documents.", done: "You can explain why the filter must be in the search query, not in the prompt." },
    { device: "computer", plain: "Re-index a changed document without leaving duplicates, and remove chunks for deleted documents.", done: "After editing and then deleting a test document, the chunks table holds only current content." },
    { device: "computer", plain: "Take five wrong answers and diagnose each by inspecting the retrieved chunks before changing the prompt.", done: "A short note for each: ingestion, retrieval or generation failure, and the fix." },
  ],
};
