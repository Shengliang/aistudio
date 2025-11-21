
export interface TopicCategory {
  category: string;
  icon: 'cpu' | 'memory' | 'disk' | 'network' | 'security' | 'dist';
  topics: string[];
}

export const LINUX_TOPICS: TopicCategory[] = [
  {
    category: "Process Scheduling (SCHED)",
    icon: 'cpu',
    topics: [
      "struct task_struct Internals",
      "CFS (Completely Fair Scheduler) Logic",
      "Runqueues & Load Balancing",
      "Context Switching (switch_to)",
      "Real-time Scheduling Classes (RT/DL)",
      "cgroups v2 Resource Control"
    ]
  },
  {
    category: "Memory Management (MM)",
    icon: 'memory',
    topics: [
      "Virtual Memory Areas (VMA)",
      "Page Tables (PGD/P4D/PUD/PMD/PTE)",
      "SLUB Allocator Internals",
      "Page Reclaim & LRU Lists",
      "Transparent Huge Pages (THP)",
      "OOM Killer Mechanics"
    ]
  },
  {
    category: "Kernel Synchronization",
    icon: 'security',
    topics: [
      "RCU (Read-Copy-Update) Implementation",
      "Spinlocks vs Mutexes vs Semaphores",
      "Memory Barriers & Atomics",
      "Per-CPU Variables",
      "Lockdep Validator"
    ]
  },
  {
    category: "Networking Stack (NET)",
    icon: 'network',
    topics: [
      "struct sk_buff Architecture",
      "NAPI & Interrupt Coalescing",
      "Netfilter Hooks & iptables",
      "eBPF & XDP (Express Data Path)",
      "TCP State Machine (tcp_input.c)"
    ]
  },
  {
    category: "Virtual File System (VFS)",
    icon: 'disk',
    topics: [
      "dentry & inode Caches",
      "Superblock Operations",
      "Bio Structure & Block Layer",
      "Page Cache & Writeback",
      "OverlayFS Architecture"
    ]
  },
  {
    category: "Interrupts & Drivers",
    icon: 'dist',
    topics: [
      "Top Halves vs Bottom Halves",
      "Tasklets & Softirqs",
      "Workqueues (cmwq)",
      "Device Tree (DTS) Parsing",
      "DMA Mapping API"
    ]
  }
];
