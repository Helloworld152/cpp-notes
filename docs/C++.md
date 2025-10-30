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


