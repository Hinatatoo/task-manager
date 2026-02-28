// ==================== 1. 引入依赖包 ====================
const express = require('express');     // Web框架
const cors = require('cors');           // 跨域支持
const sqlite3 = require('sqlite3');     // 数据库驱动
const path = require('path');           // 路径处理

// ==================== 2. 引入数据库模块 ====================
// 注意：./database 表示当前目录下的database.js文件
const db = require('./database');

// ==================== 3. 创建Express应用 ====================
const app = express();

// ==================== 4. 设置端口 ====================
const PORT = process.env.PORT || 3000;

// ==================== 5. 注册中间件 ====================
app.use(cors());              // 允许跨域请求
app.use(express.json());      // 解析JSON格式的请求体

// ==================== 6. 导入任务路由 ====================
// 注意：./api/tasks 表示api文件夹下的tasks.js文件
const tasksRouter = require('./api/tasks');

// ==================== 7. 注册路由 ====================
// 所有以 /api/tasks 开头的请求，都交给 tasksRouter 处理
// 例如：
//   GET /api/tasks       -> 获取所有任务
//   POST /api/tasks      -> 创建新任务
//   PUT /api/tasks/1     -> 更新ID为1的任务
//   DELETE /api/tasks/1  -> 删除ID为1的任务
app.use('/api/tasks', tasksRouter);

// ==================== 8. 测试路由 ====================
app.get('/', (req, res) => {
    res.send('任务管理器后端服务器运行成功! ^_^');
});

app.get('/about', (req, res) => {
    res.send('这是一个任务管理器API');
});

app.get('/time', (req, res) => {
    res.send(`当前时间是: ${new Date().toLocaleString()}`);
});

app.get('/hello/:name', (req, res) => {
    const name = req.params.name;
    res.send(`你好, ${name}!`);
});

// ==================== 9. 启动服务器 ====================
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`API接口地址: http://localhost:${PORT}/api/tasks`);
});