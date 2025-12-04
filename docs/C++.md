# C++

## 数据处理

### 小数四舍五入

```cpp
// 输出时保留
#include <iomanip>  // std::setprecision
double x = 3.1415926535;
std::cout << std::fixed << std::setprecision(3) << x << std::endl;

// 计算保留
#include <cmath>
double x = 3.1415926535;
double y = std::round(x * 1000) / 1000;  // 四舍五入到3位小数
double z = std::trunc(x * 1000) / 1000;  // 直接截断
```

注：相关函数解释

| 函数         | 说明                 | 示例                               |
| ---------- | ------------------ | -------------------------------- |
| `floor(x)` | 向下取整（取不大于 x 的最大整数） | `floor(2.9)=2`, `floor(-2.1)=-3` |
| `ceil(x)`  | 向上取整（取不小于 x 的最小整数） | `ceil(2.1)=3`, `ceil(-2.1)=-2`   |
| `trunc(x)` | 直接截断小数部分           | `trunc(2.9)=2`, `trunc(-2.9)=-2` |
| `round(x)` | 四舍五入到最近整数          | `round(2.5)=3`, `round(-2.5)=-3` |

## redis-plus-plus

异步redis使用范例

```cpp
bool RedisClient::connect()
{
    std::lock_guard<std::mutex> lock(mutex_);
    ConnectionOptions connection_options;
    connection_options.host = host_;
    connection_options.port = port_;
    connection_options.socket_timeout = std::chrono::milliseconds(3000);

    ConnectionPoolOptions pool_options;
    pool_options.size = 10;

    try {
        async_redis_ = std::make_shared<AsyncRedis>(connection_options, pool_options);

        last_error_.clear();
    } catch (const std::exception& ex) {
        last_error_ = ex.what();
        async_redis_.reset();
        BOOST_LOG_TRIVIAL(error) << "Redis connection error: " << last_error_;
        return false;
    }

    BOOST_LOG_TRIVIAL(info) << "Connected to Redis server " << host_ << ":" << port_;
    return true;
}
```

## 日志库

### spdlog

### boost日志库

## exprtk——数学表达式解析和求值引擎
1. 零开销绑定 (Zero-Overhead Binding): 它直接操作 C++ 变量的内存地址。当 C++ 的行情数据更新时，不需要“传递”数据给 ExprTk，ExprTk 已经在盯着那个内存地址了。

2. 一次编译，无限求值: 解析器（Parser）会将字符串公式编译成高效的字节码（Bytecode）。在 Tick 级回调中，你只需要调用 .value()，开销极小（纳秒级）。

3. 图灵完备: 它不仅仅支持 a + b，还支持 if-else、while、for 循环、函数定义、向量操作。你甚至可以用它写一个完整的策略逻辑。


使用 ExprTk 只需要理解三个核心对象，就像搭积木一样：

### Symbol Table (符号表):

作用： 数据的“注册中心”。

功能： 把 C++ 的变量（double, vector）、常量、函数映射成表达式里的名字（如 "price", "vol"）。

### Expression (表达式对象):

作用： 逻辑的“容器”。

功能： 它持有编译后的字节码，并负责连接符号表。

### Parser (解析器):

作用： “编译器”。

功能： 把字符串（如 "price * 1.05"）编译进 Expression 对象中。