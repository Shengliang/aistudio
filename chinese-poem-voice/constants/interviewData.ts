
export interface TopicCategory {
  category: string;
  icon: 'code' | 'system' | 'behavior' | 'cloud' | 'algo' | 'ai';
  topics: string[];
}

export const INTERVIEW_TOPICS: TopicCategory[] = [
  {
    category: "AI & LLM Engineering",
    icon: 'ai',
    topics: [
      "Transformer Architecture (Attention Mechanism)",
      "LLM Training Pipeline (Pre-training vs SFT)",
      "Distributed Training (Data/Model/Pipeline Parallelism)",
      "Inference Optimization (KV Cache, PagedAttention)",
      "Fine-tuning Techniques (LoRA, QLoRA, PEFT)",
      "Model Quantization (INT8, FP4, AWQ)",
      "RAG (Retrieval Augmented Generation) Architecture",
      "RLHF (Reinforcement Learning from Human Feedback)",
      "Deployment at Scale (vLLM, TGI, Triton)",
      "AI Agent Design Patterns (ReAct, Plan-and-Solve)",
      "Vector Database Internals for AI"
    ]
  },
  {
    category: "Coding Patterns (Algo)",
    icon: 'algo',
    topics: [
      "Sliding Window Pattern",
      "Two Pointers Technique",
      "Fast & Slow Pointers (Cycle Detection)",
      "Merge Intervals Pattern",
      "Cyclic Sort Pattern",
      "In-place Reversal of LinkedList",
      "Tree Breadth First Search (BFS)",
      "Tree Depth First Search (DFS)",
      "Two Heaps Pattern",
      "Top 'K' Elements",
      "Modified Binary Search",
      "Dynamic Programming: 0/1 Knapsack"
    ]
  },
  {
    category: "Modern C++ & Concurrency",
    icon: 'code',
    topics: [
      "C++ Memory Model & Atomic Ordering",
      "C++17: Parallel Algorithms (std::execution)",
      "C++17: std::shared_mutex & scoped_lock",
      "C++20: Coroutines (co_await) Internals",
      "C++20: std::jthread & Auto-joining",
      "C++20: Semaphores, Latches & Barriers",
      "C++20: Atomic wait/notify & std::atomic_ref",
      "C++23: std::expected & Monadic Ops",
      "C++26: Hazard Pointers (RCU) & Reflection",
      "Lock-free Programming (CAS Loop)",
      "False Sharing & Cache Locality"
    ]
  },
  {
    category: "System Design (High Level)",
    icon: 'system',
    topics: [
      "Design a URL Shortener (TinyURL)",
      "Design Instagram (News Feed)",
      "Design a Rate Limiter",
      "Design a Key-Value Store (Dynamo)",
      "Design a Chat System (WhatsApp)",
      "Design YouTube (Video Streaming)",
      "Design a Web Crawler",
      "Design Uber (Location Service)",
      "Design Google Drive (File Storage)",
      "Design a Notification Service"
    ]
  },
  {
    category: "System Design Concepts",
    icon: 'cloud',
    topics: [
      "CAP Theorem & PACELC",
      "Consistent Hashing",
      "Load Balancing Algorithms",
      "Caching Strategies (Write-through/back)",
      "Database Sharding & Partitioning",
      "Leader-Follower Replication",
      "Microservices vs Monolith",
      "Message Queues (Kafka/RabbitMQ)",
      "CDN & Edge Computing"
    ]
  },
  {
    category: "Behavioral (STAR Method)",
    icon: 'behavior',
    topics: [
      "Tell me about a time you failed",
      "Conflict with a coworker",
      "Handling a tight deadline",
      "Disagreement with Manager",
      "Leading a team through ambiguity",
      "Technical Debt vs New Features",
      "Mentoring a junior engineer",
      "Proudest Technical Achievement"
    ]
  },
  {
    category: "Language Specifics",
    icon: 'code',
    topics: [
      "Java Memory Model & GC",
      "Python GIL (Global Interpreter Lock)",
      "Go Goroutines & Channels",
      "JavaScript Event Loop",
      "Rust Ownership & Borrowing"
    ]
  }
];