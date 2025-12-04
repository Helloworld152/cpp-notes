# C++ 高频交易 (HFT) 低延迟系统优化白皮书

**High-Frequency Trading System Optimization Guide**

**版本**：1.0
**适用场景**：微秒级/纳秒级低延迟交易系统、做市商系统、实时风控系统
**核心目标**：极致的延迟（Low Latency）、确定的响应（Determinism）、零抖动（Zero Jitter）

-----

## 0\. 核心设计哲学 (Core Philosophy)

在 HFT 领域，性能优化的本质是对抗不确定性。

1.  **Kernel Bypass (绕过内核)**：操作系统是通用的，而我们需要专用的。不仅是网络，包括调度和内存管理，都要接管。
2.  **Zero Copy (零拷贝)**：数据在硬件和内存之间，以及线程之间，永远只做必要的移动。
3.  **Lock-free & Wait-free (无锁与零等待)**：任何系统调用或锁竞争导致的挂起（Sleep）都是不可接受的。
4.  **Cache Friendly (缓存友好)**：CPU 就像鲨鱼，必须一直游动（计算）。一旦停下来等内存（Cache Miss），性能就会雪崩。

-----

## 1\. 基础设施与操作系统调优 (Infra & OS Tuning)

*目标：打造一个无干扰的真空环境。*

### 1.1 BIOS 硬件设置

| 设置项 | 推荐值 | 原理 |
| :--- | :--- | :--- |
| **C-States** | **Disabled** | 禁止 CPU 进入省电睡眠模式，避免唤醒耗时（10-100us）。 |
| **Turbo Boost** | **Disabled** | 禁用睿频，锁定 CPU 主频，避免频率切换带来的时钟抖动。 |
| **Hyper-Threading** | **Disabled** | (通常) 禁用超线程，避免逻辑核争抢 L1/L2 缓存。 |
| **Power Profile** | **Performance** | 强制最高性能模式。 |

### 1.2 Linux 内核启动参数 (Boot Parameters)

修改 GRUB 配置，隔离核心并优化内存。

  * `isolcpus=4-15`: 将 Core 4-15 从 OS 调度器中移除，OS 不会主动分配任务给它们。
  * `nohz_full=4-15`: 在这些核上启用 **Tickless Mode**，只要核上只有一个任务，就停止时钟中断。
  * `rcu_nocbs=4-15`: 将 RCU 回调移出这些核。
  * `default_hugepagesz=1G hugepagesz=1G hugepages=16`: 预分配 1GB 大页内存。

### 1.3 运行时控制

  * **中断亲和性 (IRQ Affinity)**: 停止 `irqbalance` 服务。手动将网卡硬中断绑定到特定的负责收包的核心（通常是与处理核共享 L3 的核）。
  * **线程绑定 (Thread Pinning)**: 使用 `pthread_setaffinity_np` 将关键线程严格绑定到隔离的核上，确保 L1/L2 Cache 热度。

-----

## 2\. 网络 I/O 架构 (Network I/O Architecture)

*目标：消除上下文切换，直接通过总线访问网卡。*

### 2.1 Kernel Bypass 技术

放弃标准 Socket API (`socket`, `recv`, `epoll`)，采用用户态驱动。

  * **技术选型**:
      * **Solarflare OpenOnload**: 透明加速，依然使用 Socket API，但底层旁路。
      * **Solarflare EF\_VI / DPDK**: **极致选择**。直接操作网卡 DMA 环形缓冲区 (RX/TX Ring)。
  * **实现逻辑**:
      * **Memory Map**: 网卡 DMA 区域直接映射到用户态虚拟地址。
      * **Polling (轮询)**: 替代中断机制。程序死循环检查 DMA 描述符状态。

### 2.2 用户态协议栈 (Userspace Networking)

由于绕过了内核，必须手动处理协议。

  * **以太网/IP**: 过滤 MAC 地址，校验 IP Checksum（或依赖网卡卸载）。
  * **TCP**: 自行维护 Sequence Number, Ack Number 和重传逻辑。
  * **ARP**: 手动实现 ARP 表，定期发送 ARP Request 维护网关 MAC 地址。
  * **行情处理**: 实现 A/B 双路行情合并（Arbitration），基于 SeqNum 丢弃重复包，发现丢包立即切换线路。

-----

## 3\. 并发与通信模型 (Concurrency & IPC)

*目标：流水线化作业，消除锁竞争。*

### 3.1 核心模式：SPSC + Shared Memory

**Single Producer Single Consumer** 是 HFT 的黄金标准。

  * **架构**: Core A (行情) -\> Ring Buffer -\> Core B (策略) -\> Ring Buffer -\> Core C (执行)。
  * **无锁设计**:
      * 利用 C++ `std::atomic` 的 `load/store` 配合内存序。
      * **绝不使用** `std::mutex`, `std::condition_variable`, `sem_wait`。
      * **绝不使用** `CAS` (`Compare-And-Swap`) 指令（在 SPSC 模型下），只用单纯的写操作。

### 3.2 忙等待与指令暂停

