# Linux常见命令

## vim

```bash
/ 正向搜索 
? 反向搜索
set nu 显示行号
G 最后一行
```

## scp

```bash
# 从本地复制文件到远程
scp file.txt user@192.168.1.10:/home/user/

# 从远程复制文件到本地
scp user@192.168.1.10:/home/user/file.txt /local/path/

# 复制整个目录（-r 递归）
scp -r /local/dir user@192.168.1.10:/remote/path/

# 从远程服务器下载整个目录
scp -r user@192.168.1.10:/remote/dir /local/path/

# 指定端口号（-P 大写）
scp -P 2222 file.txt user@192.168.1.10:/home/user/
```

## stat

```bash
# 查看文件详细信息（权限、大小、时间等）
stat file.txt
```
