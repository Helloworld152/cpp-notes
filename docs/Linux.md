# Linux系统

## 进程间通信——共享内存

| **机制**                            | **特点**                     | **速度**                               | **适用场景**           |
| --------------------------------- | -------------------------- | ------------------------------------ | ------------------ |
| **共享内存 ($\text{Shared Memory}$)** | **零拷贝**。通过页表映射，直接访问同一物理内存。 | **最快 ($\star\star\star\star\star$)** | 大数据量交换、频繁通信、高性能计算。 |

### Linux共享内存的两种标准

| **特征**              | **System V 共享内存**                                                                          | **POSIX 共享内存**                                        |
| ------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| **底层标识**            | **整数键 ($\text{Key}$ $\text{ID}$)**。通过 `ftok()` 函数将路径和项目 $\text{ID}$ 转换为唯一的整数 $\text{key}$。 | **路径名 ($\text{Pathname}$)**。使用类似文件路径的字符串作为标识符。        |
| **核心 $\text{API}$** | `shmget()`, `shmat()`, `shmdt()`, `shmctl()`                                               | `shm_open()`, `ftruncate()`, `mmap()`, `shm_unlink()` |
| **内核可见性**           | 以 $\text{IPC}$ $\text{ID}$ 形式存在于内核中。                                                       | 在 `/dev/shm` 目录下可见，表现为文件。                             |
| **文件系统集成**          | **无**。不依赖任何文件系统。                                                                           | **有**。与文件系统集成，使用 `mmap` 进行映射。                         |
| **生命周期**            | 必须显式使用 `shmctl(IPC_RMID)` 销毁，否则**系统重启前会一直存在**。                                             | 只要调用了 `shm_unlink()` 或系统重启，即销毁。                       |
| **标准**              | 较老、较复杂。                                                                                    | 较新、更简洁、与文件操作更一致。                                      |

```cpp
#include <iostream>
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>
#include <cstring>

int main() {
    const char* shm_name = "/my_shm";  // 共享内存名字
    const size_t SIZE = 4096;          // 共享内存大小

    // 1. 创建共享内存对象
    int shm_fd = shm_open(shm_name, O_CREAT | O_RDWR, 0666);
    if (shm_fd == -1) {
        perror("shm_open");
        return 1;
    }

    // 2. 设置共享内存大小
    if (ftruncate(shm_fd, SIZE) == -1) {
        perror("ftruncate");
        return 1;
    }

    // 3. 映射到当前进程地址空间
    void* ptr = mmap(nullptr, SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, shm_fd, 0);
    if (ptr == MAP_FAILED) {
        perror("mmap");
        return 1;
    }

    // 4. 写入数据
    const char* message = "Hello from process 1!";
    std::strncpy(static_cast<char*>(ptr), message, SIZE);

    std::cout << "Data written to shared memory: " << message << std::endl;

    // 5. 等待用户查看（可在另一个进程读取）
    std::cout << "Press Enter to exit and remove shared memory...";
    std::cin.get();

    // 6. 解除映射
    if (munmap(ptr, SIZE) == -1) {
        perror("munmap");
    }

    // 7. 关闭文件描述符
    close(shm_fd);

    // 8. 删除共享内存对象
    if (shm_unlink(shm_name) == -1) {
        perror("shm_unlink");
    }

    return 0;
}
```

## 进程间通信——管道

### 管道（$\text{Pipe}$）的底层原理

管道是一种**半双工（单向）的进程间通信机制，它使用内核缓冲区**作为中转站，连接两个进程的标准输出和标准输入。

在 $\text{Linux}$ 中，管道分为两种：**匿名管道**和**命名管道**。

#### 1. 匿名管道（$\text{Pipe}$）

匿名管道是我们在 Shell 命令中最常使用的管道，它有以下特点：

- **创建与生命周期：** 仅存在于内核内存中，没有文件名。通常通过 `pipe()` 系统调用创建，并且只能用于**具有亲缘关系**的进程之间（如父子进程）。一旦所有连接到管道的进程都结束，管道即被销毁。

