# Linux

## 常用命令

### find

```bash
find . -name "filename" # 在当前目录及子目录查找文件
```

## 共享内存

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
