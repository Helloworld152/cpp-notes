# C++

## 多线程

### memory order

`memory_order` 这个是 C++11 里原子操作（`std::atomic`）的一个关键参数，用来告诉编译器和 CPU：**我希望这个原子操作在多线程里的内存可见性和执行顺序是怎样的**。

#### 根本原因
一句话总结：CPU 太快，内存太慢，硬件为了掩盖这个速度差，制造了“私有小金库”。

1. 速度鸿沟： CPU 执行一条指令只需 0.3ns，但完成一次跨核心的缓存同步（MESI）需要 10~100ns。如果不优化，CPU 99% 的时间都在傻等。

2. 私有缓冲区 (The Culprits)： 为了不等待，硬件引入了两个破坏全局一致性的部件：

	* Store Buffer (写缓冲)： 生产者把要写的数据先扔在这里，不一定要立刻刷入 L1 Cache。（这是导致乱序的主犯）

	* Invalidate Queue (失效队列)： 消费者把收到的“缓存失效通知”先堆在这里，不一定立刻处理。

3. 结果： 数据停留在这些私有的、对其他核心不可见的缓冲区中。导致“代码执行完了（在私有视角），但数据还没生效（在全局视角）”。

#### 举例
场景：Producer 线程 P，Consumer 线程 C
初始状态： buffer 是空的，head 是 0。

1. P 执行写数据 (buffer[0] = X)：

	* P 的 CPU 发出写指令。

	* 因为这行缓存不在 P 手里（或处于 Shared 状态），P 必须向总线发消息要锁。

	* 为了不等待，P 把数据 X 扔进了自己的 Store Buffer。

	* 此时全局视角：内存里的 buffer[0] 依然是旧值/垃圾。

2. P 执行写信号 (head = 1)：

	* P 的 CPU 发出写指令。

	* 巧了，head 变量刚好在 P 的 L1 Cache 里且是独占（Modified）状态。

	* P 直接把 L1 Cache 里的 head 改成了 1。

	* 此时全局视角：head 已经是 1 了。

3. C 执行读信号 (load head)：

	* C 想读 head。通过缓存一致性协议，C 从 P 的 Cache 里同步到了最新的 head = 1。

	* C 认为： “哈！head 变了，说明 buffer[0] 肯定准备好了！”

4. C 执行读数据 (load buffer[0])：

	* C 去读 buffer[0]。

	* 关键点： P 的 Store Buffer 对 C 是不可见的。

	* C 读到了内存（或自己 Cache）里那个旧的、未被覆盖的垃圾值。

	* （几纳秒后）P 的 Store Buffer 刷新：

	* P 终于拿到了总线锁，把 Store Buffer 里的 X 刷入 L1 Cache。

	* 太晚了，C 已经拿着脏数据去跑策略了。

#### 具体顺序
* `memory_order_relaxed`：松散序 
	
	硬件行为：对 Store Buffer 和 Invalidate Queue “放任不管”。

* `memory_order_consume`：

* `memory_order_acquire`：获取序
	
	硬件行为：给 Invalidate Queue 下达“清空指令” (Flush Invalidate Queue)。即强制确认所有cache作废消息都处理完再读数据
	```cpp
	size_t head = head_.load(std::memory_order_acquire);
	```

* `memory_order_release`：释放序

	硬件行为：给 Store Buffer 下达“排空指令” (Drain Store Buffer)。即强制确认所有store buffer写入cache后再改信号
	```cpp
	buffer_[head & mask_] = value; // A. 写数据
	head_.store(head + 1, std::memory_order_release); // B. 改信号
	```

* `memory_order_acq_rel`

* `memory_order_seq_cst`：顺序一致性

	强制 Store Buffer 里的东西立刻、马上全部刷出去。
	
	强制 Invalidate Queue 里的东西立刻、马上全部处理完。

## CPU缓存和缓存一致性

### 缓存层次（Cache Hierarchy）

| 层级  | 容量         | 速度  | 特点              |
| --- | ---------- | --- | --------------- |
| L1  | 32KB左右     | 最快  | 每个核心独立，分指令/数据缓存 |
| L2  | 256KB-1MB  | 中速  | 每个核心独立          |
| L3  | 几 MB-几十 MB | 慢   | 多核心共享，主存访问缓冲    |

### 缓存行（Cache Line）

- 最小缓存单位，通常 **64 字节**

- CPU 一次性读取整行到缓存

- 高频访问变量在同一缓存行 → 可能发生 **伪共享（False Sharing）**

### alignas

指定变量或类型的对齐方式

### AoS vs SoA

- **AoS (Array of Structures)**：每个对象的所有字段连续

- **SoA (Structure of Arrays)**：同一字段的所有对象连续

```cpp
// AoS
struct Tick { double price; int volume; };
std::vector<Tick> ticks;

// SoA
std::vector<double> prices;
std::vector<int> volumes;
```

### 

## CMake

```cmake
set(CMAKE_EXPORT_COMPILE_COMMANDS ON) # 生成compile_commands.json
```

## explicit

主要用于 **构造函数**（有时也用于转换操作符），防止 **隐式类型转换**，避免一些容易被忽略的编程错误

```cpp
#include <iostream>
class MyClass {
public:
    explicit MyClass(int x) { std::cout << "x = " << x << std::endl; }
};

int main() {
    // MyClass a = 10; // ❌ 编译错误，禁止隐式转换
    MyClass b(10);      // ✅ 正确，显式调用构造函数
    return 0;
}
```