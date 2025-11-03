# Linux运维常见问题

## cron-定时拉起任务

```bash
# 每天凌晨 2 点执行
0 2 * * * /path/to/script.sh

# 每 5 分钟执行一次
*/5 * * * * /path/to/script.sh

# 每周一到周五早上 9 点执行
0 9 * * 1-5 /path/to/script.sh

# 每月 1 日和 15 日中午 12 点执行
0 12 1,15 * * /path/to/script.sh

# 每天 6:55 到 16:00 运行（用 start/stop 方式控制）
55 6 * * 1-5 /path/to/start.sh
0 16 * * 1-5 /path/to/stop.sh
```

```bash
crontab -e      # 编辑当前用户的 cron
crontab -l      # 查看当前用户的 cron
crontab -r      # 删除当前用户的所有 cron
```

### 查看cron日志

```bash
# Ubuntu/Debian
grep CRON /var/log/syslog | tail -n 20

# CentOS/RHEL
grep CRON /var/log/cron | tail -n 20
```

### 问题

需要注意cron遵循的时区

```bash
(base) zszq@zszq:/data/nano/dailyfactor$ timedatectl
               Local time: Mon 2025-09-29 08:43:29 CST
           Universal time: Mon 2025-09-29 00:43:29 UTC
                 RTC time: Mon 2025-09-29 00:43:33    
                Time zone: Asia/Shanghai (CST, +0800) 
System clock synchronized: no                         
              NTP service: active                     
          RTC in local TZ: no   
```

如果时区已经改成中国时区，但是cron依然是按美国时区运行，则可能是修改时区后没有重启cron服务

```bash
systemctl status cron

sudo service cron restart       # Ubuntu/Debian
```

### cron定时启动脚本报错：找不到可执行文件

#### **一、问题现象**

在命令行手动执行脚本：

```bash
/home/rying/qatradegateway/qactpmdgateway/run_multi_1.sh
```

可以正常启动程序；  
但用 cron 定时执行时，日志中报错：

```
./bin/market_data_server: not found
```

或程序无法启动。

---

#### **二、问题原因**

1. **工作目录不同**  
   cron 执行任务时默认工作目录不是脚本所在路径（通常是 `/`），  
   所以脚本中的相对路径（如 `./bin/...`）会找不到。

2. **环境变量缺失**  
   cron 运行环境不会加载用户的 `~/.bashrc` 或 `~/.profile`，  
   因此 `PATH`、`LD_LIBRARY_PATH` 等变量可能为空，导致依赖库或可执行文件找不到。

3. **执行环境不完整**  
   一些命令在交互式 shell 可用，但在 cron 环境下不可用（例如通过别名、软链接、相对路径调用）。

---

#### **三、解决方案**

**方案1：在脚本开头显式切换目录**

```bash
cd /home/rying/qatradegateway/qactpmdgateway || exit 1
```

使用绝对路径运行程序：

```bash
/home/rying/qatradegateway/qactpmdgateway/bin/market_data_server ...
```

---

**方案3：使用绝对路径调用 Bash 与命令**  
在 crontab 中写完整路径：

```
* * * * * /bin/bash /home/rying/qatradegateway/qactpmdgateway/run_multi_1.sh
```

## 后台运行程序

```bash
nohup python your_script.py > log.txt 2>&1 &
```

- `nohup`：忽略挂起信号，关掉终端程序也继续跑。

- `> log.txt 2>&1`：把标准输出和错误输出都写到 log.txt 里。

- `&`：放到后台运行

### 重定向运算符

```bash
# >:覆盖写入
# >>:追加写入
# > /dev/null:丢弃标准输出
```

## 部署mongdb

你想把 MongoDB 变成 **Linux 服务（systemd 管理）**，这样开机自动启动、可以随时 `start/stop/restart`，在 WSL 里也可以这么做（WSL2 需要开启 systemd 支持）。我给你一个最简单的例子。

---

### 1. 创建 systemd 服务文件

假设 MongoDB 安装在 `~/mongodb-linux-x86_64-ubuntu2404-8.2.1/bin`，数据目录是 `~/mongo_data`：

```bash
sudo nano /etc/systemd/system/mongod.service
```

内容如下：

