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