- **底层结构：**
  
  1. **内核缓冲区：** 管道的核心是一个由内核维护的**环形缓冲区**（通常大小为 $4\text{KB}$ 或 $64\text{KB}$）。
  
  2. **文件描述符：** 创建管道会返回两个文件描述符 ($\text{FD}$)：
     
     - **写入端 ($\text{FD}[1]$):** 进程向此 $\text{FD}$ 写入数据。
     
     - **读取端 ($\text{FD}[0]$):** 进程从 $\text{FD}$ 读取数据。
  
  3. **单向性：** 管道的数据流只能从写入端流向读取端。

- **数据流控制：**
  
  - 如果写入端写满了缓冲区，写入进程会被**阻塞**，直到读取进程取走数据。
  
  - 如果读取端缓冲区为空，读取进程会被**阻塞**，直到写入进程写入新数据。

#### 2. 命名管道（$\text{FIFO}$）

- **创建与标识：** 通过 `mkfifo` 命令或系统调用创建，它在文件系统中有对应的文件名（例如 `/tmp/my_fifo`）。

- **特点：**
  
  - **打破亲缘限制：** 允许**任意两个不相关的进程**通过文件路径进行通信。
  
  - **伪文件：** 它在文件系统中以文件的形式存在，但数据并不落地到磁盘，依然存在于内核缓冲区，遵循 $\text{FIFO}$ (First In, First Out) 规则。

---

### 命令中的管道应用（管道符 `|`）

在 $\text{Linux}$ 命令行中，管道符 `|` 是对**匿名管道**最直观的应用。

#### 1. 作用机制

当你在 $\text{Shell}$ 中输入 `命令A | 命令B` 时，$\text{Shell}$ 会执行以下底层操作：

1. **创建匿名管道：** $\text{Shell}$ 调用 `pipe()` 创建一个匿名管道，拿到读写两个文件描述符。

2. **创建进程：** $\text{Shell}$ 为 $\text{命令A}$ 和 $\text{命令B}$ 各自创建一个子进程。

3. **重定向 ($\text{Redirection}$)：**
   
   - **命令A：** 关闭其标准输出 ($\text{stdout}$, $\text{FD 1}$)，并将**管道的写入端 ($\text{FD}[1]$)** 复制到 $\text{FD 1}$ 上。
   
   - **命令B：** 关闭其标准输入 ($\text{stdin}$, $\text{FD 0}$)，并将**管道的读取端 ($\text{FD}[0]$)** 复制到 $\text{FD 0}$ 上。

4. **执行：** $\text{命令A}$ 执行时，其所有输出都会被写入管道的内核缓冲区；$\text{命令B}$ 执行时，它的输入不再来自键盘，而是来自管道的读取端。

#### 2. 经典应用示例

管道的价值在于将多个简单、独立的程序串联起来，实现复杂的数据处理流程。

##### 示例一：查找特定进程并杀死

```bash
ps -ef | grep firefox | awk '{print $2}' | xargs kill
```

- **`ps -ef`：** 列出所有进程的详细信息（$\text{stdout}$）。

- **`| grep firefox`：** 接收上一步的输出，筛选出包含 "firefox" 关键字的行（$\text{stdin}$）。

- **`| awk '{print $2}'`：** 接收上一步的输出，$\text{awk}$ 是一个强大的文本处理工具，这里用于提取每行的第二列（即进程 $\text{PID}$）。

- **`| xargs kill`：** 接收 $\text{PID}$ 列表（$\text{stdin}$），并将其作为参数传递给 `kill` 命令，终止这些进程。

##### 示例二：统计日志文件中特定 IP 的访问次数

```bash
cat access.log | awk '{print $1}' | sort | uniq -c | sort -nr | head -10
```

- **`cat access.log`：** 输出日志文件内容。

- **`| awk '{print $1}'`:** 提取每行（通常是 $\text{IP}$ 地址）的第一列。

- **`| sort`：** 对 $\text{IP}$ 列表进行排序（`uniq` 的前提）。

- **`| uniq -c`：** 计算相邻行（相同的 $\text{IP}$）出现的次数。

- **`| sort -nr`：** 再次排序，`-n` 按数字，`-r` 倒序（次数最多的在前）。

- **`| head -10`：** 只显示排名前 $10$ 的 $\text{IP}$。

## websocket服务器重启相关问题

#### **问题背景**

