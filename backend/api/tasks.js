// 引入express框架，用来创建路由
const express=require('express');
// 创建一个路由对象
// 路由对象就像一个小型的app，专门处理特定类型的请求
const router=express.Router();
// 引入数据库连接
// 注意：.. 表示返回上一级目录（从api文件夹回到backend文件夹）
const db=require('../database');
// 处理 GET 请求，路径为 /api/tasks
// 注意这里写的是 '/'，但实际上完整路径是 /api/tasks，因为在server.js中我们已经设置了前缀
router.get('/',(req,res) => {
    // 打印日志，方便调试
    console.log('收到获取所有任务的请求');
    // SQL查询语句：从tasks表中选取所有字段，按创建时间倒序排列
    // DESC 表示降序（最新的在前面）
    const sql='SELECT * FROM tasks ORDER BY created_at DESC';
    // db.all() 用于查询多条记录
    // 参数1: SQL语句
    // 参数2: 参数数组（这里没有参数，所以是空数组[]）
    // 参数3: 回调函数，当查询完成时调用
    db.all(sql,[],(err,rows) => {
        // 如果发生错误
        if(err){
            console.error('查询任务失败:',err.message);
            // res.status(500) 设置HTTP状态码为500（服务器内部错误）
            // .json() 返回JSON格式的错误信息
            res.status(500).json({error:err.message});
            return;     // 重要：一定要return，否则代码会继续执行
        }
        // 查询成功，rows 是一个数组，包含了所有任务
        console.log(`成功获取 ${rows.length} 个任务`);
        // 将任务数组以JSON格式发送给客户端
        res.json(rows);
    });
});
// 处理 GET 请求，路径为 /api/tasks/:id
// 比如：/api/tasks/3 会获取ID为3的任务
router.get('/:id',(req,res) => {
    // 从URL参数中获取id
    // req.params 包含所有路由参数
    const id=req.params.id;
    console.log(`收到获取任务 ${id} 的请求`);
    // SQL查询：选取ID等于指定值的任务
    // 使用 ? 作为占位符，防止SQL注入攻击
    const sql='SELECT * FROM tasks WHERE id = ?';
    // db.get() 用于查询单条记录
    // 第二个参数 [id] 是一个数组，包含要替换到 ? 位置的值
    db.get(sql,[id],(err,row) => {
        if(err){
            console.error('查询任务失败:',err.message);
            res.status(500).json({error:err.message});
            return;
        }
        // 如果没有找到对应的任务（row为undefined）
        if(!row){
            console.log(`任务 ${id} 未找到`);
            // 返回404状态码（资源不存在）
            res.status(404).json({error:'任务未找到'});
            return;
        }
        // 找到任务，返回任务对象
        console.log(`成功获取任务:`,row);
        res.json(row);
    });
});
// 处理 POST 请求，路径为 /api/tasks
// 用于创建新任务
router.post('/',(req,res) => {
    console.log('收到创建新任务的请求');
    // req.body 包含客户端发送的JSON数据
    // 例如：{ "text": "学习Node.js", "priority": "high" }
    console.log('请求体内容:',req.body);
    // 从请求体中解构出需要的字段
    // priority = 'medium' 表示如果没提供priority，默认值为'medium'
    const { text,priority='medium'}=req.body;
    // 数据验证：任务内容不能为空
    if(!text){
        console.log('创建失败:任务内容不能为空');
        // 400状态码表示客户端请求错误
        res.status(400).json({error:'任务内容不能为空'});
        return;
    }
    // SQL插入语句
    // 插入text和priority，其他字段（id, completed, created_at）会自动处理
    const sql='INSERT INTO tasks (text,priority) VALUES (?,?)';
    // db.run() 用于执行INSERT、UPDATE、DELETE等操作
    // function(err) 中的 this 包含了操作结果的信息
     db.run(sql,[text,priority],function(err){
        if(err){
            console.error('创建任务失败:',err.message);
            res.status(500).json({error:err.message});
            return;
        }
        // this.lastID 是SQLite自动生成的插入记录的ID
        console.log(`任务创建成功,ID: ${this.lastID}`);
        // 返回201状态码（创建成功）
        // 同时返回创建的任务对象（包含自动生成的ID）
        res.status(201).json({
            id:this.lastID,
            text:text,
            priority:priority,
            completed:0,
            created_at:new Date().toISOString()
        });
     });
}); 
// 处理 PUT 请求，路径为 /api/tasks/:id
// 用于更新现有任务
router.put('/:id',(req,res) =>{
    const id=req.params.id;
    console.log(`收到任务更新 ${id} 的请求`);
    console.log(`更新内容:`,req.body);
    // 从请求体中解构出可能更新的字段
    const {text,priority,completed}=req.body;
    // 动态构建SQL语句
    // 因为客户端可能只更新部分字段
    let fields=[];
    let values=[];
    // 如果提供了text字段，就更新它
    if (text !== undefined) {
        fields.push('text = ?');
        values.push(text);
    }
    // 如果提供了priority字段，就更新它
    if (priority !== undefined) {
        fields.push('priority = ?');
        values.push(priority);
    }
    // 如果提供了completed字段，就更新它
    if (completed !== undefined) {
        // 将布尔值转换为0或1（SQLite存储的是整数）
        fields.push('completed = ?');
        values.push(completed ? 1 : 0);
    }
    // 如果没有要更新的字段，返回错误
    if (fields.length === 0) {
        console.log('更新失败::没有提供要更新的内容');
        res.status(400).json({ error:'没有提供要更新的内容'});
        return;
    }
    // 把ID添加到values数组末尾
    values.push(id);
    // 构建最终的SQL语句
    // fields.join(', ') 将数组转换为字符串，如 "text = ?, priority = ?"
    const sql=`UPDATE tasks SET ${fields.join(', ')} WHERE id=?`;
    console.log('执行的SQL:',sql);
    console.log('参数:',values);
    // 执行更新操作
    db.run(sql, values, function(err) {
        if (err) {
            console.error('更新任务失败:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        // this.changes 表示受影响的行数
        // 如果为0，说明没有找到对应ID的任务
        if (this.changes === 0) {
            console.log(`任务 ${id} 未找到`);
            res.status(404).json({ error: '任务未找到' });
            return;
        }
        console.log(`任务 ${id} 更新成功`);
        // 为了返回更新后的完整任务，再查询一次
        db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
            if (err) {
                // 如果查询失败，至少告诉客户端更新成功了
                res.json({ message: '更新成功，但获取详情失败' });
                return;
            }
            // 返回更新后的任务
            res.json(row);
        });
    });
});
// 处理 DELETE 请求，路径为 /api/tasks/:id
// 用于删除任务
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    console.log(`收到删除任务 ${id} 的请求`);
    // SQL删除语句
    const sql = 'DELETE FROM tasks WHERE id = ?';
    db.run(sql, [id], function(err) {
        if (err) {
            console.error('删除任务失败:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        // 检查是否有记录被删除
        if (this.changes === 0) {
            console.log(`任务 ${id} 未找到`);
            res.status(404).json({ error: '任务未找到' });
            return;
        }
        console.log(`任务 ${id} 删除成功`);
        // 返回成功消息（204 No Content 也可以，但返回JSON更友好）
        res.json({ message: '任务删除成功' });
    });
});
// 导出路由对象，供server.js使用
module.exports = router;