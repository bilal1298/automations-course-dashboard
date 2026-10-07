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
            { text: "It never saw that policy, so it filled the gap with a guess", why: "Right. Private documents aren’t in its training data unless you retrieve them and put them in the prompt." },
            { text: "The temperature is too high, so it drifted from the real policy", why: "Temperature changes variety, but even at zero the model can’t know a policy it never saw." },
            { text: "The question was too vague for the model to look up the policy", why: "The model doesn’t look anything up by itself. Without retrieval it has no access to the policy." },
            { text: "The model is out of date and needs a newer training cut-off", why: "A newer model still never trained on this client’s private documents." },
          ],
          answer: 0,
          explain: "LLMs don’t know private or recent documents. RAG gives them the relevant passages at question time.",
        },
        {
          id: "m8-s0-2", kind: "choice",
          prompt: "Your RAG bot gave a wrong answer. What should you check first?",
          options: [
            { text: "Which passages were retrieved, and whether the right one was there", why: "Yes. If the evidence never reached the model, nothing else matters yet." },
            { text: "The answer prompt, to make the “only use the passages” rule stricter", why: "If the right passage wasn’t retrieved, a stricter prompt can’t produce the right answer." },
            { text: "Whether a bigger, more capable model gets the same question right", why: "A bigger model still can’t answer from evidence it never received." },
            { text: "Whether the temperature is low enough to give consistent answers", why: "Consistency isn’t the issue. An answer can be consistently wrong when the evidence is missing." },
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
            { text: "Embeddings capture overall meaning, so near-identical codes look alike", why: "Right. Exact identifiers are a known weak spot of semantic search." },
            { text: "The chunks are too large, so the invoice number gets diluted in the vector", why: "Smaller chunks help a little, but even a chunk holding only the code embeds almost the same as its neighbour." },
            { text: "The index is approximate, so it returned a close neighbour by mistake", why: "HNSW can occasionally miss, but here the two codes really do score almost the same. An exact scan would rank them the same way." },
            { text: "The question and documents were embedded with different settings", why: "Mismatched models break search across the board. This near-miss happens even with the same model." },
          ],
          answer: 0,
          explain: "For exact codes, names and numbers you need keyword search alongside semantic search.",
        },
        {
          id: "m8-s1-2", kind: "choice",
          prompt: "You start embedding new documents with a different model but keep the old vectors. Search quality collapses. Why?",
          options: [
            { text: "Old and new vectors come from different models and can’t be compared", why: "Yes. Each model has its own “map”. Re-embed everything with one model." },
            { text: "The new model produces lower-quality vectors than the original one did", why: "Even a better model breaks search when the old vectors came from a different one." },
            { text: "The HNSW index needs rebuilding before it can see the new vectors", why: "New rows are added to the index automatically. The vectors themselves don’t match up." },
            { text: "The new vectors need normalising so their scores match the old ones", why: "Normalising changes a vector’s length, not which “map” it lives on. Cross-model vectors stay incomparable." },
          ],
          answer: 0,
          explain: "Store the embedding model name with each vector, and re-index fully when you change it.",
        },
        {
          id: "m8-s1-3", kind: "choice",
          prompt: "Someone asks your HR bot “What is the CEO’s favourite colour?”. Semantic search still returns five chunks. Why?",
          options: [
            { text: "Search always returns the nearest chunks, even when none is relevant", why: "Right. “Nearest” isn’t “relevant”, so you need a threshold or an “insufficient evidence” path." },
            { text: "A document must mention the CEO, and search matched on that name instead", why: "Not necessarily. Nearest-neighbour search returns the closest chunks whether or not any is related." },
            { text: "The question was embedded with a different model from the documents", why: "Even with the right model, search returns the closest matches it has." },
            { text: "The index is approximate, so it pads the results up to the limit", why: "Approximation can miss neighbours; it doesn’t invent matches. Exact search also returns k results." },
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
        "**Most RAG problems start before chunking, at parsing**: turning PDFs, scans and tables into clean text. A table flattened into jumbled numbers can’t be fixed later. Tools like Docling, Unstructured or LlamaParse handle layouts and tables; scanned pages need OCR (reading text from an image). Once that works, two common next steps are *contextual retrieval* (adding a line of document context to each chunk before embedding) and *query rewriting* (rephrasing vague questions before searching).",
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
            { text: "The chunks are too small, so each has lost its surrounding context", why: "Right. Use bigger chunks, overlap or parent/child retrieval." },
            { text: "The embedding model is too weak to work out what “it” refers to here", why: "No model can recover context that isn’t in the chunk." },
            { text: "There’s too much overlap, so the start of the rule got cut off", why: "Overlap repeats text between chunks. It adds context rather than removing it." },
            { text: "The answer prompt should tell the model to infer what “it” means", why: "The model could only guess: the missing words were never given to it." },
          ],
          answer: 0,
          explain: "Tiny chunks lose context; huge chunks bury it. Test sizes on real questions.",
        },
        {
          id: "m8-s2-2", kind: "choice",
          prompt: "Why must the same document produce the **same chunk IDs** every time you run ingestion?",
          options: [
            { text: "So re-runs replace chunks instead of piling up duplicates", why: "Yes. Stable IDs make ingestion repeatable, updates clean and citations valid." },
            { text: "So the embedding model returns the same vector for unchanged text", why: "The vector depends on the text and the model, not on the ID." },
            { text: "So the vector index can find each chunk faster during search", why: "Search works on the vectors, not the IDs." },
            { text: "So the database can sort chunks back into their original order", why: "Order can come from page and position fields. The real reason is avoiding duplicates on re-runs." },
          ],
          answer: 0,
          explain: "Deterministic IDs are the RAG version of idempotency: running ingestion twice shouldn’t create two copies.",
        },
        {
          id: "m8-s2-3", kind: "choice",
          prompt: "A price table was split mid-way, so some chunks contain rows of numbers with no column names. What’s the fix?",
          options: [
            { text: "Keep each table whole, or repeat its header row in every chunk", why: "Right. Without headers, “49 | 12 | Yes” means nothing." },
            { text: "Add more chunk overlap so neighbouring chunks share more of the rows", why: "Overlap repeats rows, not the header, so most chunks still lack column names." },
            { text: "Convert the table to plain sentences with the LLM after retrieval", why: "By then the headers are gone, so the LLM would be guessing." },
            { text: "Use a larger embedding model that understands tabular numbers", why: "No model can recover column names the chunk doesn’t contain." },
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
        "1. **Turn it on**: `create extension vector;` once per database.\n2. **A table** with a `vector(1536)` column. The number must match how many numbers your embedding model outputs; 1536 is just an example. HNSW indexes `vector` columns up to 2,000 dimensions; for bigger models use `halfvec` (up to 4,000) or ask the model for fewer dimensions if it supports that.\n3. **A query** that sorts by distance. `<=>` is pgvector’s **cosine distance** operator (smaller = closer), and `limit 10` keeps the closest ten: your [[top-k]].",
        "**Speed.** Without an index, Postgres compares the question with every row. That’s fine for a few thousand chunks and slow for millions. An HNSW [[vector index]] finds near neighbours quickly by checking only some of the rows. The trade-off: it’s *approximate*, so it can occasionally miss a true nearest neighbour. Build the index for the same distance you query with (`vector_cosine_ops` goes with `<=>`).",
        "**Filter in the same query.** Put the tenant and permission conditions in the `where` clause, as in the example, so chunks a user mustn’t see are never candidates. One catch: by default HNSW returns at most `hnsw.ef_search` (40) rows, so `limit 50` gives 40 at most, and a strict filter can leave only a handful. On pgvector 0.8+, run `SET hnsw.iterative_scan = relaxed_order;` and raise `hnsw.ef_search` to at least your limit. Always check how many rows you actually got back.",
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
            { text: "The column’s size must match the number of values the model outputs", why: "Right. A 1024-number vector doesn’t fit a 1536 column. Change the column and re-embed everything." },
            { text: "The HNSW index was built for the old model and must be dropped first", why: "Dropping the index doesn’t help. The column itself only accepts 1536 numbers." },
            { text: "pgvector needs the new model registered before it accepts its vectors", why: "pgvector knows nothing about models. It only checks the vector’s size." },
            { text: "1024 dimensions is below the minimum pgvector can index with HNSW", why: "HNSW has a maximum (2,000 for `vector`), not a 1024 minimum." },
          ],
          answer: 0,
          explain: "The `vector(n)` size is tied to your embedding model.",
        },
        {
          id: "m8-s3-2", kind: "choice",
          prompt: "Spot the bug. This query returns the *least* relevant chunks.",
          code: "select chunk_id, content\nfrom chunks\nwhere tenant_id = $2\norder by embedding <=> $1 desc\nlimit 10;",
          options: [
            { text: "`desc` puts the largest distance first, but closest means smallest", why: "Yes. `<=>` is a distance, so remove `desc`." },
            { text: "`<=>` returns similarity, so it needs wrapping as 1 minus the value", why: "`<=>` is cosine distance already. Removing `desc` is the fix." },
            { text: "The `where` filter runs after the sort, so it removes the best rows", why: "The filter limits which rows are candidates; it isn’t what reverses the order." },
            { text: "`limit 10` is applied before the sort, so the order is random", why: "SQL sorts first, then applies the limit." },
          ],
          answer: 0,
          explain: "Distance: smaller is closer. Similarity: bigger is closer. Know which one you’re sorting by.",
        },
        {
          id: "m8-s3-3", kind: "choice",
          prompt: "A teammate searches all clients’ chunks, takes the top 10, then removes other clients’ chunks in n8n. What’s the problem?",
          options: [
            { text: "Other clients’ text was already fetched, and few results may be left", why: "Right. Filter by tenant inside the search query instead." },
            { text: "It’s just slower; filtering in n8n gives the same final results anyway", why: "It’s a data-separation risk, and the client may be left with few or no chunks." },
            { text: "n8n’s Filter node can’t compare tenant IDs reliably across items", why: "It can. The problem is filtering after ranking, not the node." },
            { text: "It’s fine as long as n8n runs on the same server as Postgres", why: "Location doesn’t matter. Other clients’ data has still been fetched." },
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
        "**Keyword search** finds chunks that contain the actual words, and ranks them: rare words that appear often in a chunk count more. [[BM25]] is the classic formula for this. Postgres has built-in [[full-text search]]: it stores a searchable version of each chunk (a `tsvector`), matches queries against it, and ranks results with `ts_rank`. That isn’t exactly BM25, but it plays the same role. For true BM25 in Postgres, see the pg_search (ParadeDB) extension; for codes like `INV-20931`, `pg_trgm` similarity (matching by shared letter groups) helps.",
        "**[[Hybrid search]]** runs both searches and merges the two ranked lists. You can’t just add their scores, because they’re on different scales. [[Reciprocal rank fusion]] (RRF) uses only *positions*: each chunk gets `1 / (k + rank)` from each list, and the scores are summed. `k` is a constant (60 is common) that stops the very top spots dominating. A chunk ranked well in *both* lists rises to the top.",
        "**Reranking: retrieve wide, rerank narrow.** Both searches are fast but rough. A [[reranker]] is a slower, more accurate model that reads the question and each candidate *together* and scores how well the chunk answers it. So: take the top 50 from hybrid search (raise `hnsw.ef_search` so the vector side can really return 50), rerank them, and send only the best 5 to the LLM. You pay some extra time for much better ordering.",
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
            { text: "The scores use different scales, so one would swamp the other", why: "Right. RRF avoids this by using positions instead of raw scores." },
            { text: "Keyword search only returns matches, with no score attached to them", why: "It does score them (e.g. ts_rank or BM25). The scores just mean something different." },
            { text: "You can; RRF is just adding the raw scores and sorting by the total", why: "RRF adds 1/(k + rank) values, not the raw scores." },
            { text: "Adding scores double-counts chunks that appear in both lists", why: "Rewarding chunks found by both is the point. The problem is the scales." },
          ],
          answer: 0,
          explain: "Ranks are comparable across methods; raw scores aren’t.",
        },
        {
          id: "m8-s4-2", kind: "choice",
          prompt: "With RRF (k = 60): chunk A is rank 1 in vector search and missing from keyword results. Chunk B is rank 3 in both. Which ranks higher?",
          options: [
            { text: "B: 1/63 + 1/63 ≈ 0.0317, beating A’s 1/61 ≈ 0.0164", why: "Yes. Appearing in both lists beats one top spot." },
            { text: "A: one rank-1 spot outscores two rank-3 spots", why: "A only scores from one list: 0.0164 versus B’s 0.0317." },
            { text: "They tie: k = 60 makes ranks 1 and 3 almost equal", why: "Each spot is close in value, but B collects points from two lists, so it’s nearly double." },
            { text: "A: B is penalised for not leading either list", why: "RRF has no penalties. It just sums 1/(k + rank) from each list." },
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
            { text: "75% (30 of 40 questions)", why: "Right: 30 ÷ 40." },
            { text: "15% (30 of 200 result slots)", why: "Hit rate counts questions, not every result slot." },
            { text: "25% (10 misses out of 40)", why: "That’s the miss rate, the opposite of hit rate." },
            { text: "Can’t say without the MRR", why: "Hit rate stands on its own." },
          ],
          answer: 0,
          explain: "Hit rate@k = questions with at least one right chunk in the top k ÷ all questions.",
        },
        {
          id: "m8-s5-2", kind: "choice",
          prompt: "A bot answered wrongly. The log shows the correct chunk was ranked 14th, and only the top 5 go to the model. What kind of failure is it?",
          options: [
            { text: "Retrieval/ranking: try hybrid search, reranking or a larger k", why: "Yes. The evidence exists but didn’t make the cut." },
            { text: "Generation: tell the prompt to use the passages more carefully", why: "The model never saw the right chunk, so the prompt isn’t the cause." },
            { text: "Ingestion: the document needs re-chunking and re-embedding first", why: "It was found at rank 14, so it is indexed. Re-ingesting won’t move it up by itself." },
            { text: "Model: a stronger LLM would pick the right fact out of the top 5", why: "A stronger model can’t use a chunk it never received." },
          ],
          answer: 0,
          explain: "Indexed? Retrieved within k? Used correctly? Answer these in order.",
        },
        {
          id: "m8-s5-3", kind: "choice",
          prompt: "Why include questions your documents **can’t** answer in the eval set?",
          options: [
            { text: "To check it says it doesn’t know instead of using irrelevant chunks", why: "Right. Search always returns something, so you need to test this case." },
            { text: "To see how the embedding model ranks chunks for questions with odd wording", why: "That’s what edge-case questions are for. Unanswerable ones test whether the bot abstains." },
            { text: "To lower the hit rate so the scores reflect a realistic worst case", why: "They have no right chunk, so they’re scored on abstaining, not on hit rate." },
            { text: "To train the reranker on examples that have no right answer", why: "Eval sets measure; they don’t train anything." },
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
        "**Permissions before retrieval.** Client A must never see Client B’s documents, and an intern mustn’t see HR files. Filter by [[tenant]] and [[ACL]] inside the search query, using the logged-in user’s identity from your server, never a value from the model or the request body. Don’t retrieve everything and tell the LLM to “ignore documents the user can’t see”: once text is in the prompt, it can leak. Also treat retrieved text as **data, not instructions**: a document saying “ignore your rules” must not change behaviour (the Security module).",
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
            { text: "The new version was added without removing the old version’s chunks", why: "Right. Replace a document’s chunks; don’t just add more." },
            { text: "The temperature is too high, so the model picks between figures at random", why: "The inconsistency comes from two conflicting chunks. At temperature 0 the model would still see both." },
            { text: "The embedding model changed, so the new chunks rank inconsistently", why: "Ranking quirks can’t produce a 14-day figure that’s no longer in the policy." },
            { text: "The model still remembers 14 days from earlier conversations", why: "The model is stateless. The old figure must be coming from the index." },
          ],
          answer: 0,
          explain: "Re-indexing = delete old chunks and insert new ones together, keyed by a stable document ID.",
        },
        {
          id: "m8-s6-2", kind: "choice",
          prompt: "A developer retrieves chunks from all clients and adds “Only use documents for tenant acme” to the prompt. What’s wrong?",
          options: [
            { text: "Other clients’ text is in the prompt and can leak; filter in the query", why: "Yes. Permissions belong in code, before retrieval, not in a request to the model." },
            { text: "Nothing, provided the rule is in the system prompt, not the user message", why: "A prompt is not a lock, wherever it sits. One mistake or manipulation leaks another client’s data." },
            { text: "It wastes tokens; a reranker should drop other tenants’ chunks first", why: "A reranker scores relevance, not permissions. The filter belongs in the query." },
            { text: "It’s fine if the model is told to cite only acme’s chunk IDs", why: "Citations don’t stop the model quoting other clients’ text." },
          ],
          answer: 0,
          explain: "The model can’t leak what it never sees.",
        },
        {
          id: "m8-s6-3", kind: "choice",
          prompt: "The model’s answer cites chunk `faq#c99`, but that chunk wasn’t in the retrieved set. What should your code do?",
          options: [
            { text: "Treat the citation as invented, and flag or reject the answer", why: "Right. A citation to something it never saw is made up." },
            { text: "Look up faq#c99 in the index and show it to the user as the source", why: "That shows a source the answer wasn’t actually based on." },
            { text: "Remove that one citation and send the rest of the answer as is", why: "The answer may be unsupported. Don’t hide the warning sign." },
            { text: "Accept it, since the model may remember faq#c99 from earlier calls", why: "The model is stateless; it only saw this call’s retrieved chunks." },
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
        { text: "RAG: index them, retrieve relevant chunks, answer with citations", why: "Yes. Changes only require re-indexing, and answers can cite sources." },
        { text: "Fine-tune a model on all 500 documents so it learns their content", why: "Monthly changes would mean retraining each time, it can’t cite sources, and it still guesses details." },
        { text: "Paste all 500 documents into a model with a very large context window", why: "Too long, too expensive per question, and accuracy drops in huge prompts." },
        { text: "Use the model’s general knowledge, with a prompt to be accurate", why: "It has never seen these internal documents. “Be accurate” can’t supply missing facts." },
      ],
      answer: 0,
      explain: "RAG keeps knowledge in your index, where it’s easy to update and cite.",
    },
    {
      id: "m8-q2", kind: "choice",
      prompt: "A user asks “How do I cancel my plan?”. The help article says “To end your subscription, go to Billing.” Which search is most likely to find it?",
      options: [
        { text: "Semantic search, because the meaning matches though the words don’t", why: "Yes. “Cancel my plan” and “end your subscription” mean the same thing." },
        { text: "Keyword search on “cancel” and “plan”, the key words in the question", why: "Neither word appears in the article." },
        { text: "Keyword search with stemming, so “cancel” also matches “cancelled”", why: "Stemming handles word forms, not synonyms. “End” and “subscription” still don’t match." },
        { text: "Searching article titles only, since titles state the task clearly", why: "The title may not use those words either, and it’s still word matching." },
      ],
      answer: 0,
      explain: "Semantic search handles paraphrase; keyword search handles exact terms.",
    },
    {
      id: "m8-q3", kind: "choice",
      prompt: "What’s missing from this search query in a system shared by many clients?",
      code: "select chunk_id, content\nfrom chunks\norder by embedding <=> $1\nlimit 5;",
      options: [
        { text: "A `where tenant_id = …` filter, so only this client is searched", why: "Right. Without it, any client can retrieve another client’s documents." },
        { text: "A `desc` on the order by, so the most similar chunks come out first", why: "`<=>` is a distance, so smallest first is already correct." },
        { text: "A larger limit, so enough chunks remain after filtering in n8n", why: "Filtering after retrieval is the problem itself. The filter belongs in the query." },
        { text: "An index hint, so Postgres uses HNSW rather than a full scan", why: "Postgres chooses the index itself. Speed isn’t the risk here; data separation is." },
      ],
      answer: 0,
      explain: "Tenant and permission filters go inside the retrieval query.",
    },
    {
      id: "m8-q4", kind: "choice",
      prompt: "Your chunks are 5,000 words each. Answers are vague and each request is expensive. What’s the likely fix?",
      options: [
        { text: "Smaller chunks split on headings and paragraphs, then re-test", why: "Yes. Huge chunks give vague vectors and bloated prompts." },
        { text: "Retrieve fewer chunks per question, keeping the same chunk size", why: "That trims cost a little, but each chunk is still a vague 5,000-word blur." },
        { text: "A reranker, so only the most relevant big chunks reach the model", why: "Reranking re-orders chunks; each one is still huge and vague." },
        { text: "More chunk overlap, so each chunk keeps more of its context", why: "Overlap makes chunks bigger, not more focused." },
      ],
      answer: 0,
      explain: "Chunk size is a trade-off you tune against an eval set.",
    },
    {
      id: "m8-q5", kind: "choice",
      prompt: "Searches for product code `BX-220-A` keep returning other products. What would most likely help?",
      options: [
        { text: "Add keyword search and merge it with vector search (hybrid)", why: "Yes. Keyword search matches exact codes." },
        { text: "Switch to a bigger embedding model that handles codes better", why: "Exact codes stay a weak spot for embeddings of any size." },
        { text: "Add more chunk overlap so the code appears in more chunks", why: "More copies don’t help embeddings tell near-identical codes apart." },
        { text: "Embed the questions with a different model tuned for short queries", why: "Questions and documents must use the same embedding model, or the vectors can’t be compared." },
      ],
      answer: 0,
      explain: "Hybrid search = semantic meaning + lexical exactness.",
    },
    {
      id: "m8-q6", kind: "choice",
      prompt: "What does a reranker do in a RAG pipeline?",
      options: [
        { text: "Reads the question with each candidate chunk and re-orders them", why: "Right. It’s slower but more accurate, so it runs on a short list." },
        { text: "Re-embeds the top results with a bigger model and re-sorts them", why: "A reranker reads question and chunk together; it doesn’t make new embeddings." },
        { text: "Merges the vector and keyword result lists into a single ranking", why: "That’s reciprocal rank fusion, the step before reranking." },
        { text: "Removes chunks the user isn’t allowed to see before the LLM call", why: "Permissions belong in the search query. A reranker scores relevance." },
      ],
      answer: 0,
      explain: "Retrieve wide (fast search), rerank narrow (accurate model).",
    },
    {
      id: "m8-q7", kind: "choice",
      prompt: "One question has 4 relevant chunks. Your top 5 results contain 3 of them. What’s Recall@5 for that question?",
      options: [
        { text: "75% (3 of 4 relevant chunks)", why: "Right: 3 of the 4 relevant chunks were found." },
        { text: "60% (3 of the 5 results returned)", why: "That’s 3 out of 5 results, which is precision, not recall." },
        { text: "100% (a relevant chunk was found)", why: "That’s a hit. Recall counts all the relevant chunks, and one was missed." },
        { text: "25% (1 of 4 relevant chunks missed)", why: "That’s the share missed, not the share found." },
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
        { text: "That it doesn’t have enough information to answer the question", why: "Yes. An honest “insufficient evidence” beats a confident guess." },
        { text: "Its best guess from general knowledge, clearly labelled as a guess", why: "That’s still the hallucination RAG is meant to prevent, and users ignore labels." },
        { text: "An answer from the closest chunks, since search found the nearest match", why: "Nearest isn’t relevant. That produces misleading answers." },
        { text: "A request to rephrase the question, then the same search again", why: "Rephrasing can’t find what isn’t in the documents. Say clearly it isn’t available." },
      ],
      answer: 0,
      explain: "Abstaining correctly is part of quality, and you can test it in your eval set.",
    },
    {
      id: "m8-q10", kind: "choice",
      prompt: "An old pricing PDF was deleted from Google Drive last month, but the bot still quotes it. What was missed?",
      options: [
        { text: "Deleting the document’s chunks when the source file was deleted", why: "Right. Deletions must flow through to the vector store." },
        { text: "Re-running ingestion so the latest Drive files are embedded again", why: "Re-ingesting current files doesn’t remove chunks of a file that no longer exists." },
        { text: "Checking content hashes so unchanged documents are skipped", why: "Hashes skip unchanged files; they don’t notice deletions on their own." },
        { text: "Adding a reranker so newer pricing chunks rank above old ones", why: "The stale chunk is still retrievable and may still rank highly." },
      ],
      answer: 0,
      explain: "Ingestion must handle create, update and delete, not just create.",
    },
    {
      id: "m8-q11", kind: "choice",
      prompt: "You switch to a new embedding model. What else must you do?",
      options: [
        { text: "Re-embed every chunk with the new model, then re-run your eval set", why: "Yes. Old and new vectors aren’t comparable, and quality must be re-checked." },
        { text: "Only embed new documents with it; old vectors stay valid as they are", why: "Then old and new vectors sit on different “maps” and can’t be compared." },
        { text: "Rebuild the HNSW index so it maps old vectors into the new space", why: "An index can’t convert vectors between models. Only re-embedding can." },
        { text: "Keep both models and embed each question with whichever is newer", why: "Old chunks would then be compared with question vectors from a different model." },
      ],
      answer: 0,
      explain: "Store the model name with each vector so you know when a re-index is needed.",
    },
    {
      id: "m8-q12", kind: "choice",
      prompt: "Your team wants to prove hybrid search plus a reranker is worth the extra time. What’s the convincing evidence?",
      options: [
        { text: "Hit rate, recall and timing for each setup on one labelled set", why: "Right. Same questions, measured side by side, including latency." },
        { text: "A side-by-side demo on ten tricky questions the team picked by hand", why: "Hand-picked examples aren’t representative evidence." },
        { text: "The reranker vendor’s published benchmark scores on public datasets", why: "Their data isn’t your data." },
        { text: "A week of user thumbs-up ratings before and after the change", why: "Useful but noisy, and it can’t show which stage helped or what latency it cost." },
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