```ini
[Unit]
Description=MongoDB Database Server
After=network.target

[Service]
Type=forking
ExecStart=/home/ruanying/mongodb-linux-x86_64-ubuntu2404-8.2.1/bin/mongod --dbpath /home/ruanying/mongo_data --logpath /home/ruanying/mongo_data/mongod.log --fork
ExecStop=/home/ruanying/mongodb-linux-x86_64-ubuntu2404-8.2.1/bin/mongod --shutdown --dbpath /home/ruanying/mongo_data
Restart=always
User=ruanying
Group=ruanying

[Install]
WantedBy=multi-user.target
```

关键点：

- `--fork`：让 `mongod` 后台运行

- `--logpath`：写日志

- `User` 和 `Group`：使用你的用户启动，不用 sudo

---

### 2. 重新加载 systemd 并启动

```bash
sudo systemctl daemon-reload
sudo systemctl enable mongod   # 开机自启
sudo systemctl start mongod    # 启动服务
```

---

### 3. 查看状态

```bash
sudo systemctl status mongod
```

你应该能看到 `active (running)`，说明 MongoDB 已经在后台运行了。

---

### 4. 管理服务命令

- 停止：`sudo systemctl stop mongod`

- 重启：`sudo systemctl restart mongod`

- 查看日志：`journalctl -u mongod -f`

---

## 监控进程脚本

```shell
#!/bin/bash

# 配置部分
LOG=/home/rying/process_monitor.log
CHECK_INTERVAL=60    # 检查间隔秒数
PROCESSES=("market_data_server" "open-trade-mdservice" "/usr/local/bin/open-trade-gateway")  # 要监控的进程名
SHM_SEGMENTS=("InsMapSharedMemory" "qamddata")                                # 要监控的共享内存段
PORTS=("7788" "7799")                                                         # 要监控的端口

CURRENT_PID=$$
OLD_PIDS=$(pgrep -f "monitor_process.sh" | grep -v "^$CURRENT_PID$")
if [ -n "$OLD_PIDS" ]; then
    for PID in $OLD_PIDS; do
        kill "$PID" 2>/dev/null
    done
fi

echo "======== $(date) 监控启动 ========" >> $LOG

while true; do
    for PROC in "${PROCESSES[@]}"; do
        PID=$(pgrep -f "$PROC")
        if [ -n "$PID" ]; then
            if [ "$PROC" == "market_data_server" ]; then
                THREAD_COUNT=$(ps -o nlwp= -p $PID)
                echo "$(date '+%F %T') [PROC] ✅ $PROC PID:$PID 运行中, 线程数: $THREAD_COUNT" >> $LOG
            else
                echo "$(date '+%F %T') [PROC] ✅ $PROC PID:$PID 运行中" >> $LOG
            fi
        else
            echo "$(date '+%F %T') [PROC] ❌ $PROC 未运行..." >> $LOG
        fi
    done

    for SEG in "${SHM_SEGMENTS[@]}"; do
        if [ -e "/dev/shm/$SEG" ]; then
            SIZE=$(stat --format="%s" "/dev/shm/$SEG" 2>/dev/null)
            echo "$(date '+%F %T') [SHM] ✅ $SEG 存在, 大小: $SIZE" >> $LOG
        else
            echo "$(date '+%F %T') [SHM] ❌ $SEG 缺失..." >> $LOG
        fi
    done

    for PORT in "${PORTS[@]}"; do
        if ss -ltn | grep -q ":$PORT "; then
            echo "$(date '+%F %T') [PORT] ✅ 端口 $PORT 正在监听" >> $LOG
        else
            echo "$(date '+%F %T') [PORT] ❌ 端口 $PORT 未监听..." >> $LOG
        fi
    done

    sleep $CHECK_INTERVAL
done
```

## auditd审计工具使用

- 安装启动：`sudo apt install auditd` `sudo systemctl enable --now auditd`

- 添加规则：`sudo auditctl -w /dev/shm/InsMapSharedMemory -p wa -k insmap`（-w 路径，-p 操作权限，-k 过滤标签）。

- 如需多文件重复添加即可；也可用 -F 指定进程或用户过滤。

- 查看事件：`sudo ausearch -k insmap` 搜索关键字；`sudo aureport -f -i 汇总文件操作`；日志原文在 /var/log/audit/audit.log。

- 删除规则：`sudo auditctl -W /dev/shm/InsMapSharedMemory`（或重启 auditd 清空临时规则）。

借此可定位删除共享内存的具体进程/用户。

## logrotate

这是一个关于 **Logrotate** 的精华总结，专为 Quant IT 运维场景提炼。

`logrotate` 是 Linux 系统自带的日志管理神器，它通过 **Cron（定时任务）** 每天唤醒一次，负责将旧日志切割、压缩、归档并清理。