消费者线程绝不挂起。

```cpp
while (ring_buffer.isEmpty()) {
    _mm_pause(); // Intel Intrinsic: 暂停流水线，节能并防止推测执行带来的惩罚
}
```

-----

## 4\. 内存管理与数据布局 (Memory & Data Layout)

*目标：优化 Cache Line 利用率，减少 TLB Miss。*

### 4.1 内存分配策略

  * **No Heap Allocation**: 交易时段禁止 `new`/`malloc`。
  * **Arena Allocator**: 启动时预分配一大块连续内存（如 `std::vector::reserve`）。
  * **Object Pool**: 使用空闲链表（Free List）复用固定大小对象（Order, Trade）。

### 4.2 缓存友好布局 (Cache Friendliness)

  * **False Sharing (伪共享) 规避**:
      * 对于多线程共享的变量（如 RingBuffer 的 `head` 和 `tail`），强制 64 字节对齐。
    <!-- end list -->
    ```cpp
    alignas(64) std::atomic<size_t> head;
    char padding[64 - sizeof(head)]; // 物理隔离
    ```
  * **SoA (Struct of Arrays)**: 适合 SIMD 计算的数据布局。
  * **Hot/Cold Splitting**: 将高频访问字段（Price, Qty）和低频字段（Timestamp, ID）拆分到不同结构体，提高 Cache Line 有效载荷。

### 4.3 虚拟内存魔法

  * **Huge Pages (大页)**: 使用 1GB/2MB 大页，将 TLB Miss 概率降至接近零。
  * **Magic Ring Buffer (虚拟内存镜像)**:
      * 使用 `mmap` 将同一块物理内存映射到两段连续的虚拟地址空间。
      * 效果：数组越界自动回绕，消除 `index % size` 逻辑，消除分段 `memcpy`。

-----

## 5\. 代码微观优化 (Micro-Optimization)

*目标：指令级并行 (ILP) 与流水线效率。*

### 5.1 编译期计算

  * 使用 `constexpr` 和 `consteval` 将计算前移至编译期（如查找表生成）。
  * 使用 **Template Metaprogramming (TMP)** 展开循环。

### 5.2 分支预测 (Branch Prediction)

  * **Hint**: 使用 C++20 `[[likely]]` / `[[unlikely]]` 指导代码布局。
  * **Branchless**: 使用位运算或三元运算符 (`cond ? a : b` -\> `CMOV` 指令) 替代 `if-else`，消除分支跳转代价。

### 5.3 多态与内联

  * **禁用 `virtual`**: 避免虚表查找（Pointer Chasing）和无法内联。
  * **CRTP (Curiously Recurring Template Pattern)**: 使用模板实现静态多态，强制内联。

### 5.4 数学运算

  * **SIMD**: 使用 AVX2/AVX-512 Intrinsics (`_mm256_add_ps`) 并行处理数据。
  * **位运算优化**: 环形队列容量设为 2 的幂，用 `& (size-1)` 代替 `% size`（除法指令极慢）。

-----

## 附录：核心组件实现范式

### A. SPSC 无锁队列核心 (C++17)

```cpp
template <typename T, size_t Capacity> 
class SPSCRing {
    // 确保 Capacity 是 2 的幂
    static_assert((Capacity & (Capacity - 1)) == 0, "Capacity must be power of 2");
    
    alignas(64) std::atomic<size_t> head_ {0}; // Producer write
    char pad1_[64 - sizeof(size_t)];           // Padding
    
    alignas(64) std::atomic<size_t> tail_ {0}; // Consumer write
    char pad2_[64 - sizeof(size_t)];           // Padding
    
    T buffer_[Capacity]; // 连续内存数组

public:
    bool push(const T& val) {
        size_t head = head_.load(std::memory_order_relaxed);
        size_t tail = tail_.load(std::memory_order_acquire); // Sync with consumer
        
        if (head - tail >= Capacity) return false; // Full
        
        buffer_[head & (Capacity - 1)] = val; // Bitwise AND instead of Modulo
        head_.store(head + 1, std::memory_order_release); // Commit
        return true;
    }

    bool pop(T& val) {
        size_t tail = tail_.load(std::memory_order_relaxed);
        size_t head = head_.load(std::memory_order_acquire); // Sync with producer
        
        if (tail == head) return false; // Empty
        
        val = buffer_[tail & (Capacity - 1)];
        tail_.store(tail + 1, std::memory_order_release); // Commit
        return true;
    }
};
```

### B. 纳秒级计时器 (RDTSCP)

```cpp
inline uint64_t get_cycles() {
    unsigned int lo, hi;
    // rdtscp 保证序列化，防止 CPU 乱序执行影响计时
    asm volatile ("rdtscp" : "=a" (lo), "=d" (hi) :: "%rcx"); 
    return ((uint64_t)hi << 32) | lo;
}
```

-----

这份文档涵盖了从底层硬件配置到上层代码实现的完整优化链路。你可以根据这个框架，逐一检查你的系统是否已经压榨到了物理极限。