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