-----

### 1\. 标准配置模板

最佳实践是**不要**修改主配置文件 `/etc/logrotate.conf`，而是在 `/etc/logrotate.d/` 目录下为每个服务单独新建配置文件。

**文件路径：** `/etc/logrotate.d/your-service-name`

```nginx
# 目标日志文件的绝对路径（支持通配符 *.log）
/var/log/myapp/trading.log {
    # --- 触发条件 ---
    daily                   # 按天切割 (可选: weekly, monthly)
    # size 100M             # 或者按大小切割 (优先级高于时间)

    # --- 保留策略 ---
    rotate 30               # 保留最近 30 个备份
    missingok               # 日志文件不存在也不报错
    notifempty              # 如果日志是空的，就不切割

    # --- 压缩策略 ---
    compress                # 启用 gzip 压缩
    delaycompress           # 延后一天压缩（防止切割瞬间程序还在写）
    dateext                 # 使用日期作为后缀 (如 .log-20251124)

    # --- 关键模式 (二选一) ---
    # 模式 A: copytruncate (推荐：简单粗暴)
    # 适用于：程序无法感知日志切割，一直往一个文件句柄里写的情况
    copytruncate            

    # 模式 B: create + postrotate (传统：需程序配合)
    # 适用于：Nginx/Apache 等支持信号重载的程序
    # create 0644 user group
    # postrotate
    #     kill -HUP `cat /var/run/myapp.pid`
    # endscript

    # --- 权限安全 ---
    # 如果目录权限不是 755/root，必须指定用户
    su user group
}
```

-----

### 2\. 核心参数速查表

| 参数 | 含义 | 备注 |
| :--- | :--- | :--- |
| **copytruncate** | **复制并清空** | **最重要参数**。先把内容拷走，瞬间把原文件大小截断为 0。适合大多数 C++/Python/Java 自研程序。 |
| **rotate N** | 保留 N 份 | 超过 N 份的最旧日志会被删除。 |
| **dateext** | 日期后缀 | 默认是 `.1`, `.2` 数字后缀，加上这个变成 `-YYYYMMDD`，更利于归档管理。 |
| **compress** | 压缩 | 默认用 gzip，节省磁盘空间。 |
| **su user group** | 切换身份 | **解决权限报错**。如果日志目录对其他组可写，必须加上这个，否则 logrotate 拒绝执行。 |

-----

### 3\. 常用命令（运维三板斧）

配置好后，不需要重启任何服务，只需使用以下命令：

1.  **演习（Dry Run）：** 检查语法，看它打算做什么，但不实际执行。

    ```bash
    sudo logrotate -d /etc/logrotate.d/your-config
    ```

2.  **强制执行（Force Run）：** 即使没到时间/大小，也强制切割一次（用于验证效果）。

    ```bash
    sudo logrotate -f /etc/logrotate.d/your-config
    ```

3.  **查看状态：** 查看上次切割是什么时候。

    ```bash
    cat /var/lib/logrotate/status
    ```

-----

### 4\. 常见坑与避雷指南 ⚠️

  * **语法严格：** 行尾**严禁**出现多余空格或中文注释（刚才你遇到的坑）。
  * **权限地狱：** 如果日志目录权限比较开放（如 775），必须配置 `su <owner> <group>`，否则会报 `insecure permissions`。
  * **Crontab 依赖：** Logrotate 不是守护进程。如果你的机器（或 Docker 容器）没有运行 Cron 服务，Logrotate 永远不会自动触发。
  * **Copytruncate 的副作用：** 在"复制"和"截断"之间的极短毫秒内写入的日志**可能会丢失**。对于高频交易（HFT）系统，这丢失的几行日志可能是致命的。
      * *Quant 建议：* 极其重要的交易日志，建议由程序内部控制切割（如使用 `spdlog` 或 `glog`），或者接受这极小概率的丢失。

-----

**下一步建议：**
既然配置已经跑通，建议你明天早上检查一下 `/var/log/open-trade-gateway/` 目录下是否自动生成了带日期后缀的压缩包，确认 Cron 任务正常工作。

## 部署redis
```bash
sudo apt update
sudo apt install redis-server -y
sudo systemctl enable redis-server  # 设置开机自启
sudo systemctl start redis-server   # 启动服务
```
### 配置
文件路径：`/etc/redis/redis.conf`

如果需要允许远程连接，bind应设置为 0.0.0.0 或特定的内网 IP；
