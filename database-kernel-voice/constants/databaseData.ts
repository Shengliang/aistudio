
export interface TopicCategory {
  category: string;
  icon: 'mysql' | 'postgres' | 'cloud' | 'rocksdb' | 'redis' | 'gpu';
  topics: string[];
}

export const DATABASE_TOPICS: TopicCategory[] = [
  {
    category: "MySQL 8.0 Internals",
    icon: 'mysql',
    topics: [
      "InnoDB Buffer Pool Architecture",
      "Redo Log & Mini-Transactions (MTR)",
      "Undo Log & MVCC Implementation",
      "B+ Tree Index Structure (page0page.cc)",
      "Doublewrite Buffer Mechanism",
      "Adaptive Hash Index",
      "MySQL Thread Handling (one-thread-per-connection)",
      "Query Optimizer & Cost Model",
      "Replication: Binlog Formats",
      "Group Replication (Paxos)",
      "Performance Schema Internals"
    ]
  },
  {
    category: "PostgreSQL Internals",
    icon: 'postgres',
    topics: [
      "Process Architecture (Postmaster)",
      "Shared Buffers & Clock Sweep",
      "WAL (Write-Ahead Logging) Architecture",
      "Heap Tuples & TOAST",
      "MVCC & Visibility Maps",
      "Vacuum & Autovacuum Logic",
      "Query Planner & Genetic Optimizer",
      "GiST & GIN Index Internals",
      "Logical Decoding & Replication slots",
      "Parallel Query Execution"
    ]
  },
  {
    category: "MyRocks & Storage Engines",
    icon: 'rocksdb',
    topics: [
      "LSM-Tree (Log Structured Merge) Fundamentals",
      "RocksDB MemTable & Skiplists",
      "SSTable File Formats",
      "Bloom Filters in Storage",
      "Compaction Strategies (Leveled vs Tiered)",
      "MyRocks Transaction Handling (2PC)",
      "Write Stalls & Flow Control",
      "Column Family Architecture"
    ]
  },
  {
    category: "Redis & In-Memory DB",
    icon: 'redis',
    topics: [
      "Redis Event Loop (ae.c)",
      "Simple Dynamic Strings (SDS)",
      "Redis Dictionary & Rehashing (dict.c)",
      "Skiplist Implementation (zset)",
      "RDB vs AOF Persistence Internals",
      "Redis Cluster Gossip Protocol",
      "Redis 6.0 Threaded I/O",
      "Key Eviction Policies (LRU/LFU)"
    ]
  },
  {
    category: "GPU & Vector Databases",
    icon: 'gpu',
    topics: [
      "GPU-Accelerated Query Compilation (JIT)",
      "Vector Indexing Algorithms (HNSW, IVF)",
      "SIMD & Vectorization (AVX-512)",
      "CUDA Kernel Optimization for Join/Group By",
      "Memory Coalescing & PCIe Bandwidth",
      "Columnar Storage on GPU (Apache Arrow)",
      "Similarity Search & Embeddings"
    ]
  },
  {
    category: "Distributed Database Theory",
    icon: 'cloud',
    topics: [
      "CAP Theorem in Practice",
      "Raft Consensus Algorithm",
      "Google Spanner (TrueTime)",
      "CockroachDB Architecture",
      "Distributed Transactions (2PC/3PC)",
      "Sharding Strategies",
      "Consistent Hashing",
      "Vector Clocks & Version Vectors"
    ]
  }
];