- 操作：使用 `pkill -9` 强制杀掉 WebSocket 服务器进程。

- 现象：5 秒后尝试重启服务时，端口提示“被占用”。

- 目标：理解原因、涉及的 TCP/操作系统机制，以及如何避免问题。

---

#### **1. 杀进程方式对端口的影响**

##### **1.1 SIGKILL (-9)**

- **行为**：
  
  - 强制杀掉进程，**无法捕获**，程序不能执行任何清理逻辑。

- **后果**：
  
  - socket 文件描述符由内核回收，但 TCP 连接未发送 FIN，连接状态未正常结束。
  
  - 已存在 WebSocket 连接直接被切断。
  
  - 对应端口可能短时间被占用，出现 `TIME_WAIT` 或 `CLOSE_WAIT` 状态。

##### **1.2 SIGTERM (-15)**

- **行为**：
  
  - 可被程序捕获，允许执行清理逻辑。

- **优点**：
  
  - 停止 acceptor，不接收新连接。
  
  - 关闭已有 WebSocket 会话，发送 FIN 给客户端。
  
  - 程序资源清理完成后退出，端口释放更干净。

**结论**：频繁使用 `-9` 强杀进程可能导致端口暂时不可用，尤其是在高并发或连接多的情况下。

---

#### **2. TCP 状态与端口占用**

##### **2.1 TIME_WAIT**

- **概念**：TCP 协议规定，主动关闭方在发送 FIN 后，会进入 `TIME_WAIT` 状态，等待 2 × MSL（通常 60~120 秒）以确保最后 ACK 被对方收到。

- **表现**：端口短时间仍显示被占用。

- **查看方法**：
  
  ```bash
  ss -tnlp | grep <端口>
  netstat -anp | grep <端口>
  ```

##### **2.2 CLOSE_WAIT**

- **概念**：被动关闭方收到 FIN 后，等待应用层关闭 socket。

- **表现**：如果进程被强杀，可能遗留 `CLOSE_WAIT`，端口也显示占用。

---

#### **3. SO_REUSEADDR 的作用**

- 允许在 `TIME_WAIT` 状态下重新绑定端口。

- 对 WebSocket 服务端安全，可减少短时间端口占用导致的启动失败。

- **注意**：
  
  - 不能替代优雅关闭逻辑。
  
  - 对 `CLOSE_WAIT` 状态端口无效。

---

#### **4. WebSocket 服务端优雅关闭顺序（Boost.Asio 示例）**

1. **停止 acceptor**
   
   - 防止新连接进入。

```cpp
if (acceptor_.is_open()) acceptor_.close();
```

2. **关闭所有 WebSocket 会话**
   
   - 发送关闭帧给客户端。
   
   - 清理会话容器。

```cpp
for (auto& pair : sessions_) pair.second->close();
sessions_.clear();
```

3. **停止 IO 上下文**
   
   - 异步操作可能返回 `operation_canceled`，属于正常。

```cpp
ioc_.stop();
```

4. **等待服务器线程退出**
   
   ```cpp
   if (server_thread_.joinable()) server_thread_.join();
   ```

> 正确顺序可以避免 `Operation canceled` 日志和端口占用问题。

---

#### **5. 总结与实践建议**

1. **信号选择**：
   
   - 优先使用 `SIGTERM` 做优雅退出，避免端口被占用。
   
   - `SIGKILL` 仅在无法正常退出时使用，可能导致 `TIME_WAIT`/`CLOSE_WAIT`。

2. **端口管理**：
   
   - 使用 `SO_REUSEADDR` 可以降低 `TIME_WAIT` 导致的端口不可用问题。
   
   - 避免短时间内重复强杀启动服务器。

3. **观察工具**：
   
   - `ss -tnlp` / `netstat -anp` / `lsof -i:<port>`，查看端口状态和占用进程。

4. **WebSocket 关闭顺序**：
   
   - 停止 acceptor → 关闭会话 → 停止 IO → 等待线程退出。

5. **问题出现的原因**：
   
   - 近期才出现可能因为：
     
     - 连接数量增多
     
     - 网络延迟加大
     
     - 程序关闭流程稍慢
   
   - 之前成功可能是因为系统 TCP 回收快或负载低。
