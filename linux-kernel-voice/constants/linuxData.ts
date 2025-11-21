
export interface TopicCategory {
  category: string;
  icon: 'cpu' | 'memory' | 'disk' | 'network' | 'security' | 'dist' | 'rtos' | 'vm' | 'container';
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
    category: "Real-Time OS (RTOS)",
    icon: 'rtos',
    topics: [
      "FreeRTOS Scheduler (Preemptive vs Co-op)",
      "Zephyr Kernel Architecture",
      "Context Switching on Cortex-M (PendSV)",
      "Priority Inversion & Inheritance",
      "Task Notifications vs Queues",
      "Zephyr Device Tree & Driver Model"
    ]
  },
  {
    category: "Virtualization & Hypervisors",
    icon: 'vm',
    topics: [
      "KVM (Kernel-based Virtual Machine) Internals",
      "QEMU/KVM ioctl Interaction",
      "Virtio Drivers & Ring Buffers",
      "Intel VT-x / EPT Implementation",
      "SR-IOV (Single Root I/O Virtualization)",
      "Type 1 vs Type 2 Hypervisors"
    ]
  },
  {
    category: "Containers & Kubernetes",
    icon: 'container',
    topics: [
      "Linux Namespaces (mnt, pid, net)",
      "Container Runtimes (runc vs containerd)",
      "Kubernetes Scheduler Logic",
      "etcd Consistency (Raft Protocol)",
      "K8s Networking (CNI & Overlay Networks)",
      "Service Mesh Sidecar Proxies"
    ]
  }
];
