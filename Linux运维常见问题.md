# Linux运维常见问题

### cron-定时拉起任务

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

![](C:\Users\ruanying\AppData\Roaming\marktext\images\2025-09-25-09-01-52-image.png)


