# C++

## 多线程

### memory order

`memory_order` 这个是 C++11 里原子操作（`std::atomic`）的一个关键参数，用来告诉编译器和 CPU：**我希望这个原子操作在多线程里的内存可见性和执行顺序是怎样的**。

* `memory_order_relaxed`

* `memory_order_consume`

* `memory_order_acquire`

* `memory_order_release`

* `memory_order_acq_rel`

* `memory_order_seq_cst`

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